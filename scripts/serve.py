#!/usr/bin/env python3
"""Local workshop preview with a server-side Gemini contribution assistant."""

import argparse
from collections import deque
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
import threading
import time
from urllib.parse import unquote, urlsplit

from scripts.cfp_context import CFPContextError, load_context
from scripts.gemini_client import DEFAULT_MODEL, GeminiError, generate_suggestions

SITE_ROOT = Path(__file__).resolve().parents[1]
CFP_PATH = SITE_ROOT / 'chi2027/call-for-participation.html'
DEFAULT_ENV = Path('/private/tmp/chi2027-cfp-gemini.env')
MAX_BODY_BYTES = 20000
MAX_DESCRIPTION = 4000


def read_settings(env_file):
    settings = {name: os.environ[name] for name in ('GEMINI_API_KEY', 'GEMINI_MODEL') if os.environ.get(name)}
    if env_file and Path(env_file).exists():
        for line in Path(env_file).read_text().splitlines():
            name, separator, value = line.partition('=')
            if separator and name.strip() in ('GEMINI_API_KEY', 'GEMINI_MODEL'):
                value = value.strip()
                if len(value) > 1 and value[0] == value[-1] and value[0] in '\"\'':
                    value = value[1:-1]
                settings[name.strip()] = value
    key = settings.get('GEMINI_API_KEY', '').strip()
    model = settings.get('GEMINI_MODEL', DEFAULT_MODEL).strip()
    if '\r' in key or '\n' in key or not re.fullmatch(r'gemini-[a-z0-9][a-z0-9.-]{0,99}', model):
        raise ValueError('Invalid Gemini configuration.')
    return key, model


def parse_description(payload):
    if not isinstance(payload, dict) or set(payload) != {'description'}:
        raise ValueError('Please provide a description of your work.')
    description = payload['description']
    if not isinstance(description, str) or not 20 <= len(description.strip()) <= MAX_DESCRIPTION:
        raise ValueError('Please describe your work in 20–4,000 characters.')
    return description.strip()


class RequestBudget:
    # Local prototype: one shared budget, avoiding a public, unmetered proxy.
    def __init__(self, limit=10, period=60, clock=time.monotonic):
        self.limit, self.period, self.clock = limit, period, clock
        self.requests = deque()
        self.lock = threading.Lock()

    def take(self):
        with self.lock:
            now = self.clock()
            while self.requests and now - self.requests[0] >= self.period:
                self.requests.popleft()
            if len(self.requests) >= self.limit:
                return False
            self.requests.append(now)
            return True


class PreviewServer(ThreadingHTTPServer):
    def __init__(self, address, env_file=DEFAULT_ENV, generator=generate_suggestions):
        if address[0] != '127.0.0.1':
            raise ValueError('This preview server binds only to 127.0.0.1.')
        self.env_file = Path(env_file) if env_file else None
        if self.env_file and self.env_file.resolve().is_relative_to(SITE_ROOT):
            raise ValueError('Keep the credential file outside the website directory.')
        self.generator = generator
        self.budget = RequestBudget()
        self.inflight = threading.BoundedSemaphore(1)
        super().__init__(address, partial(PreviewHandler, directory=str(SITE_ROOT)))


class PreviewHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        # Research descriptions and credentials are never written to access logs.
        pass

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def allowed_host(self):
        return self.headers.get('Host') in {
            f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'}

    def send_json(self, status, payload):
        encoded = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(encoded)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        try:
            self.wfile.write(encoded)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def error(self, status, code, message):
        self.send_json(status, {'error': {'code': code, 'message': message}})

    def static_allowed(self):
        parts = Path(unquote(urlsplit(self.path).path).lstrip('/')).parts
        if any(part.startswith('.') for part in parts):
            return False
        if parts and parts[0] not in ('index.html', 'chi2027', 'assets', 'favicon.ico'):
            return False
        target = (SITE_ROOT / Path(*parts)).resolve()
        return target.is_relative_to(SITE_ROOT)

    def list_directory(self, _):
        self.send_error(404)
        return None

    def do_GET(self):
        if not self.allowed_host():
            return self.error(403, 'origin', 'This preview is available only on this computer.')
        path = urlsplit(self.path).path
        if path == '/api/cfp-status':
            try:
                key, model = read_settings(self.server.env_file)
                context = load_context(CFP_PATH)
                return self.send_json(200, {'available': bool(key), 'provider': 'Google Gemini',
                                           'model': model, 'context_version': context['version']})
            except (OSError, ValueError, CFPContextError):
                return self.send_json(200, {'available': False, 'provider': 'Google Gemini'})
        if path.startswith('/api/') or not self.static_allowed():
            return self.error(404, 'not_found', 'This page is unavailable.')
        super().do_GET()

    def do_HEAD(self):
        if not self.allowed_host() or not self.static_allowed() or urlsplit(self.path).path.startswith('/api/'):
            return self.send_error(404)
        super().do_HEAD()

    def do_POST(self):
        origin = self.headers.get('Origin')
        expected = f"http://{self.headers.get('Host')}"
        if not self.allowed_host() or origin != expected:
            return self.error(403, 'origin', 'Please use the assistant from this workshop preview.')
        if urlsplit(self.path).path != '/api/cfp-suggestions':
            return self.error(404, 'not_found', 'This endpoint is unavailable.')
        if self.headers.get('Content-Type', '').split(';')[0].strip().lower() != 'application/json':
            return self.error(415, 'content_type', 'Please send a description using the form.')
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= MAX_BODY_BYTES:
                return self.error(413, 'length', 'Please keep your description within 4,000 characters.')
            self.connection.settimeout(5)
            description = parse_description(json.loads(self.rfile.read(length)))
        except (ValueError, UnicodeError, OSError):
            return self.error(400, 'description', 'Please describe your work in 20–4,000 characters.')
        try:
            key, model = read_settings(self.server.env_file)
            if not key:
                return self.error(503, 'not_configured', 'The assistant is not connected yet. You can explore the full CFP below.')
            context = load_context(CFP_PATH)
        except (OSError, ValueError, CFPContextError):
            return self.error(503, 'context', 'The assistant is temporarily unavailable. Please use the full CFP below.')
        if not self.server.inflight.acquire(blocking=False):
            return self.error(429, 'busy', 'The assistant is handling a request. Please try again shortly.')
        try:
            try:
                rate_limited = not self.server.budget.take()
                if not rate_limited:
                    result = self.server.generator(description, context, key, model=model)
            finally:
                # A client can send its next request as soon as response bytes arrive.
                # Release the model slot before writing success or error responses.
                self.server.inflight.release()
        except GeminiError as error:
            status = 429 if error.code == 'rate_limited' else 502
            return self.error(status, error.code, str(error))
        except Exception:
            return self.error(502, 'unavailable', 'Suggestions could not be generated. Please try again later.')
        if rate_limited:
            return self.error(429, 'rate_limited', 'Please wait a minute before requesting more suggestions.')
        self.send_json(200, {'result': result, 'context_version': context['version'],
                             'topics': [{'id': item['id'], 'name': item['name'], 'question_id': item['question_id']} for item in context['topics']],
                             'contribution_types': [{'id': item['id'], 'name': item['name']} for item in context['contribution_types']]})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--env-file', type=Path, default=DEFAULT_ENV)
    args = parser.parse_args()
    server = PreviewServer(('127.0.0.1', args.port), args.env_file)
    print(f'Workshop preview: http://127.0.0.1:{server.server_port}/chi2027/', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
