import copy
import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("cfp_context", ROOT / "scripts/cfp_context.py")
cfp = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(cfp)

FIXTURE = """<!doctype html><html><head><meta charset="utf-8"></head><body>
<section id="cfp-overview"><h2>Not part of scope</h2>
<p>Discovery across <em>research &amp; practice</em>.</p><p>Incomplete inquiry is welcome.</p></section>
<button data-cfp-topic="topic-q1">An unrelated navigation control</button>
<ul>
<li data-cfp-contributions="position-paper critical-perspective"><strong>Position papers and critical perspectives</strong> on open questions.</li>
<li data-cfp-contributions="empirical-study account-of-practice"><strong>Empirical studies and accounts of practice</strong> about inquiry.</li>
<li data-cfp-contributions="system-description design-concept"><strong>System descriptions and design concepts</strong> supporting exploration.</li>
<li data-cfp-contributions="work-in-progress case-description"><strong>Work in progress and case descriptions</strong>, including unsuccessful inquiry.</li>
</ul>
<details id="topic-q1"><summary>A question</summary><ul>
<li id="topic-interpretation" data-cfp-topic><strong>Interpreting <em>together</em>.</strong> Examine A &amp; B as evidence develops.</li>
<li id="topic-serendipity" data-cfp-topic><strong>Unexpected connections.</strong> Notice patterns.</li>
<li id="topic-explanations" data-cfp-topic><strong>Explanations.</strong> Compare alternatives.</li></ul></details>
<details id="topic-q2"><summary>A question</summary><ul>
<li id="topic-agency" data-cfp-topic><strong>Agency.</strong> Guide inquiry.</li>
<li id="topic-credit" data-cfp-topic><strong>Whose contribution?</strong> Recognize contributions.</li></ul></details>
<details id="topic-q3"><summary>A question</summary><ul>
<li id="topic-understanding" data-cfp-topic><strong>Understanding.</strong> Reflect and learn.</li></ul></details>
<details id="topic-q4"><summary>A question</summary><ul>
<li id="topic-evidence" data-cfp-topic><strong>Evidence.</strong> Examine uncertainty.</li>
<li id="topic-value" data-cfp-topic><strong>What counts?</strong> Consider novelty and value.</li></ul></details>
</body></html>"""


def load_text(text):
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / "cfp.html"
        path.write_text(text, encoding="utf-8")
        return cfp.load_context(path)


