"""Audit MarginNote Canvas annotations against the private 843 question bank.

This is a local preparation tool. Its audit and OCR cache stay under ignored tmp/;
neither the Canvas nor its plaintext annotations belong in the static export.
"""

from __future__ import annotations

import argparse
from collections import defaultdict
from difflib import SequenceMatcher
import html
import json
from pathlib import Path
import re
import unicodedata


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CANVAS = Path("S:/0_Obsidian/my_study_library/考研/Marginnote/843真题套卷.canvas")
IMAGE_RE = re.compile(r"!\[[^]]*\]\((attachments/[^)]+)\)")
LINK_RE = re.compile(r"marginnote4app://note/[A-Za-z0-9-]+")
YEARS = re.compile(r"(?<!\d)((?:19|20)\d{2})(?!\d)")
CHINESE_NUMBER = {char: index for index, char in enumerate("一二三四五六七八九十", 1)}


def text_without_assets(text: str) -> str:
    text = IMAGE_RE.sub("", text)
    text = LINK_RE.sub("", text)
    text = re.sub(r"<[^>]*>", "", text)
    return html.unescape(text).strip()


def normalized(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).lower()
    return "".join(char for char in text if char.isalnum() or "\u4e00" <= char <= "\u9fff")


def ngram_score(left: str, right: str) -> float:
    if not left or not right:
        return 0.0
    def grams(value: str) -> set[str]:
        return {value[index:index + 2] for index in range(len(value) - 1)}
    a, b = grams(left), grams(right)
    return 2 * len(a & b) / (len(a) + len(b)) if a and b else 0.0


def similarity(source: str, target: str) -> float:
    a, b = normalized(source), normalized(target)
    if not a or not b:
        return 0.0
    return 0.72 * ngram_score(a, b) + 0.28 * SequenceMatcher(None, a, b).ratio()


def ordinal_hint(text: str) -> tuple[int | None, int | None]:
    text = text.lstrip("# \n\t")
    major = re.match(r"([一二三四五六七八九十])\s*[、.．]", text)
    if major:
        return CHINESE_NUMBER[major.group(1)], None
    minor = re.match(r"(\d{1,2})\s*[.．、]", text)
    if minor:
        return 1, int(minor.group(1))
    return None, None


def load_tree(canvas_path: Path):
    canvas = json.loads(canvas_path.read_text(encoding="utf-8"))
    nodes = {node["id"]: node for node in canvas["nodes"]}
    children: dict[str, list[str]] = defaultdict(list)
    parents: dict[str, str] = {}
    for edge in canvas["edges"]:
        children[edge["fromNode"]].append(edge["toNode"])
        parents[edge["toNode"]] = edge["fromNode"]
    roots = [node_id for node_id in nodes if node_id not in parents]
    if len(roots) != 1:
        raise ValueError(f"Expected one Canvas root, found {len(roots)}")
    return nodes, children, roots[0]


def question_nodes(nodes: dict, children: dict, root: str):
    years = []
    for first in children[root]:
        heading = text_without_assets(nodes[first].get("text", "")).splitlines()[0]
        match = YEARS.search(heading)
        if match and len(YEARS.findall(heading)) == 1 and children[first]:
            years.append((match.group(1), first))
            continue
        # The 1997–2001 branches sit under an older-papers collection.
        for candidate in children[first]:
            heading = text_without_assets(nodes[candidate].get("text", "")).splitlines()[0]
            match = YEARS.search(heading)
            if match and len(YEARS.findall(heading)) == 1 and children[candidate]:
                years.append((match.group(1), candidate))
    seen = set()
    for year, year_node in years:
        if year_node in seen:
            continue
        seen.add(year_node)
        for node_id in children[year_node]:
            yield year, node_id


def descendants(node_id: str, children: dict) -> list[str]:
    result = [node_id]
    for child in children[node_id]:
        result.extend(descendants(child, children))
    return result


def bank_questions():
    bank = json.loads((ROOT / "src/lib/ustc843-bank.json").read_text(encoding="utf-8"))
    by_year: dict[str, list[dict]] = defaultdict(list)
    for chapter in bank["chapters"]:
        for group in chapter["typeGroups"]:
            for question in group["questions"]:
                by_year[question["year"]].append(question)
    return by_year


def ocr_excerpt(path: Path, cache: dict, engine) -> str:
    key = str(path)
    if key in cache:
        return cache[key]
    if not path.exists():
        cache[key] = ""
        return ""
    result, _ = engine(str(path))
    cache[key] = " ".join(item[1] for item in result) if result else ""
    return cache[key]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--canvas", type=Path, default=DEFAULT_CANVAS)
    args = parser.parse_args()
    from rapidocr_onnxruntime import RapidOCR

    work = ROOT / "tmp/canvas-import"
    work.mkdir(parents=True, exist_ok=True)
    cache_path = work / "ocr-cache.json"
    cache = json.loads(cache_path.read_text(encoding="utf-8")) if cache_path.exists() else {}
    engine = RapidOCR()
    nodes, children, root = load_tree(args.canvas)
    questions = bank_questions()
    audit = []
    for year, node_id in question_nodes(nodes, children, root):
        node = nodes[node_id]
        text = node.get("text", "")
        image = next((relative for relative in IMAGE_RE.findall(text) if relative.lower().endswith(".png")), "")
        ocr = ocr_excerpt(args.canvas.parent / image, cache, engine) if image else ""
        if image:
            cache_path.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
        title = text_without_assets(text).splitlines()[0].lstrip("# ")
        major, minor = ordinal_hint(ocr)
        scored = []
        for candidate in questions[year]:
            base = max(similarity(ocr, candidate.get("prompt", "")), similarity(ocr, candidate.get("latex", "")))
            if major is not None and candidate.get("paperMajor") == major:
                base += 0.12
                if minor is not None and candidate.get("paperMinor") == minor:
                    base += 0.13
            if re.search(rf"\b{year}\s*[一二三四五六七八九十]\b", title):
                if CHINESE_NUMBER.get(re.search(r"[一二三四五六七八九十]", title).group()) == candidate.get("paperMajor"):
                    base += 0.12
            scored.append((round(base, 4), candidate["id"], candidate.get("source", "")))
        scored.sort(reverse=True)
        subtree = descendants(node_id, children)
        note_text = "\n\n".join(text_without_assets(nodes[child].get("text", "")) for child in subtree).strip()
        assets = list(dict.fromkeys(asset for child in subtree for asset in IMAGE_RE.findall(nodes[child].get("text", ""))))
        audit.append({"year": year, "nodeId": node_id, "title": title, "ocr": ocr, "candidates": scored[:3],
                      "note": note_text, "assets": assets, "nodeIds": subtree,
                      "deepLink": node.get("ostraconMnUrl", "")})
    (work / "audit.json").write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Audited {len(audit)} Canvas excerpt nodes across {len(set(row['year'] for row in audit))} years")
    for year in sorted(set(row["year"] for row in audit)):
        rows = [row for row in audit if row["year"] == year]
        strong = sum(bool(row["candidates"]) and row["candidates"][0][0] >= 0.45 and (len(row["candidates"]) < 2 or row["candidates"][0][0] - row["candidates"][1][0] >= 0.15) for row in rows)
        print(year, len(rows), "strong", strong)


if __name__ == "__main__":
    main()
