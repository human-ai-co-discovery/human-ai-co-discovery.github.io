import http.client
import json
import os
from pathlib import Path
import sys
import tempfile
import threading
import unittest
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts import serve


class PreviewServerTests(unittest.TestCase):
    KEY = "unit-test-secret-not-a-real-key"
    DESCRIPTION = "I study how people revise their interpretations with AI."
    CONTEXT = {
        "version": "test-cfp-version",
        "topics": [{"id": "topic-interpretation", "name": "Interpretation", "question_id": "q1"}],
        "contribution_types": [{"id": "position-paper", "name": "Position paper"}],
    }
    RESULT = {
        "status": "suggestions",
        "suggestions": [{"topic_id": "topic-interpretation", "contribution_type_ids": ["position-paper"],
                         "reason": "Your work examines changing interpretations.",
                         "angle": "Trace an interaction that prompted a revision."}],
        "follow_up": None,
    }

    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name).resolve()
        self.site = self.directory / "website"
        self.site.mkdir()
        (self.site / "index.html").write_text("public preview", encoding="utf-8")
        (self.site / "assets").mkdir()
        (self.site / "assets/style.css").write_text("body {}", encoding="utf-8")
        (self.site / "scripts").mkdir()
        (self.site / "scripts/serve.py").write_text("private script", encoding="utf-8")
        (self.site / ".env").write_text(self.KEY, encoding="utf-8")
        self.env_file = self.directory / "credentials.env"
        self.env_file.write_text(f"GEMINI_API_KEY={self.KEY}\nGEMINI_MODEL={serve.DEFAULT_MODEL}\n", encoding="utf-8")
        for override in (
            patch.object(serve, "SITE_ROOT", self.site),
            patch.object(serve, "load_context", return_value=self.CONTEXT),
            patch.dict(os.environ, {"GEMINI_API_KEY": "", "GEMINI_MODEL": serve.DEFAULT_MODEL}),
        ):
            override.start()
            self.addCleanup(override.stop)
        self.generator = Mock(return_value=self.RESULT)
        self.server = serve.PreviewServer(("127.0.0.1", 0), self.env_file, generator=self.generator)
        self.thread = threading.Thread(target=self.server.serve_forever, kwargs={"poll_interval": 0.01}, daemon=True)
        self.thread.start()
        self.addCleanup(self.stop_server)
        self.authority = f"127.0.0.1:{self.server.server_port}"

    def stop_server(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)

    def request(self, method="POST", path="/api/cfp-suggestions", payload=None, body=None, headers=None):
        request_headers = {"Host": self.authority}
        if method == "POST":
            request_headers.update({"Origin": f"http://{self.authority}", "Content-Type": "application/json"})
            if body is None:
                body = json.dumps(payload if payload is not None else {"description": self.DESCRIPTION}).encode()
        for name, value in (headers or {}).items():
            if value is None:
                request_headers.pop(name, None)
            else:
                request_headers[name] = value
        connection = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=2)
        try:
            connection.request(method, path, body=body, headers=request_headers)
            response = connection.getresponse()
            raw = response.read().decode("utf-8")
            return response.status, dict(response.getheaders()), raw
        finally:
            connection.close()

    def test_success_uses_injected_generator_and_returns_cfp_metadata_without_key(self):
        status, headers, raw = self.request(payload={"description": f"  {self.DESCRIPTION}  "})
        self.assertEqual(status, 200)
        self.assertEqual(headers["Cache-Control"], "no-store")
        self.assertEqual(headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(json.loads(raw), {"result": self.RESULT, "context_version": self.CONTEXT["version"],
                                         "topics": self.CONTEXT["topics"], "contribution_types": self.CONTEXT["contribution_types"]})
        self.generator.assert_called_once_with(self.DESCRIPTION, self.CONTEXT, self.KEY, model=serve.DEFAULT_MODEL)
        self.assertNotIn(self.KEY, raw)
        status, _, raw = self.request("GET", "/api/cfp-status")
        self.assertEqual(status, 200)
        self.assertTrue(json.loads(raw)["available"])
        self.assertNotIn(self.KEY, raw)

    def test_post_rejects_foreign_or_missing_origin_and_invalid_host(self):
        variants = [{"Origin": None}, {"Origin": "null"}, {"Origin": "https://evil.example"},
                    {"Origin": f"http://{self.authority}/"}, {"Origin": f"https://{self.authority}"},
                    {"Host": "evil.example"}, {"Host": "127.0.0.1:1"}]
        for headers in variants:
            with self.subTest(headers=headers):
                self.assertEqual(self.request(headers=headers)[0], 403)
        self.generator.assert_not_called()

    def test_origin_must_match_host_not_just_be_an_allowed_loopback_alias(self):
        aliases = ("127.0.0.1", "localhost")
        for host, origin in zip(aliases, reversed(aliases)):
            with self.subTest(host=host, origin=origin):
                headers = {"Host": f"{host}:{self.server.server_port}", "Origin": f"http://{origin}:{self.server.server_port}"}
                self.assertEqual(self.request(headers=headers)[0], 403)
        self.generator.assert_not_called()

    def test_matching_localhost_origin_and_host_are_accepted(self):
        authority = f"localhost:{self.server.server_port}"
        self.assertEqual(self.request(headers={"Host": authority, "Origin": f"http://{authority}"})[0], 200)

    def test_json_content_type_required_before_generator(self):
        for value in (None, "text/plain", "application/x-www-form-urlencoded"):
            with self.subTest(content_type=value):
                self.assertEqual(self.request(headers={"Content-Type": value})[0], 415)
        self.generator.assert_not_called()

    def test_body_length_is_bounded_before_generator(self):
        for length in ("0", "-1", str(serve.MAX_BODY_BYTES + 1)):
            with self.subTest(length=length):
                self.assertEqual(self.request(body=b"", headers={"Content-Length": length})[0], 413)
        self.assertEqual(self.request(body=b"", headers={"Content-Length": "not-a-number"})[0], 400)
        self.generator.assert_not_called()

    def test_malformed_json_or_description_is_rejected_without_spending_budget(self):
        bodies = [b"{", b"\xff", b"null", b"[]", json.dumps({}).encode(),
                  json.dumps({"description": 123}).encode(), json.dumps({"description": "short"}).encode(),
                  json.dumps({"description": "x" * (serve.MAX_DESCRIPTION + 1)}).encode(),
                  json.dumps({"description": self.DESCRIPTION, "extra": "unexpected"}).encode()]
        for body in bodies:
            with self.subTest(body=body[:40]):
                self.assertEqual(self.request(body=body)[0], 400)
        self.generator.assert_not_called()
        self.assertEqual(len(self.server.budget.requests), 0)

    def test_missing_configuration_is_503_and_status_does_not_expose_key(self):
        self.env_file.write_text("", encoding="utf-8")
        status, _, raw = self.request()
        self.assertEqual(status, 503)
        self.assertEqual(json.loads(raw)["error"]["code"], "not_configured")
        self.assertNotIn(self.KEY, raw)
        status, _, raw = self.request("GET", "/api/cfp-status")
        self.assertEqual(status, 200)
        self.assertFalse(json.loads(raw)["available"])
        self.assertNotIn(self.KEY, raw)
        self.generator.assert_not_called()

    def test_public_assets_work_but_private_paths_and_traversal_are_not_served(self):
        (self.site / "assets/.env").write_text(self.KEY, encoding="utf-8")
        (self.site / "assets/escape.txt").symlink_to(self.env_file)
        for path in ("/.env", "/assets/.env", "/scripts/serve.py", "/credentials.env",
                     "/../credentials.env", "/assets/%2e%2e/%2e%2e/credentials.env", "/assets/escape.txt"):
            for method in ("GET", "HEAD"):
                with self.subTest(path=path, method=method):
                    status, _, raw = self.request(method, path)
                    self.assertEqual(status, 404)
                    self.assertNotIn(self.KEY, raw)
        self.assertEqual(self.request("GET", "/")[0], 200)
        self.assertEqual(self.request("GET", "/assets/style.css")[0], 200)
        self.assertEqual(self.request("GET", "/assets/")[0], 404)
        self.generator.assert_not_called()

    def test_nonloopback_binding_and_secret_file_inside_site_are_refused(self):
        for host in ("0.0.0.0", "::", "192.0.2.1"):
            with self.subTest(host=host), self.assertRaises(ValueError):
                serve.PreviewServer((host, 0), self.env_file, generator=self.generator)
        with self.assertRaises(ValueError):
            unexpected = serve.PreviewServer(("127.0.0.1", 0), self.site / ".env", generator=self.generator)
            self.addCleanup(unexpected.server_close)

    def test_generation_slot_is_released_before_any_response_is_written(self):
        original = serve.PreviewHandler.send_json
        observed = []

        def inspect_slot(handler, status, payload):
            available = handler.server.inflight.acquire(blocking=False)
            if available:
                handler.server.inflight.release()
            observed.append(available)
            return original(handler, status, payload)

        with patch.object(serve.PreviewHandler, "send_json", inspect_slot):
            self.assertEqual(self.request()[0], 200)
            self.generator.side_effect = serve.GeminiError("timeout")
            self.assertEqual(self.request()[0], 502)
            self.server.budget = serve.RequestBudget(limit=0)
            self.assertEqual(self.request()[0], 429)
        self.assertEqual(observed, [True, True, True])

    def test_request_budget_is_bounded_and_expires_at_exact_window_boundary(self):
        now = [0.0]
        self.server.budget = serve.RequestBudget(limit=2, period=10, clock=lambda: now[0])
        self.assertEqual([self.request()[0] for _ in range(3)], [200, 200, 429])
        self.assertEqual(self.generator.call_count, 2)
        self.assertEqual(len(self.server.budget.requests), 2)
        now[0] = 9.999
        self.assertEqual(self.request()[0], 429)
        self.assertEqual(self.generator.call_count, 2)
        now[0] = 10.0
        self.assertEqual(self.request()[0], 200)
        self.assertEqual(self.generator.call_count, 3)
        self.assertEqual(len(self.server.budget.requests), 1)


if __name__ == "__main__":
    unittest.main()
