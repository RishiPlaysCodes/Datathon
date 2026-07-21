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

        def deepfake_valid():
            data = self.expect_json(self.upload("demo", "evidence.png", TINY_PNG, "image/png"))
            self.require(data.get("filename") == "evidence.png", "deepfake result filename mismatch")
            self.require(0 <= data.get("confidence", -1) <= 1, "deepfake confidence is out of range")
            self.require(data.get("recommendations"), "deepfake recommendations missing")

        self.check("Deepfake valid image upload", deepfake_valid)

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
