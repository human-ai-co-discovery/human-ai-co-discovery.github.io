import contextlib
from http.client import IncompleteRead
import io
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
from urllib import error

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts import gemini_client as gemini

CONTEXT = {"topics": [{"id": "topic-interpretation"}],
           "contribution_types": [{"id": "case-description"}]}
SUGGESTIONS = {
    "status": "suggestions",
    "suggestions": [{"topic_id": "topic-interpretation",
                     "contribution_type_ids": ["case-description"],
                     "reason": "Your example revises an interpretation.",
                     "angle": "You could examine what prompted the revision."}],
    "follow_up": None,
}
KEY = "test-key-not-real"
DESCRIPTION = "I study how people revise interpretations of data."


def interaction(output=SUGGESTIONS, **fields):
    return {"status": "completed", "steps": [
        {"type": "model_thought", "content": [{"type": "text", "text": "Ignored thought"}]},
        {"type": "model_output", "content": [{"type": "text", "text": json.dumps(output)}]},
    ], **fields}


class Response(io.BytesIO):
    status = 200

    def __init__(self, data):
        super().__init__(data)
        self.read_sizes = []

    def read(self, size=-1):
        self.read_sizes.append(size)
        return super().read(size)


class GeminiClientTests(unittest.TestCase):
    def call_with(self, payload):
        raw = payload if isinstance(payload, bytes) else json.dumps(payload).encode()
        with patch.object(gemini._OPENER, "open", return_value=Response(raw)):
            return gemini.generate_suggestions(DESCRIPTION, CONTEXT, KEY)

    def test_request_uses_header_auth_fixed_origin_and_stateless_schema(self):
        response = Response(json.dumps(interaction()).encode())
        with patch.object(gemini._OPENER, "open", return_value=response) as send:
            result = gemini.generate_suggestions(DESCRIPTION, CONTEXT, KEY)
        self.assertEqual(result, SUGGESTIONS)
        http_request = send.call_args.args[0]
        self.assertEqual(http_request.full_url, gemini.ENDPOINT)
        self.assertNotIn(KEY, http_request.full_url)
        self.assertEqual(http_request.get_method(), "POST")
        headers = {name.lower(): value for name, value in http_request.header_items()}
        self.assertEqual(headers["x-goog-api-key"], KEY)
        self.assertEqual(headers["content-type"], "application/json")
        body = json.loads(http_request.data)
        self.assertIs(body["store"], False)
        self.assertNotIn(KEY, http_request.data.decode())
        self.assertEqual(body["model"], gemini.DEFAULT_MODEL)
        self.assertEqual(body["response_format"]["mime_type"], "application/json")
        self.assertEqual(body["response_format"]["schema"], gemini.response_schema(CONTEXT))
        self.assertEqual(body["system_instruction"], gemini.SYSTEM_INSTRUCTIONS)
        self.assertEqual(json.loads(body["input"])["research_description"], DESCRIPTION)
        self.assertLessEqual(send.call_args.kwargs["timeout"], 45)
        self.assertEqual(response.read_sizes, [gemini.MAX_RESPONSE_BYTES + 1])
        self.assertNotIn("tools", body)

    def test_invalid_configuration_never_sends_request(self):
        for fields in [{"model": "https://evil.example/model"}, {"model": "gemini-3.5/../x"},
                       {"model": "gemini-x\nHeader: bad"}, {"api_key": "key\nInjected: value"},
                       {"api_key": ""}]:
            with self.subTest(fields=fields), patch.object(gemini._OPENER, "open") as send:
                options = {"api_key": KEY, **fields}
                with self.assertRaises(gemini.GeminiError) as caught:
                    gemini.generate_suggestions(DESCRIPTION, CONTEXT, **options)
                self.assertEqual(caught.exception.code, "configuration")
                send.assert_not_called()

    def test_redirects_are_not_followed(self):
        handler = gemini._NoRedirect()
        for status in (301, 302, 303, 307, 308):
            self.assertIsNone(handler.redirect_request(None, None, status, "", {}, "https://evil.example"))

    def test_provider_errors_never_expose_key_input_or_raw_details(self):
        secret = f"{KEY} {DESCRIPTION} provider-internal-details"
        for status, code in [(401, "configuration"), (403, "configuration"),
                             (429, "rate_limited"), (500, "unavailable"), (302, "unavailable")]:
            failure = error.HTTPError(gemini.ENDPOINT, status, secret, {}, io.BytesIO(secret.encode()))
            stdout, stderr = io.StringIO(), io.StringIO()
            with self.subTest(status=status), patch.object(gemini._OPENER, "open", side_effect=failure):
                with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
                    with self.assertRaises(gemini.GeminiError) as caught:
                        gemini.generate_suggestions(DESCRIPTION, CONTEXT, KEY)
                self.assertEqual(caught.exception.code, code)
                displayed = str(caught.exception) + stdout.getvalue() + stderr.getvalue()
                for text in (KEY, DESCRIPTION, "provider-internal-details"):
                    self.assertNotIn(text, displayed)
                self.assertTrue(caught.exception.__suppress_context__)

    def test_network_timeouts_and_failures_are_safe(self):
        for failure, code in [(TimeoutError(KEY), "timeout"),
                              (error.URLError(TimeoutError(KEY)), "timeout"),
                              (error.URLError(KEY), "unavailable"), (OSError(KEY), "unavailable"),
                              (IncompleteRead(KEY.encode()), "unavailable")]:
            with self.subTest(failure=type(failure).__name__), patch.object(gemini._OPENER, "open", side_effect=failure):
                with self.assertRaises(gemini.GeminiError) as caught:
                    gemini.generate_suggestions(DESCRIPTION, CONTEXT, KEY)
                self.assertEqual(caught.exception.code, code)
                self.assertNotIn(KEY, str(caught.exception))

    def test_incomplete_or_invalid_response_is_rejected(self):
        payloads = [b"not JSON", b"\xff", [], {"error": {"message": KEY}},
                    interaction(status="incomplete"), interaction(status="in_progress"),
                    interaction(status="failed"), interaction(steps=[]), interaction(steps=None),
                    interaction(steps=[{"type": "model_output", "content": [{"type": "image"}]}]),
                    interaction(output=[])]
        for payload in payloads:
            with self.subTest(payload_type=type(payload).__name__):
                with self.assertRaises(gemini.GeminiError) as caught:
                    self.call_with(payload)
                self.assertEqual(caught.exception.code, "invalid_response")
                self.assertNotIn(KEY, str(caught.exception))

    def test_oversized_response_is_bounded_and_rejected(self):
        response = Response(b"x" * (gemini.MAX_RESPONSE_BYTES + 100))
        with patch.object(gemini._OPENER, "open", return_value=response):
            with self.assertRaises(gemini.GeminiError) as caught:
                gemini.generate_suggestions(DESCRIPTION, CONTEXT, KEY)
        self.assertEqual(caught.exception.code, "invalid_response")
        self.assertEqual(response.read_sizes, [gemini.MAX_RESPONSE_BYTES + 1])

    def test_schema_validation_rejects_invented_ids_and_malicious_extra_fields(self):
        for malicious in [
            {**SUGGESTIONS, "suggestions": [{**SUGGESTIONS["suggestions"][0], "topic_id": "invented-topic"}]},
            {**SUGGESTIONS, "suggestions": [{**SUGGESTIONS["suggestions"][0], "contribution_type_ids": ["invented-type"]}]},
            {**SUGGESTIONS, "url": "javascript:alert(1)"},
        ]:
            with self.subTest(malicious=malicious), self.assertRaises(gemini.GeminiError) as caught:
                self.call_with(interaction(malicious))
            self.assertEqual(caught.exception.code, "invalid_response")


if __name__ == "__main__":
    unittest.main()
