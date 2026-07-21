"""Catalyst AppSail entry point - reads the port assigned by Catalyst."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import uvicorn

if __name__ == "__main__":
    # Catalyst provides the port via X_ZOHO_CATALYST_LISTEN_PORT env variable
    port = int(os.environ.get("X_ZOHO_CATALYST_LISTEN_PORT", os.environ.get("PORT", 9000)))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)
