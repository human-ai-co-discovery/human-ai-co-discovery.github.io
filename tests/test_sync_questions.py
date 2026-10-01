import contextlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location(
    "sync_questions", Path(__file__).resolve().parents[1] / "scripts/sync_questions.py")
sync = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(sync)

CATEGORY = {"id": "category-id", "name": "Q&A", "slug": "q-a", "isAnswerable": True}


def repository(**fields):
    return {"nameWithOwner": sync.REPOSITORY, "url": sync.BASE_URL, "isPrivate": False,
            **fields}


def question(number=1, **fields):
    return {"number": number, "title": "A research question", "bodyText": "  One\n question  ",
            "url": f"{sync.BASE_URL}/discussions/{number}", "author": {"login": "researcher"},
            "createdAt": "2026-10-01T10:00:00Z", "updatedAt": "2026-10-01T11:00:00Z",
            "comments": {"totalCount": 2}, **fields}


class QuestionSyncTests(unittest.TestCase):
    def test_card_is_minimal_null_safe_and_bounded(self):
        card = sync.question_card(question(bodyText="\n" + "发现 " * 200,
                                           author=None, bodyHTML="private extra field"))
        self.assertEqual(len(card["excerpt"]), 280)
        self.assertNotIn("\n", card["excerpt"])
        self.assertIsNone(card["author"])
        self.assertEqual(set(card), {"number", "title", "excerpt", "url", "author",
                                     "createdAt", "updatedAt", "comments"})
        self.assertEqual(card["comments"], 2)

    def test_only_exact_repository_discussion_urls_are_exported(self):
        for url in ["https://example.com/discussions/1", sync.BASE_URL + "/issues/1",
                    sync.BASE_URL + "/discussions/2", sync.BASE_URL + "/discussions/1?x=y",
                    sync.BASE_URL + "/discussions/1#comment", sync.BASE_URL + ".evil/discussions/1"]:
            with self.subTest(url=url), self.assertRaises(sync.SyncError):
                sync.question_card(question(url=url))

    def test_malformed_fields_are_rejected(self):
        for fields in [{"number": True}, {"title": None}, {"bodyText": None},
                       {"comments": {"totalCount": -1}}, {"comments": {"totalCount": True}},
                       {"author": {"login": 5}}, {"updatedAt": "yesterday"}]:
            with self.subTest(fields=fields), self.assertRaises(sync.SyncError):
                sync.question_card(question(**fields))

    def test_empty_category_is_success_but_missing_category_is_error(self):
        self.assertEqual(sync.choose_category(repository(
            discussionCategories={"nodes": [CATEGORY]})), CATEGORY)
        data = sync.snapshot(repository(discussions={"nodes": []}), CATEGORY)
        self.assertEqual(data["questions"], [])
        self.assertIs(data["private"], False)
        self.assertEqual(data["discussion_url"], sync.BASE_URL + "/discussions/categories/q-a")
        self.assertEqual(data["new_question_url"], sync.BASE_URL + "/discussions/new?category=q-a")
        with self.assertRaisesRegex(sync.SyncError, "Q&A category is unavailable"):
            sync.choose_category(repository(discussionCategories={"nodes": []}))
        with self.assertRaises(sync.SyncError):
            sync.snapshot(repository(discussions={"nodes": None}), CATEGORY)

    def test_order_is_deterministic_and_duplicate_records_fail(self):
        items = [question(1), question(2)]
        first = sync.snapshot(repository(discussions={"nodes": items}), CATEGORY)
        second = sync.snapshot(repository(discussions={"nodes": list(reversed(items))}), CATEGORY)
        self.assertEqual(first, second)
        self.assertEqual([item["number"] for item in first["questions"]], [2, 1])
        self.assertNotIn("generatedAt", first)
        with self.assertRaises(sync.SyncError):
            sync.snapshot(repository(discussions={"nodes": items + [question(1)]}), CATEGORY)

    def test_fetch_rejects_api_errors_and_uncertain_privacy(self):
        responses = [{"errors": [{"message": "denied"}], "data": {"repository": repository()}},
                     {"data": {"repository": None}},
                     {"data": {"repository": repository(isPrivate=None)}},
                     {"data": {"repository": repository(url="https://example.com")}}]
        for payload in responses:
            with self.subTest(payload=payload), patch.object(sync.subprocess, "run", return_value=
                    subprocess.CompletedProcess([], 0, json.dumps(payload), "")):
                with self.assertRaises(sync.SyncError):
                    sync.fetch(sync.CATEGORIES_QUERY)

    def test_fetch_uses_read_only_graphql_and_does_not_export_credentials(self):
        payload = {"data": {"repository": repository()}}
        with patch.object(sync.subprocess, "run", return_value=
                          subprocess.CompletedProcess([], 0, json.dumps(payload), "")) as run:
            result = sync.fetch(sync.QUESTIONS_QUERY, categoryId=CATEGORY["id"])
        command = run.call_args.args[0]
        self.assertEqual(command[:3], ["gh", "api", "graphql"])
        self.assertTrue(sync.QUESTIONS_QUERY.startswith("query"))
        self.assertNotIn("mutation", sync.QUESTIONS_QUERY)
        self.assertNotIn("token", result)

    def test_failed_fetch_preserves_previous_snapshot(self):
        for failure in [sync.SyncError("GitHub request failed"), sync.SyncError("GraphQL error")]:
            with tempfile.TemporaryDirectory() as directory:
                output = Path(directory) / "questions.json"
                output.write_text("previous snapshot\n")
                with patch.object(sync, "fetch", side_effect=failure), self.assertRaises(sync.SyncError):
                    sync.sync(output)
                self.assertEqual(output.read_text(), "previous snapshot\n")

    def test_invalid_response_preserves_previous_snapshot_and_success_writes_json(self):
        categories = repository(discussionCategories={"nodes": [CATEGORY]})
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "questions.json"
            output.write_text("previous snapshot\n")
            bad = repository(discussions={"nodes": [question(url="https://example.com")]})
            with patch.object(sync, "fetch", side_effect=[categories, bad]), self.assertRaises(sync.SyncError):
                sync.sync(output)
            self.assertEqual(output.read_text(), "previous snapshot\n")
            empty = repository(discussions={"nodes": []})
            with patch.object(sync, "fetch", side_effect=[categories, empty]), contextlib.redirect_stdout(io.StringIO()):
                sync.sync(output)
            data = json.loads(output.read_text())
            self.assertEqual(data["questions"], [])
            self.assertIs(data["private"], False)
            self.assertEqual(list(output.parent.iterdir()), [output])

    def test_private_sync_only_reads_categories_and_never_persists_private_content(self):
        private_repo = repository(isPrivate=True, discussionCategories={"nodes": [CATEGORY]},
                                  discussions={"nodes": [question(title="Private title",
                                                                  bodyText="Confidential body")]})
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "questions.json"
            with patch.object(sync, "fetch", return_value=private_repo) as fetch, contextlib.redirect_stdout(io.StringIO()):
                data = sync.sync(output)
            fetch.assert_called_once_with(sync.CATEGORIES_QUERY)
            self.assertIs(data["private"], True)
            self.assertEqual(data["questions"], [])
            self.assertNotIn("Private title", output.read_text())
            self.assertNotIn("Confidential body", output.read_text())

    def test_visibility_change_to_private_suppresses_content(self):
        categories = repository(discussionCategories={"nodes": [CATEGORY]})
        private_repo = repository(isPrivate=True, discussions={"nodes": [question()]})
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "questions.json"
            with patch.object(sync, "fetch", side_effect=[categories, private_repo]), contextlib.redirect_stdout(io.StringIO()):
                data = sync.sync(output)
            self.assertIs(data["private"], True)
            self.assertEqual(data["questions"], [])
            self.assertNotIn("A research question", output.read_text())


if __name__ == "__main__":
    unittest.main()
