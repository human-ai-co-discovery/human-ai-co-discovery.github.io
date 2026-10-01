#!/usr/bin/env python3
"""Export the workshop's Q&A discussions using authenticated, read-only gh calls."""

import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

REPOSITORY = "human-ai-co-discovery/human-ai-co-discovery.github.io"
BASE_URL = f"https://github.com/{REPOSITORY}"
OUTPUT = Path(__file__).resolve().parents[1] / "chi2027/data/questions.json"
CATEGORIES_QUERY = """query {
  repository(owner: "human-ai-co-discovery", name: "human-ai-co-discovery.github.io") {
    nameWithOwner isPrivate url
    discussionCategories(first: 100) { nodes { id name slug isAnswerable } }
  }
}"""
QUESTIONS_QUERY = """query($categoryId: ID!) {
  repository(owner: "human-ai-co-discovery", name: "human-ai-co-discovery.github.io") {
    nameWithOwner isPrivate url
    discussions(first: 20, categoryId: $categoryId,
                orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes {
        number title bodyText url author { login } createdAt updatedAt
        comments { totalCount }
      }
    }
  }
}"""


class SyncError(Exception):
    """A failed fetch or invalid response; the existing snapshot is preserved."""


def fetch(query, **variables):
    command = ["gh", "api", "graphql", "-f", f"query={query}"]
    for name, value in variables.items():
        command.extend(["-f", f"{name}={value}"])
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=60)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise SyncError("Could not run the authenticated GitHub read request.") from error
    if result.returncode:
        raise SyncError("GitHub request failed; check gh authentication and repository access.")
    try:
        response = json.loads(result.stdout)
    except (TypeError, ValueError) as error:
        raise SyncError("GitHub returned invalid JSON.") from error
    if not isinstance(response, dict) or response.get("errors"):
        raise SyncError("GitHub returned a GraphQL error.")
    data = response.get("data")
    repo = data.get("repository") if isinstance(data, dict) else None
    if (not isinstance(repo, dict) or repo.get("nameWithOwner") != REPOSITORY
            or repo.get("url") != BASE_URL or type(repo.get("isPrivate")) is not bool):
        raise SyncError("Missing or unexpected repository identity or visibility.")
    return repo


def choose_category(repo):
    connection = repo.get("discussionCategories")
    nodes = connection.get("nodes") if isinstance(connection, dict) else None
    if not isinstance(nodes, list):
        raise SyncError("GitHub did not return discussion categories.")
    matches = [category for category in nodes if isinstance(category, dict)
               and category.get("name") == "Q&A" and category.get("slug") == "q-a"
               and category.get("isAnswerable") is True]
    if len(matches) != 1 or not isinstance(matches[0].get("id"), str) or not matches[0]["id"]:
        raise SyncError("The default Q&A category is unavailable; no snapshot was written.")
    return matches[0]


def question_card(item):
    if not isinstance(item, dict):
        raise SyncError("Invalid discussion record.")
    number = item.get("number")
    if type(number) is not int or number < 1 or item.get("url") != f"{BASE_URL}/discussions/{number}":
        raise SyncError("A discussion URL is outside the exact repository allowlist.")
    for field in ("title", "bodyText", "createdAt", "updatedAt"):
        if not isinstance(item.get(field), str):
            raise SyncError(f"Invalid discussion {field}.")
    for field in ("createdAt", "updatedAt"):
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", item[field]):
            raise SyncError(f"Invalid discussion {field} timestamp.")
    author = item.get("author")
    if author is not None and not isinstance(author, dict):
        raise SyncError("Invalid discussion author.")
    login = author.get("login") if author else None
    if login is not None and not isinstance(login, str):
        raise SyncError("Invalid discussion author login.")
    comments = item.get("comments")
    count = comments.get("totalCount") if isinstance(comments, dict) else None
    if type(count) is not int or count < 0:
        raise SyncError("Invalid discussion comment count.")
    return {
        "number": number, "title": item["title"],
        "excerpt": " ".join(item["bodyText"].split())[:280], "url": item["url"],
        "author": login, "createdAt": item["createdAt"], "updatedAt": item["updatedAt"],
        "comments": count,
    }


def snapshot(repo, category):
    connection = repo.get("discussions")
    # Private content must never enter a versioned snapshot, including if
    # visibility changed between the category and discussion requests.
    nodes = [] if repo["isPrivate"] else (connection.get("nodes") if isinstance(connection, dict) else None)
    if not isinstance(nodes, list) or len(nodes) > 20:
        raise SyncError("GitHub did not return the requested discussion list.")
    questions = [question_card(item) for item in nodes]
    if len({item["number"] for item in questions}) != len(questions):
        raise SyncError("GitHub returned duplicate discussion records.")
    questions.sort(key=lambda item: (item["updatedAt"], item["number"]), reverse=True)
    return {
        "repository": REPOSITORY, "private": repo["isPrivate"],
        "discussion_url": f"{BASE_URL}/discussions/categories/{category['slug']}",
        "new_question_url": f"{BASE_URL}/discussions/new?category={category['slug']}",
        "questions": questions,
    }


def sync(output=OUTPUT):
    repo = fetch(CATEGORIES_QUERY)
    category = choose_category(repo)
    if not repo["isPrivate"]:
        repo = fetch(QUESTIONS_QUERY, categoryId=category["id"])
    data = snapshot(repo, category)
    encoded = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=output.parent,
                                         delete=False) as handle:
            temporary = handle.name
            handle.write(encoded)
        os.replace(temporary, output)
    finally:
        if temporary and os.path.exists(temporary):
            os.unlink(temporary)
    if data["private"]:
        print("Exported private repository metadata; discussion content was not saved.")
    else:
        print(f"Exported {len(data['questions'])} Q&A questions (public repository).")
    print(f"Category: {category['name']} / {category['slug']} / {category['id']}")
    print(f"Discussion URL: {data['discussion_url']}")
    print(f"New question URL: {data['new_question_url']}")
    return data


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    try:
        sync(args.output)
    except (SyncError, OSError) as error:
        print(f"Question sync failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
