"""Small, stateless Gemini client for CFP suggestions; no credentials are stored."""

from http.client import HTTPException
import json
import re
from urllib import error, request

from scripts.cfp_context import SYSTEM_INSTRUCTIONS, response_schema, validate_suggestions

DEFAULT_MODEL = "gemini-3.5-flash-lite"
ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions"
TIMEOUT_SECONDS = 45
MAX_RESPONSE_BYTES = 256 * 1024

_MESSAGES = {
    "configuration": "The AI finder is not configured correctly.",
    "invalid_input": "Please provide a research description.",
    "unavailable": "The AI service is temporarily unavailable. Please try again later.",
    "rate_limited": "The AI service is busy. Please try again later.",
    "timeout": "The AI request timed out. Please try again.",
    "invalid_response": "The AI response could not be validated. Please try again.",
}


class GeminiError(Exception):
    """Safe error codes and messages suitable for an application response."""

    def __init__(self, code):
        self.code = code if code in _MESSAGES else "unavailable"
        super().__init__(_MESSAGES[self.code])


class _NoRedirect(request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Never forward the API key or research description to another URL.
        return None


_OPENER = request.build_opener(_NoRedirect())


def _parse_output(raw, context):
    try:
        interaction = json.loads(raw)
        if not isinstance(interaction, dict) or interaction.get("status") != "completed":
            raise ValueError
        steps = interaction.get("steps")
        if not isinstance(steps, list):
            raise ValueError
        fragments = []
        for step in steps:
            if not isinstance(step, dict):
                raise ValueError
            if step.get("type") != "model_output":
                continue
            content = step.get("content")
            if not isinstance(content, list):
                raise ValueError
            for item in content:
                if (not isinstance(item, dict) or item.get("type") != "text"
                        or not isinstance(item.get("text"), str)):
                    raise ValueError
                fragments.append(item["text"])
        result = json.loads("".join(fragments))
        if not isinstance(result, dict):
            raise ValueError
        return validate_suggestions(result, context)
    except (ValueError, TypeError, KeyError, UnicodeError, RecursionError):
        raise GeminiError("invalid_response") from None


def generate_suggestions(description, context, api_key, model=DEFAULT_MODEL):
    """Return schema-validated suggestions without logging prompts or provider errors."""
    if (not isinstance(model, str) or not re.fullmatch(r"gemini-[a-z0-9][a-z0-9.-]{0,79}", model)
            or not isinstance(api_key, str) or not re.fullmatch(r"[\x21-\x7e]{1,4096}", api_key)):
        raise GeminiError("configuration")
    if not isinstance(description, str) or not description.strip():
        raise GeminiError("invalid_input")
    try:
        body = {
            "model": model,
            "store": False,
            "system_instruction": SYSTEM_INSTRUCTIONS,
            "input": json.dumps({"workshop_context": context, "research_description": description},
                                ensure_ascii=False, allow_nan=False),
            "generation_config": {"max_output_tokens": 4096},
            "response_format": {"type": "text", "mime_type": "application/json",
                                "schema": response_schema(context)},
        }
        encoded = json.dumps(body, ensure_ascii=False, allow_nan=False).encode("utf-8")
    except (ValueError, TypeError, KeyError, UnicodeError, RecursionError):
        raise GeminiError("configuration") from None
    http_request = request.Request(ENDPOINT, data=encoded, method="POST", headers={
        "Content-Type": "application/json", "Accept": "application/json", "x-goog-api-key": api_key,
    })
    try:
        with _OPENER.open(http_request, timeout=TIMEOUT_SECONDS) as response:
            if response.status != 200:
                raise GeminiError("unavailable")
            raw = response.read(MAX_RESPONSE_BYTES + 1)
    except error.HTTPError as failure:
        code = ("rate_limited" if failure.code == 429 else
                "configuration" if failure.code in (401, 403) else "unavailable")
        failure.close()
        raise GeminiError(code) from None
    except TimeoutError:
        raise GeminiError("timeout") from None
    except error.URLError as failure:
        code = "timeout" if isinstance(failure.reason, TimeoutError) else "unavailable"
        raise GeminiError(code) from None
    except (OSError, HTTPException):
        raise GeminiError("unavailable") from None
    if len(raw) > MAX_RESPONSE_BYTES:
        raise GeminiError("invalid_response")
    return _parse_output(raw, context)