class CFPContextTests(unittest.TestCase):
    def test_reads_authored_text_entities_and_parent_questions(self):
        context = load_text(FIXTURE)
        self.assertEqual(set(context), {"scope", "topics", "contribution_types", "version"})
        self.assertEqual(context["scope"], "Discovery across research & practice.\n\nIncomplete inquiry is welcome.")
        self.assertEqual(context["topics"][0], {
            "id": "topic-interpretation", "name": "Interpreting together",
            "description": "Examine A & B as evidence develops.", "question_id": "topic-q1"})
        self.assertEqual(context["topics"][4]["name"], "Whose contribution?")
        self.assertEqual(context["contribution_types"][1]["name"], "Critical perspectives")
        self.assertEqual(context["contribution_types"][0]["description"],
                         context["contribution_types"][1]["description"])
        self.assertEqual(context["version"], "sha256:" + hashlib.sha256(FIXTURE.encode()).hexdigest())

    def test_each_load_uses_current_copy_and_changes_version(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "cfp.html"
            path.write_text(FIXTURE)
            before = cfp.load_context(path)
            path.write_text(FIXTURE.replace("Notice patterns.", "Notice new relationships."))
            after = cfp.load_context(path)
        self.assertEqual(after["topics"][1]["description"], "Notice new relationships.")
        self.assertNotEqual(before["version"], after["version"])

    def test_incomplete_or_ambiguous_grounding_fails(self):
        variants = [
            FIXTURE.replace('id="cfp-overview"', 'id="another-overview"'),
            FIXTURE.replace('id="topic-credit" data-cfp-topic', 'id="topic-credit"'),
            FIXTURE.replace('id="topic-q2"', 'id="other-question"'),
            FIXTURE.replace('critical-perspective"', 'invented-format"'),
            FIXTURE.replace('Position papers and critical perspectives', 'Position papers'),
            FIXTURE.replace('</body>', '<div id="topic-credit"></div></body>'),
        ]
        for text in variants:
            with self.subTest(text=text[-80:]), self.assertRaises(cfp.CFPContextError):
                load_text(text)

    def test_real_cfp_has_all_grounding_markers(self):
        context = cfp.load_context(ROOT / "chi2027/call-for-participation.html")
        self.assertEqual({item["id"] for item in context["topics"]}, set(cfp.TOPIC_IDS))
        self.assertEqual({item["id"] for item in context["contribution_types"]}, set(cfp.CONTRIBUTION_IDS))
        self.assertTrue(context["scope"])


class CFPSuggestionTests(unittest.TestCase):
    def setUp(self):
        self.context = load_text(FIXTURE)
        self.good = {"status": "suggestions", "suggestions": [{
            "topic_id": "topic-interpretation", "contribution_type_ids": ["case-description"],
            "reason": "Your example describes revising an interpretation.",
            "angle": "You could trace what prompted that revision.",
        }], "follow_up": None}

    def test_valid_suggestions_and_honest_empty_results(self):
        self.assertEqual(cfp.validate_suggestions(self.good, self.context), self.good)
        for status in ("needs_detail", "no_clear_connection"):
            result = {"status": status, "suggestions": [],
                      "follow_up": "What question about discovery does your work raise?"}
            self.assertEqual(cfp.validate_suggestions(result, self.context), result)
        self.assertIsNone(cfp.validate_suggestions(
            {"status": "no_clear_connection", "suggestions": []}, self.context)["follow_up"])

    def test_unknown_ids_injected_links_and_malformed_values_are_rejected(self):
        variants = []
        for field, values in {
            "topic_id": ["topic-invented", None, []],
            "contribution_type_ids": [[], ["invented-format"], [None], "case-description",
                                      ["case-description"] * 2,
                                      ["case-description", "position-paper", "work-in-progress"]],
            "reason": [None, [], " ", "x" * 601, "See https://invented.example/", "<script>alert(1)</script>"],
            "angle": [False, "x" * 601, "[Apply here](https://invented.example/)"]
        }.items():
            for value in values:
                data = copy.deepcopy(self.good)
                data["suggestions"][0][field] = value
                variants.append(data)
        extra = copy.deepcopy(self.good)
        extra["suggestions"][0]["url"] = "https://example.com"
        variants.extend([extra, {**self.good, "acceptance_probability": 0.9},
                         {**self.good, "status": "eligible"}, {**self.good, "suggestions": None},
                         {**self.good, "suggestions": self.good["suggestions"] * 4},
                         {**self.good, "suggestions": self.good["suggestions"] * 2},
                         {**self.good, "follow_up": "x" * 301},
                         {**self.good, "follow_up": False},
                         {"status": "suggestions", "suggestions": []},
                         {"status": "needs_detail", "suggestions": [], "follow_up": None},
                         {**self.good, "status": "no_clear_connection"}])
        for data in variants:
            with self.subTest(data=data), self.assertRaises(cfp.CFPResponseError):
                cfp.validate_suggestions(data, self.context)

    def test_schema_uses_current_ids_and_boundary_lengths_are_valid(self):
        schema = cfp.response_schema(self.context)
        properties = schema["properties"]["suggestions"]["items"]["properties"]
        self.assertEqual(properties["topic_id"]["enum"], list(cfp.TOPIC_IDS))
        self.assertEqual(properties["contribution_type_ids"]["items"]["enum"], list(cfp.CONTRIBUTION_IDS))
        data = copy.deepcopy(self.good)
        data["suggestions"][0]["reason"] = "x" * 600
        data["suggestions"][0]["angle"] = "y" * 600
        data["follow_up"] = "z" * 300
        self.assertEqual(cfp.validate_suggestions(data, self.context), data)


if __name__ == "__main__":
    unittest.main()
