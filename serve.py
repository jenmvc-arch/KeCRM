#!/usr/bin/env python3
"""Serve FlowTrace locally and expose only browser-safe Supabase settings."""

from __future__ import annotations

import argparse
import base64
import json
import re
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlparse, urlsplit


ROOT = Path(__file__).resolve().parent
ENV_FILE = ROOT / ".env.local"
RUNTIME_CONFIG_PATH = "/runtime-config.js"
ENV_KEY_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def parse_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for line_number, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].lstrip()
        if "=" not in line:
            raise ValueError(f"Invalid .env.local line {line_number}: expected KEY=VALUE")

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if not ENV_KEY_PATTERN.fullmatch(key):
            raise ValueError(f"Invalid .env.local key on line {line_number}")
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        values[key] = value
    return values


def decode_jwt_role(token: str) -> str:
    parts = token.split(".")
    if len(parts) != 3:
        return ""
    try:
        payload = parts[1] + "=" * (-len(parts[1]) % 4)
        decoded = base64.urlsafe_b64decode(payload.encode("ascii"))
        return str(json.loads(decoded).get("role", "")).lower()
    except (ValueError, UnicodeDecodeError, json.JSONDecodeError):
        return ""


def browser_config_from_env(values: dict[str, str]) -> dict[str, str] | None:
    url = values.get("SUPABASE_URL", "").strip().rstrip("/")
    publishable_key = (
        values.get("SUPABASE_PUBLISHABLE_KEY", "").strip()
        or values.get("SUPABASE_ANON_KEY", "").strip()
    )
    organization_id = values.get("SUPABASE_ORGANIZATION_ID", "").strip()

    if not url and not publishable_key:
        return None
    if not url or not publishable_key:
        raise ValueError("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set together")

    parsed = urlparse(url)
    is_local = parsed.hostname in {"localhost", "127.0.0.1", "::1"}
    if parsed.scheme != "https" and not (parsed.scheme == "http" and is_local):
        raise ValueError("SUPABASE_URL must use HTTPS unless it points to local Supabase")

    role = decode_jwt_role(publishable_key)
    if publishable_key.lower().startswith("sb_secret_") or role == "service_role":
        raise ValueError("Refusing to expose a Supabase secret/service_role key to the browser")
    if not publishable_key.lower().startswith("sb_publishable_") and role != "anon":
        raise ValueError("Use a Supabase publishable key or legacy anon JWT")

    config = {"url": url, "publishableKey": publishable_key}
    if organization_id:
        config["organizationId"] = organization_id
    return config


def runtime_config_script(config: dict[str, str] | None) -> bytes:
    if not config:
        return b"/* .env.local has no Supabase browser configuration. */\n"
    payload = json.dumps(config, ensure_ascii=True, separators=(",", ":")).replace("</", "<\\/")
    return (
        f"window.FLOWTRACE_SUPABASE_CONFIG=Object.freeze({payload});\n"
        "window.FLOWTRACE_SUPABASE_CONFIG_SOURCE='.env.local';\n"
    ).encode("utf-8")


class FlowTraceRequestHandler(SimpleHTTPRequestHandler):
    runtime_script = b""

    def _path_parts(self) -> tuple[str, ...]:
        path = unquote(urlsplit(self.path).path)
        return tuple(part for part in PurePosixPath(path).parts if part not in {"/", ""})

    def _is_private_path(self) -> bool:
        return any(part.startswith(".") for part in self._path_parts())

    def _is_runtime_config_path(self) -> bool:
        return self._path_parts() == (RUNTIME_CONFIG_PATH.lstrip("/"),)

    def _contains_symlink(self) -> bool:
        current = ROOT
        for part in self._path_parts():
            current /= part
            if current.is_symlink():
                return True
        return False

    def _send_runtime_config(self, include_body: bool) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "application/javascript; charset=utf-8")
        self.send_header("Content-Length", str(len(self.runtime_script)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if include_body:
            self.wfile.write(self.runtime_script)

    def do_GET(self) -> None:  # noqa: N802 - inherited HTTP handler API
        if self._is_runtime_config_path():
            self._send_runtime_config(include_body=True)
            return
        if self._is_private_path() or self._contains_symlink():
            self.send_error(404)
            return
        super().do_GET()

    def do_HEAD(self) -> None:  # noqa: N802 - inherited HTTP handler API
        if self._is_runtime_config_path():
            self._send_runtime_config(include_body=False)
            return
        if self._is_private_path() or self._contains_symlink():
            self.send_error(404)
            return
        super().do_HEAD()

    def end_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        super().end_headers()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=4173, type=int)
    args = parser.parse_args()

    try:
        config = browser_config_from_env(parse_env_file(ENV_FILE))
    except ValueError as error:
        raise SystemExit(f"Invalid .env.local: {error}") from error

    FlowTraceRequestHandler.runtime_script = runtime_config_script(config)
    handler = partial(FlowTraceRequestHandler, directory=str(ROOT))
    server = ThreadingHTTPServer((args.host, args.port), handler)

    mode = "Supabase config loaded from .env.local" if config else "demo mode; add Supabase values to .env.local"
    print(f"FlowTrace running at http://{args.host}:{args.port} ({mode})")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nFlowTrace server stopped")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
