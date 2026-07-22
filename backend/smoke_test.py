#!/usr/bin/env python3
"""Dependency-free end-to-end smoke test for a deployed PRAHARI environment."""
from __future__ import annotations

import argparse
import base64
import json
import re
import sys
import time
import uuid
from dataclasses import dataclass
from typing import Any, Dict, Iterable, Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urljoin, urlparse
from urllib.request import Request, urlopen


DEMO_USERS = {
    "admin": ("admin123", "supervisor"),
    "inspector": ("inspector123", "investigator"),
    "analyst": ("analyst123", "analyst"),
    "constable": ("constable123", "constable"),
    "demo": ("demo123", "investigator"),
    "citizen1": ("citizen123", "citizen"),
}

# Valid 1x1 PNG used to exercise multipart upload without external files.
TINY_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z2S8AAAAASUVORK5CYII="
)


@dataclass
class Response:
    status: int
    body: bytes
    headers: Any

    def json(self) -> Any:
        try:
            return json.loads(self.body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            preview = self.body[:300].decode("utf-8", errors="replace")
            raise AssertionError(f"Response is not JSON: {preview!r}") from exc


class SmokeTest:
    def __init__(self, base_url: str, frontend_url: Optional[str], timeout: float):
        self.base_url = base_url.rstrip("/")
        self.api_url = f"{self.base_url}/api/v1"
        self.frontend_url = frontend_url
        self.timeout = timeout
        self.passed = 0
        self.failed = 0
        self.tokens: Dict[str, Dict[str, Any]] = {}

    def request(
        self,
        method: str,
        path_or_url: str,
        *,
        token: Optional[str] = None,
        json_body: Optional[Any] = None,
        body: Optional[bytes] = None,
        headers: Optional[Dict[str, str]] = None,
        query: Optional[Dict[str, Any]] = None,
    ) -> Response:
        if path_or_url.startswith(("http://", "https://")):
            url = path_or_url
        elif path_or_url.startswith("/api/") or path_or_url in ("/", "/health"):
            url = f"{self.base_url}{path_or_url}"
        else:
            url = f"{self.api_url}/{path_or_url.lstrip('/')}"

        if query:
            filtered = {key: value for key, value in query.items() if value is not None}
            url = f"{url}?{urlencode(filtered)}"

        request_headers = {"Accept": "application/json", "User-Agent": "PRAHARI-Smoke-Test/1.0"}
        if headers:
            request_headers.update(headers)
        if token:
            request_headers["Authorization"] = f"Bearer {token}"
        if json_body is not None:
            body = json.dumps(json_body).encode("utf-8")
            request_headers["Content-Type"] = "application/json"

        request = Request(url, data=body, headers=request_headers, method=method)
        try:
            with urlopen(request, timeout=self.timeout) as response:
                return Response(response.status, response.read(), response.headers)
        except HTTPError as exc:
            return Response(exc.code, exc.read(), exc.headers)
        except (URLError, TimeoutError, OSError) as exc:
            raise AssertionError(f"Cannot reach {url}: {exc}") from exc

    def check(self, name: str, action) -> Any:
        try:
            result = action()
            self.passed += 1
            print(f"[PASS] {name}")
            return result
        except Exception as exc:  # Keep running so one invocation reports every defect.
            self.failed += 1
            print(f"[FAIL] {name}: {exc}")
            return None

    @staticmethod
    def cors_origin_tokens(response: Response) -> list:
        """All Access-Control-Allow-Origin values a browser would see.

        A browser rejects the request if there is more than one origin value,
        whether that comes from duplicate header lines or a single comma-joined
        header. urllib's .get() hides duplicates, so use get_all and also split
        on commas to surface the real, browser-visible value set.
        """
        raw_values = []
        get_all = getattr(response.headers, "get_all", None)
        if get_all is not None:
            raw_values = get_all("Access-Control-Allow-Origin") or []
        else:
            single = response.headers.get("Access-Control-Allow-Origin")
            if single:
                raw_values = [single]
        tokens = []
        for value in raw_values:
            tokens.extend(token.strip() for token in value.split(",") if token.strip())
        return tokens

    @staticmethod
    def expect_status(response: Response, expected: Iterable[int]) -> None:
        expected_set = set(expected)
        if response.status not in expected_set:
            detail = response.body[:500].decode("utf-8", errors="replace")
            raise AssertionError(f"expected HTTP {sorted(expected_set)}, got {response.status}: {detail}")

    def expect_json(self, response: Response, expected_status: int = 200) -> Any:
        self.expect_status(response, [expected_status])
        return response.json()

    @staticmethod
    def require(condition: bool, message: str) -> None:
        if not condition:
            raise AssertionError(message)

    def auth_headers(self, username: str) -> str:
        token = self.tokens.get(username, {}).get("access_token")
        self.require(bool(token), f"no access token available for {username}")
        return token

    def multipart(self, filename: str, content: bytes, content_type: str) -> Tuple[bytes, str]:
        boundary = f"----PrahariSmoke{uuid.uuid4().hex}"
        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
            f"Content-Type: {content_type}\r\n\r\n"
        ).encode("utf-8") + content + f"\r\n--{boundary}--\r\n".encode("utf-8")
        return body, f"multipart/form-data; boundary={boundary}"

    def upload(self, username: str, filename: str, content: bytes, content_type: str) -> Response:
        body, multipart_type = self.multipart(filename, content, content_type)
        return self.request(
            "POST",
            "deepfake/detect",
            token=self.auth_headers(username),
            body=body,
            headers={"Content-Type": multipart_type},
        )

    def test_public_endpoints(self) -> None:
        def root():
            data = self.expect_json(self.request("GET", "/"))
            self.require(data.get("name") == "PRAHARI", "unexpected application name")
            self.require(data.get("status") == "operational", "backend is not operational")
            return data

        def health():
            data = self.expect_json(self.request("GET", "/health"))
            self.require(data.get("status") == "healthy", "health endpoint is not healthy")
            return data

        def status():
            data = self.expect_json(self.request("GET", "/api/v1/status"))
            self.require(data.get("backend") == "operational", "diagnostic backend status failed")
            self.require(data.get("db_ready") is True, f"database is not ready: {data}")
            self.require(data.get("users", 0) >= 6, "seed users are missing")
            self.require(data.get("firs", 0) >= 220, "seed FIRs are missing")
            self.require(data.get("accused", 0) >= 40, "seed accused records are missing")
            return data

        self.check("Public root endpoint", root)
        self.check("Health endpoint", health)
        self.check("Database diagnostic and seed counts", status)

        def unauthenticated_is_blocked():
            response = self.request("GET", "crime/firs")
            self.require(response.status in (401, 403), f"unauthenticated FIR access returned {response.status}")

        self.check("Protected API rejects unauthenticated access", unauthenticated_is_blocked)

    def test_frontend_and_cors(self) -> None:
        if not self.frontend_url:
            print("[SKIP] Frontend bundle and CORS checks (no --frontend-url supplied)")
            return

        frontend_origin = f"{urlparse(self.frontend_url).scheme}://{urlparse(self.frontend_url).netloc}"

        def frontend_bundle():
            index_response = self.request("GET", self.frontend_url, headers={"Accept": "text/html"})
            self.expect_status(index_response, [200])
            html = index_response.body.decode("utf-8", errors="replace")
            self.require('id="root"' in html or "id='root'" in html, "frontend index is not the PRAHARI Vite app")
            scripts = re.findall(r'<script[^>]+src=["\']([^"\']+)', html, flags=re.IGNORECASE)
            self.require(bool(scripts), "frontend index has no JavaScript bundle")
            script_url = urljoin(self.frontend_url, scripts[-1])
            bundle_response = self.request("GET", script_url, headers={"Accept": "application/javascript"})
            self.expect_status(bundle_response, [200])
            self.require(len(bundle_response.body) > 50_000, "frontend bundle is unexpectedly small/sample content")
            bundle = bundle_response.body.decode("utf-8", errors="ignore")
            self.require("prahari-final-50044229424.development.catalystappsail.in" in bundle, "development backend mapping missing from deployed bundle")
            self.require("prahari-final-50044229424.catalystappsail.in" in bundle, "production backend mapping missing from deployed bundle")

        def cors_preflight():
            response = self.request(
                "OPTIONS",
                "/api/v1/auth/login",
                headers={
                    "Origin": frontend_origin,
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "content-type",
                },
            )
            self.expect_status(response, [200])
            tokens = self.cors_origin_tokens(response)
            self.require(
                len(tokens) == 1,
                f"Access-Control-Allow-Origin must be exactly one value (browsers reject duplicates), got {tokens}",
            )
            self.require(tokens[0] in ("*", frontend_origin), f"CORS origin not allowed: {tokens[0]!r}")
            allowed_methods = response.headers.get("Access-Control-Allow-Methods", "")
            self.require("POST" in allowed_methods or "*" in allowed_methods, "CORS does not allow POST")

        def cors_actual_login():
            # Browsers also enforce a single Allow-Origin on the actual (non-preflight)
            # response, so verify the real login call the same way the browser sees it.
            response = self.request(
                "POST",
                "auth/login",
                headers={"Origin": frontend_origin},
                json_body={"username": "demo", "password": "demo123"},
            )
            self.expect_status(response, [200])
            tokens = self.cors_origin_tokens(response)
            self.require(
                len(tokens) == 1,
                f"login response Access-Control-Allow-Origin must be one value, got {tokens}",
            )
            self.require(tokens[0] in ("*", frontend_origin), f"login CORS origin not allowed: {tokens[0]!r}")

        self.check("Deployed frontend is the full PRAHARI bundle", frontend_bundle)
        self.check("Browser login CORS preflight (single Allow-Origin)", cors_preflight)
        self.check("Browser login actual response CORS", cors_actual_login)

    def test_authentication(self) -> None:
        for username, (password, expected_role) in DEMO_USERS.items():
            def login_and_profile(username=username, password=password, expected_role=expected_role):
                login = self.expect_json(
                    self.request("POST", "auth/login", json_body={"username": username, "password": password})
                )
                self.require(login.get("access_token"), "access token missing")
                self.require(login.get("refresh_token"), "refresh token missing")
                self.require(login.get("user", {}).get("role") == expected_role, "seeded user role mismatch")
                self.tokens[username] = login
                profile = self.expect_json(
                    self.request("GET", "auth/me", token=login["access_token"])
                )
                self.require(profile.get("username") == username, "auth/me returned the wrong user")
                return login

            self.check(f"Login and profile: {username} ({expected_role})", login_and_profile)

        def invalid_password():
            response = self.request("POST", "auth/login", json_body={"username": "demo", "password": "wrong"})
            self.expect_status(response, [401])

        self.check("Invalid password is rejected", invalid_password)

        def refresh():
            old = self.tokens["demo"]
            data = self.expect_json(
                self.request("POST", "auth/refresh", json_body={"refresh_token": old["refresh_token"]})
            )
            self.require(data.get("access_token"), "refreshed access token missing")
            self.require(data.get("refresh_token"), "rotated refresh token missing")
            self.tokens["demo"] = data

        self.check("Refresh-token rotation", refresh)

        def access_token_cannot_refresh():
            response = self.request(
                "POST",
                "auth/refresh",
                json_body={"refresh_token": self.tokens["demo"]["access_token"]},
            )
            self.expect_status(response, [401])

        self.check("Access token cannot be used as refresh token", access_token_cannot_refresh)

        def safe_registration():
            suffix = f"{int(time.time())}_{uuid.uuid4().hex[:6]}"
            data = self.expect_json(
                self.request(
                    "POST",
                    "auth/register",
                    json_body={
                        "username": f"smoke_{suffix}",
                        "email": f"smoke_{suffix}@example.com",
                        "password": "SmokePass123!",
                        "full_name": "Smoke Test Citizen",
                        "role": "supervisor",
                        "station_id": "SHOULD_NOT_BE_ACCEPTED",
                        "badge_number": "SHOULD_NOT_BE_ACCEPTED",
                    },
                )
            )
            self.require(data.get("user", {}).get("role") == "citizen", "public registration can escalate roles")
            self.require(data.get("user", {}).get("station_id") is None, "citizen registration accepted station ID")
            self.require(data.get("user", {}).get("badge_number") is None, "citizen registration accepted badge number")

        self.check("Public registration is forced to safe citizen role", safe_registration)

    def test_police_features(self) -> Tuple[Optional[int], set[int]]:
        token = self.tokens.get("demo", {}).get("access_token", "")
        context: Dict[str, Any] = {}

        def fir_list():
            data = self.expect_json(self.request("GET", "crime/firs", token=token, query={"page": 1, "limit": 100}))
            self.require(data.get("total", 0) >= 220, "investigator cannot see the full seeded FIR set")
            self.require(bool(data.get("firs")), "FIR list is empty")
            context["firs"] = data["firs"]
            return data

        self.check("Investigator FIR listing and pagination", fir_list)

        def fir_filters():
            firs = context.get("firs") or []
            self.require(bool(firs), "FIR fixture unavailable")
            crime_type = firs[0]["crime_type"]
            data = self.expect_json(
                self.request("GET", "crime/firs", token=token, query={"crime_type": crime_type, "search": firs[0]["fir_number"], "limit": 20})
            )
            self.require(data.get("total", 0) >= 1, "FIR filters returned no matching record")

        self.check("FIR search and crime-type filters", fir_filters)

        def fir_detail():
            firs = context.get("firs") or []
            self.require(bool(firs), "FIR fixture unavailable")
            data = self.expect_json(self.request("GET", f"crime/firs/{firs[0]['id']}", token=token))
            self.require(data.get("id") == firs[0]["id"], "FIR detail mismatch")

        self.check("Investigator FIR detail", fir_detail)

        def accused_list():
            data = self.expect_json(self.request("GET", "crime/accused", token=token))
            self.require(len(data) >= 40, "seeded accused list is incomplete")
            self.require(any(item.get("osint_verified") for item in data), "OSINT verification data is missing")
            context["accused"] = data
            return data

        self.check("Accused list and OSINT fields", accused_list)

        def accused_profile():
            accused = context.get("accused") or []
            self.require(bool(accused), "accused fixture unavailable")
            data = self.expect_json(self.request("GET", f"crime/accused/{accused[0]['id']}/profile", token=token))
            self.require(data.get("accused", {}).get("id") == accused[0]["id"], "accused profile mismatch")
            self.require(data.get("risk_breakdown", {}).get("factors"), "risk-score explanation is missing")

        self.check("Accused profile and explainable risk score", accused_profile)

        def network_graph():
            accused = context.get("accused") or []
            self.require(bool(accused), "accused fixture unavailable")
            data = self.expect_json(
                self.request("GET", f"crime/network/{accused[0]['id']}", token=token, query={"depth": 2})
            )
            self.require(bool(data.get("nodes")), "network graph has no nodes")
            self.require("edges" in data and "communities" in data and "key_players" in data, "network graph contract is incomplete")

        self.check("Criminal network graph", network_graph)

        def entity_resolution():
            data = self.expect_json(self.request("GET", "crime/network/entity-resolution/Ravi%20Kumar", token=token))
            self.require(data.get("matches"), "entity resolution found no Ravi Kumar match")
            self.require(data["matches"][0].get("confidence", 0) >= 0.8, "entity resolution confidence is too low")

        self.check("Entity resolution", entity_resolution)

        def dashboard():
            data = self.expect_json(
                self.request("GET", "crime/analytics/dashboard", token=token, query={"days": 365})
            )
            self.require(data.get("total_firs", 0) > 0, "dashboard contains no FIRs")
            for field in ("top_crime_types", "hotspots", "trends", "district_stats"):
                self.require(bool(data.get(field)), f"dashboard field {field} is empty")

        self.check("Analytics dashboard, trends, and district statistics", dashboard)

        def hotspots():
            data = self.expect_json(
                self.request("GET", "crime/analytics/hotspots", token=token, query={"days": 365})
            )
            self.require(bool(data), "hotspot list is empty")
            self.require(all("latitude" in spot and "longitude" in spot for spot in data), "hotspot coordinates missing")

        self.check("Hotspot analytics", hotspots)

        def chat_and_history():
            chat = self.expect_json(
                self.request("POST", "ai/chat", token=token, json_body={"message": "Show criminal network for Ravi Kumar"})
            )
            self.require(chat.get("intent") == "network_analysis", f"incorrect chat intent: {chat.get('intent')}")
            self.require(chat.get("session_id"), "chat session ID missing")
            self.require(chat.get("data", {}).get("nodes"), "network chat response has no grounded graph data")
            lowercase_chat = self.expect_json(
                self.request(
                    "POST",
                    "ai/chat",
                    token=token,
                    json_body={
                        "message": "show criminal network for ravi kumar",
                        "session_id": chat["session_id"],
                    },
                )
            )
            self.require(lowercase_chat.get("intent") == "network_analysis", "lowercase network intent failed")
            self.require(lowercase_chat.get("data", {}).get("nodes"), "lowercase person name was not grounded")
            history = self.expect_json(
                self.request("GET", f"ai/chat/history/{chat['session_id']}", token=token)
            )
            self.require(len(history) == 4, f"expected four chat-history messages, got {len(history)}")

        self.check("AI intent, grounded response, and chat history", chat_and_history)

        def chat_help_and_hinglish():
            # A features/help question must be answered, never dead-ended.
            help_chat = self.expect_json(
                self.request("POST", "ai/chat", token=token, json_body={"message": "what features do you have"})
            )
            self.require(help_chat.get("intent") in ("help", "general"), f"help intent misrouted: {help_chat.get('intent')}")
            self.require("PRAHARI" in (help_chat.get("response") or ""), "help response is not the capability guide")
            self.require(help_chat.get("confidence", 0) >= 0.5, "help confidence too low")
            # Hinglish query must classify correctly, not fall back to general.
            hinglish = self.expect_json(
                self.request("POST", "ai/chat", token=token, json_body={"message": "chori ke case dikhao"})
            )
            self.require(hinglish.get("intent") == "search_firs", f"Hinglish query misrouted: {hinglish.get('intent')}")

        self.check("AI handles help/features and Hinglish queries", chat_help_and_hinglish)

        def chat_kannada():
            # Kannada (native script) must route correctly, not fall back to general.
            kn = self.expect_json(
                self.request("POST", "ai/chat", token=token, json_body={"message": "\u0c95\u0cb3\u0ccd\u0cb3\u0ca4\u0ca8 \u0caa\u0ccd\u0cb0\u0c95\u0cb0\u0ca3 \u0ca4\u0ccb\u0cb0\u0cbf\u0cb8\u0cc1"})
            )
            self.require(kn.get("intent") == "search_firs", f"Kannada query misrouted: {kn.get('intent')}")

        self.check("AI handles Kannada queries", chat_kannada)

        def chat_multiturn_refinement():
            # Start a search, then refine it with a follow-up; context must carry.
            session = f"smoke-mt-{uuid.uuid4().hex[:8]}"
            first = self.expect_json(
                self.request(
                    "POST", "ai/chat", token=token,
                    json_body={"message": "show theft cases in Bangalore", "session_id": session},
                )
            )
            self.require(first.get("intent") == "search_firs", "multi-turn base query misrouted")
            follow = self.expect_json(
                self.request(
                    "POST", "ai/chat", token=token,
                    json_body={"message": "only female victims", "session_id": session},
                )
            )
            # "only female victims" alone classifies as 'general'; multi-turn
            # context must restore the previous search_firs intent.
            self.require(follow.get("intent") == "search_firs", f"multi-turn refinement lost context: {follow.get('intent')}")

        self.check("AI multi-turn context (follow-up refinement)", chat_multiturn_refinement)

        def chat_gender_filter():
            # The gender filter must actually be applied (previously dead code).
            result = self.expect_json(
                self.request("POST", "ai/chat", token=token, json_body={"message": "show cases with female victims"})
            )
            self.require(result.get("intent") == "search_firs", "gender-filtered search misrouted")

        self.check("AI gender filter on victims", chat_gender_filter)

        def deepfake_valid():
            data = self.expect_json(self.upload("demo", "evidence.png", TINY_PNG, "image/png"))
            self.require(data.get("filename") == "evidence.png", "deepfake result filename mismatch")
            self.require(0 <= data.get("confidence", -1) <= 1, "deepfake confidence is out of range")
            self.require(data.get("recommendations"), "deepfake recommendations missing")
            self.require(bool(data.get("analysis_details")), "deepfake analysis details missing")

        self.check("Deepfake valid image upload", deepfake_valid)

        def deepfake_detects_ai_image():
            # A PNG carrying a Stable Diffusion generation signature must be flagged
            # by the real byte-level forensic engine (not random).
            ai_png = (
                b"\x89PNG\r\n\x1a\n\x00\x00\x00\x0dIHDR"
                + (512).to_bytes(4, "big") + (512).to_bytes(4, "big")
                + b"\x08\x06\x00\x00\x00"
                + b"tEXtparameters Stable Diffusion, sampler DPM++ 2M, model v1-5 "
                + b"\x00" * 2048
            )
            data = self.expect_json(self.upload("demo", "generated.png", ai_png, "image/png"))
            self.require(data.get("is_deepfake") is True, "AI-generated image was not flagged as manipulated")
            self.require(data.get("confidence", 0) >= 0.6, "AI-image confidence too low")
            self.require(
                "stable diffusion" in str(data.get("analysis_details", {}).get("ai_generator_signatures", "")).lower(),
                "AI-generation signature was not surfaced",
            )

        self.check("Deepfake real analysis flags AI-generated image", deepfake_detects_ai_image)

        def deepfake_deterministic():
            # Same bytes must always yield the same verdict (auditable, not random).
            first = self.expect_json(self.upload("demo", "same.png", TINY_PNG, "image/png"))
            second = self.expect_json(self.upload("demo", "same.png", TINY_PNG, "image/png"))
            self.require(
                first.get("confidence") == second.get("confidence"),
                "deepfake analysis is not deterministic for identical files",
            )

        self.check("Deepfake analysis is deterministic", deepfake_deterministic)

        def deepfake_invalid():
            response = self.upload("demo", "evidence.txt", b"not media", "text/plain")
            self.expect_status(response, [400])

        self.check("Deepfake rejects unsupported file type", deepfake_invalid)

        def investigator_audit_denied():
            response = self.request("GET", "crime/audit-logs", token=token)
            self.expect_status(response, [403])

        self.check("Investigator cannot read supervisor audit logs", investigator_audit_denied)

        def supervisor_audit():
            data = self.expect_json(
                self.request(
                    "GET",
                    "crime/audit-logs",
                    token=self.auth_headers("admin"),
                    query={"limit": 200},
                )
            )
            self.require(bool(data), "supervisor audit log is empty")
            actions = {item.get("action") for item in data}
            self.require("AI_QUERY" in actions, "AI query was not written to the audit trail")
            self.require("DEEPFAKE_ANALYSIS" in actions, "deepfake analysis was not written to the audit trail")
            self.require("LOGIN" in actions, "login events were not written to the audit trail")

            # Verify the tamper-evident chain: entries are returned newest-first,
            # so each entry's previous_hash must equal the next-older entry_hash.
            for index, item in enumerate(data):
                self.require(bool(item.get("entry_hash")), f"audit entry {item.get('id')} is missing its hash")
                self.require(bool(item.get("previous_hash")), f"audit entry {item.get('id')} is missing its previous hash")
                if index + 1 < len(data):
                    self.require(
                        item.get("previous_hash") == data[index + 1].get("entry_hash"),
                        f"audit chain breaks at entry {item.get('id')}",
                    )
            # The full set (well under the 200 page limit) must terminate at GENESIS.
            if len(data) < 200:
                self.require(data[-1].get("previous_hash") == "GENESIS", "audit chain does not reach GENESIS")

        self.check("Supervisor audit-log access and integrity hash", supervisor_audit)

        accused_id = None
        accused = context.get("accused") or []
        if accused:
            accused_id = accused[0]["id"]
        police_fir_ids = {item["id"] for item in context.get("firs", [])}
        return accused_id, police_fir_ids

    def test_citizen_boundaries(self, accused_id: Optional[int], police_fir_ids: set[int]) -> None:
        token = self.tokens.get("citizen1", {}).get("access_token", "")
        context: Dict[str, Any] = {}

        def own_firs():
            data = self.expect_json(self.request("GET", "crime/firs", token=token, query={"limit": 100}))
            self.require(data.get("total") == 5, f"citizen should see exactly 5 FIRs, got {data.get('total')}")
            self.require(len(data.get("firs", [])) == 5, "citizen FIR page does not contain five records")
            context["own_ids"] = {item["id"] for item in data["firs"]}

        self.check("Citizen sees only five owned FIRs", own_firs)

        def own_detail():
            own_ids = context.get("own_ids") or set()
            self.require(bool(own_ids), "citizen FIR fixture unavailable")
            fir_id = next(iter(own_ids))
            data = self.expect_json(self.request("GET", f"crime/firs/{fir_id}", token=token))
            self.require(data.get("id") == fir_id, "citizen cannot access an owned FIR")

        self.check("Citizen can read owned FIR detail", own_detail)

        def foreign_detail_denied():
            own_ids = context.get("own_ids") or set()
            foreign_ids = police_fir_ids - own_ids
            self.require(bool(foreign_ids), "foreign FIR fixture unavailable")
            response = self.request("GET", f"crime/firs/{next(iter(foreign_ids))}", token=token)
            self.expect_status(response, [403])

        self.check("Citizen cannot access another complainant's FIR by ID", foreign_detail_denied)

        police_only_requests = [
            ("GET", "crime/accused", None, "accused list"),
            ("GET", "crime/analytics/dashboard", None, "analytics dashboard"),
            ("GET", "crime/analytics/hotspots", None, "hotspots"),
            ("GET", "crime/audit-logs", None, "audit logs"),
            ("POST", "ai/chat", {"message": "List repeat offenders"}, "AI intelligence chat"),
        ]
        if accused_id is not None:
            police_only_requests.extend([
                ("GET", f"crime/accused/{accused_id}/profile", None, "accused profile"),
                ("GET", f"crime/network/{accused_id}", None, "criminal network"),
                ("GET", "crime/network/entity-resolution/Ravi%20Kumar", None, "entity resolution"),
            ])

        for method, path, payload, label in police_only_requests:
            def denied(method=method, path=path, payload=payload):
                response = self.request(method, path, token=token, json_body=payload)
                self.expect_status(response, [403])

            self.check(f"Citizen is blocked from {label}", denied)

        def citizen_deepfake_allowed():
            data = self.expect_json(self.upload("citizen1", "citizen-evidence.png", TINY_PNG, "image/png"))
            self.require(data.get("filename") == "citizen-evidence.png", "citizen deepfake upload failed")

        self.check("Citizen can use deepfake verification", citizen_deepfake_allowed)

    def test_public_portal(self) -> None:
        """Public portal features (no authentication required)."""

        def register_complaint():
            data = self.expect_json(
                self.request(
                    "POST",
                    "public/complaint",
                    json_body={
                        "complainant_name": "Smoke Test Citizen",
                        "complainant_phone": "9999999999",
                        "description": "I lost 50000 rupees to an online investment fraud scheme where a fake website promised high returns and then blocked my account.",
                        "location_name": "Koramangala",
                    },
                )
            )
            self.require(data.get("complaint_number", "").startswith("PUB-"), "complaint number not generated")
            self.require("/" not in data.get("complaint_number", ""), "complaint number must not contain a slash (breaks URL tracking)")
            self.require(data.get("ai_crime_type") == "fraud", f"AI misclassified complaint: {data.get('ai_crime_type')}")
            self.require(data.get("law_violated") is True, "AI failed to detect law violation")
            self.require(bool(data.get("ai_law_sections")), "no law sections returned")
            self.require(0 < data.get("ai_confidence", 0) <= 1, "invalid AI confidence")
            return data

        complaint = self.check("Public complaint registration + AI classification", register_complaint)

        def track_complaint():
            self.require(complaint is not None, "complaint fixture unavailable")
            number = complaint["complaint_number"]
            data = self.expect_json(self.request("GET", f"public/complaint/{number}"))
            self.require(data.get("complaint_number") == number, "complaint tracking mismatch")
            self.require(data.get("status") == "pending", "new complaint should be pending")

        self.check("Public complaint tracking by number", track_complaint)

        def public_complaint_list():
            # Newly filed complaints are NOT public yet (only after 7 days), so
            # this should return a list (possibly empty) without leaking data.
            data = self.expect_json(self.request("GET", "public/complaints"))
            self.require(isinstance(data, list), "public complaints must be a list")
            for item in data:
                self.require("complainant_phone" not in item, "public list leaks phone numbers")
                self.require("complainant_email" not in item, "public list leaks emails")

        self.check("Public complaints list hides personal data", public_complaint_list)

        def no_law_complaint():
            data = self.expect_json(
                self.request(
                    "POST",
                    "public/complaint",
                    json_body={
                        "complainant_name": "Test User",
                        "description": "I just want to share some general feedback about the neighbourhood park cleanliness today.",
                    },
                )
            )
            self.require(data.get("law_violated") is False, "should not flag a non-crime as law violation")

        self.check("Public complaint with no law violation", no_law_complaint)

        def scam_detected():
            data = self.expect_json(
                self.request(
                    "POST",
                    "public/scam-detect",
                    json_body={
                        "content": "URGENT: Please share your OTP and verification code to verify OTP for your bank account.",
                        "source": "sms",
                    },
                )
            )
            self.require(data.get("is_scam") is True, "clear OTP scam not detected")
            self.require(data.get("scam_type") == "otp_fraud", f"wrong scam type: {data.get('scam_type')}")
            self.require(data.get("confidence", 0) >= 0.6, "scam confidence too low")
            self.require(bool(data.get("advisory")), "no advisory returned")
            self.require(bool(data.get("report_links")), "no report links returned")

        self.check("Scam detection flags OTP fraud", scam_detected)

        def scam_clean():
            data = self.expect_json(
                self.request(
                    "POST",
                    "public/scam-detect",
                    json_body={"content": "Hey, are we still meeting for lunch tomorrow at 1pm?", "source": "whatsapp"},
                )
            )
            self.require(data.get("is_scam") is False, "benign message wrongly flagged as scam")

        self.check("Scam detection passes benign message", scam_clean)

        def case_similarity():
            # FIR id 1 always exists in the seed set.
            data = self.expect_json(self.request("GET", "public/case-similarity/1"))
            self.require(data.get("source_fir", {}).get("id") == 1, "source FIR mismatch")
            self.require("similar_cases" in data, "similar_cases missing")
            self.require(isinstance(data.get("similar_cases"), list), "similar_cases must be a list")

        self.check("Case similarity engine", case_similarity)

        def cctv_match():
            body, multipart_type = self.multipart("suspect.png", TINY_PNG, "image/png")
            data = self.expect_json(
                self.request("POST", "public/cctv-match", body=body, headers={"Content-Type": multipart_type})
            )
            self.require(data.get("total_suspects_scanned", 0) >= 40, "CCTV did not scan accused database")
            self.require("matches" in data, "CCTV matches field missing")
            self.require(isinstance(data.get("matches"), list), "CCTV matches must be a list")
            # Deterministic: same image => same matches
            data2 = self.expect_json(
                self.request("POST", "public/cctv-match", body=body, headers={"Content-Type": multipart_type})
            )
            self.require(
                [m["accused_id"] for m in data.get("matches", [])] == [m["accused_id"] for m in data2.get("matches", [])],
                "CCTV matching is not deterministic",
            )

        self.check("CCTV suspect face matching", cctv_match)

    def test_police_complaint_review(self) -> None:
        """Police-side complaint inbox, status update, and FIR conversion."""
        token = self.tokens.get("demo", {}).get("access_token", "")
        context: Dict[str, Any] = {}

        def register_fixture():
            data = self.expect_json(
                self.request(
                    "POST",
                    "public/complaint",
                    json_body={
                        "complainant_name": "Inbox Fixture Citizen",
                        "complainant_phone": "9876543210",
                        "complainant_email": "fixture@example.com",
                        "description": "Someone hacked my online banking account and transferred money using a phishing link sent via SMS.",
                        "location_name": "Indiranagar",
                    },
                )
            )
            context["complaint_number"] = data["complaint_number"]
            return data

        self.check("Fixture: register a complaint for inbox tests", register_fixture)

        def inbox_shows_full_details():
            self.require("complaint_number" in context, "complaint fixture unavailable")
            data = self.expect_json(self.request("GET", "public/complaints/inbox", token=token))
            self.require("pending_count" in data, "pending_count missing from inbox")
            match = next((c for c in data["complaints"] if c["complaint_number"] == context["complaint_number"]), None)
            self.require(match is not None, "newly filed complaint did not appear in police inbox")
            self.require(match.get("complainant_phone") == "9876543210", "inbox is not showing full complainant details to police")
            self.require(match.get("complainant_email") == "fixture@example.com", "inbox is missing complainant email")
            context["complaint_id"] = match["id"]

        self.check("Police inbox shows new complaints immediately with full details", inbox_shows_full_details)

        def inbox_requires_auth():
            response = self.request("GET", "public/complaints/inbox")
            self.expect_status(response, [401, 403])

        self.check("Police complaint inbox requires authentication", inbox_requires_auth)

        def citizen_cannot_read_inbox():
            citizen_token = self.tokens.get("citizen1", {}).get("access_token", "")
            response = self.request("GET", "public/complaints/inbox", token=citizen_token)
            self.expect_status(response, [403])

        self.check("Citizen is blocked from police complaint inbox", citizen_cannot_read_inbox)

        def update_status():
            self.require("complaint_id" in context, "complaint id fixture unavailable")
            data = self.expect_json(
                self.request(
                    "PATCH",
                    f"public/complaints/{context['complaint_id']}/status",
                    token=token,
                    json_body={"status": "under_review"},
                )
            )
            self.require(data.get("status") == "under_review", "status update did not apply")

        self.check("Officer can update complaint status", update_status)

        def convert_to_fir():
            self.require("complaint_id" in context, "complaint id fixture unavailable")
            data = self.expect_json(
                self.request("POST", f"public/complaints/{context['complaint_id']}/convert-to-fir", token=token)
            )
            self.require(data.get("fir_number"), "FIR conversion did not return a FIR number")
            context["converted_fir_id"] = data["fir_id"]

        self.check("Officer can convert a complaint to a formal FIR", convert_to_fir)

    def test_deepfake_no_false_positive(self) -> None:
        """Regression: ordinary photos must NOT be flagged as deepfakes."""
        token = self.tokens.get("demo", {}).get("access_token", "")

        def genuine_photo_low_risk():
            # A real-looking JPEG with camera EXIF and high-entropy pixel data.
            import os
            random_bytes = os.urandom(20000)
            jpeg = (
                b"\xff\xd8\xff\xe1\x00\x30Exif\x00\x00Make Samsung Model Galaxy ISO 200 "
                + b"\xff\xc0\x00\x11\x08" + (1200).to_bytes(2, "big") + (1600).to_bytes(2, "big")
                + b"\x03\x01\x22\x00"
                + random_bytes
                + b"\xff\xd9"
            )
            data = self.expect_json(self.upload("demo", "genuine_photo.jpg", jpeg, "image/jpeg"))
            self.require(data.get("is_deepfake") is False, "genuine camera photo was falsely flagged as a deepfake")
            self.require(data.get("confidence", 1) < 0.6, f"genuine photo confidence too high: {data.get('confidence')}")
            self.require(data.get("risk_level") in ("low", "medium"), f"genuine photo risk_level too high: {data.get('risk_level')}")

        self.check("Deepfake: genuine EXIF photo is NOT falsely flagged", genuine_photo_low_risk)

        def whatsapp_style_photo_low_risk():
            # WhatsApp/Telegram strip EXIF from every photo they forward — this
            # alone must never push a real photo into high/critical risk.
            import os
            random_bytes = os.urandom(20000)
            jpeg_no_exif = (
                b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
                + b"\xff\xc0\x00\x11\x08" + (1024).to_bytes(2, "big") + (1024).to_bytes(2, "big")
                + b"\x03\x01\x22\x00"
                + random_bytes
                + b"\xff\xd9"
            )
            data = self.expect_json(self.upload("demo", "whatsapp_forward.jpg", jpeg_no_exif, "image/jpeg"))
            self.require(data.get("is_deepfake") is False, "EXIF-stripped (WhatsApp-style) photo was falsely flagged")
            self.require(data.get("confidence", 1) < 0.6, f"WhatsApp-style photo confidence too high: {data.get('confidence')}")

        self.check("Deepfake: EXIF-stripped forwarded photo is NOT falsely flagged", whatsapp_style_photo_low_risk)

    def test_policy_and_predictive_features(self) -> None:
        """Policy insights, offender profiling, and crime forecast (RFP features)."""
        analyst_token = self.tokens.get("analyst", {}).get("access_token", "")
        demo_token = self.tokens.get("demo", {}).get("access_token", "")

        def policy_insights():
            data = self.expect_json(self.request("GET", "public/policy-insights", token=analyst_token, query={"days": 365}))
            self.require("victim_demographics" in data, "victim_demographics missing")
            self.require("offender_demographics" in data, "offender_demographics missing")
            self.require("district_crime_rates" in data, "district_crime_rates missing")
            self.require("data_limitations" in data, "data_limitations disclosure missing (must not fabricate socio-economic data)")
            self.require(isinstance(data.get("policy_recommendations"), list), "policy_recommendations must be a list")

        self.check("Policy insights endpoint (analyst+)", policy_insights)

        def policy_insights_denied_for_constable():
            constable_token = self.tokens.get("constable", {}).get("access_token", "")
            response = self.request("GET", "public/policy-insights", token=constable_token)
            self.expect_status(response, [403])

        self.check("Policy insights blocked below analyst role", policy_insights_denied_for_constable)

        def offender_profiling():
            # FIR id 1 always exists; result depends on data but must be well-formed either way.
            data = self.expect_json(self.request("GET", "public/offender-profile/1", token=demo_token))
            self.require("already_identified" in data, "already_identified field missing")
            if data["already_identified"]:
                self.require("identified_accused" in data, "identified_accused missing when already identified")
            elif data.get("sufficient_data"):
                self.require("inferred_profile" in data, "inferred_profile missing")
                self.require("confidence" in data, "confidence missing")
                self.require("next_steps" in data, "next_steps missing")
            else:
                self.require("message" in data, "explanatory message missing when data is insufficient")

        self.check("Unidentified offender profiling endpoint", offender_profiling)

        def offender_profiling_not_found():
            response = self.request("GET", "public/offender-profile/999999", token=demo_token)
            self.expect_status(response, [404])

        self.check("Offender profiling 404s for a non-existent FIR", offender_profiling_not_found)

        def crime_forecast():
            data = self.expect_json(
                self.request("GET", "public/crime-forecast", token=demo_token, query={"district": "Bengaluru Urban", "days": 365})
            )
            self.require("sufficient_data" in data, "sufficient_data field missing")
            if data["sufficient_data"]:
                self.require("risk_level" in data, "risk_level missing")
                self.require("preventive_measures" in data and data["preventive_measures"], "preventive_measures missing")
                self.require("method_disclosure" in data, "method_disclosure missing (must not claim to be an ML model)")
                self.require("forecast_summary" in data, "forecast_summary missing")

        self.check("Predictive crime forecast endpoint", crime_forecast)

        def crime_forecast_requires_location_or_district():
            response = self.request("GET", "public/crime-forecast", token=demo_token)
            self.expect_status(response, [400])

        self.check("Crime forecast requires a location or district", crime_forecast_requires_location_or_district)

    def run(self) -> int:
        print(f"PRAHARI smoke test\nBackend:  {self.base_url}")
        if self.frontend_url:
            print(f"Frontend: {self.frontend_url}")
        print("-" * 72)
        self.test_public_endpoints()
        self.test_frontend_and_cors()
        self.test_authentication()
        accused_id, police_fir_ids = self.test_police_features()
        self.test_citizen_boundaries(accused_id, police_fir_ids)
        self.test_public_portal()
        self.test_police_complaint_review()
        self.test_deepfake_no_false_positive()
        self.test_policy_and_predictive_features()
        print("-" * 72)
        print(f"RESULT: {self.passed} passed, {self.failed} failed")
        if self.failed:
            print("PRAHARI is NOT ready for promotion. Fix every failure first.")
            return 1
        print("PRAHARI environment is ready for promotion/use.")
        return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run complete PRAHARI deployment smoke tests")
    parser.add_argument("--base-url", required=True, help="Backend origin, without /api/v1")
    parser.add_argument("--frontend-url", help="Optional deployed frontend index URL for bundle/CORS checks")
    parser.add_argument("--timeout", type=float, default=30.0, help="Per-request timeout in seconds")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    sys.exit(SmokeTest(args.base_url, args.frontend_url, args.timeout).run())
