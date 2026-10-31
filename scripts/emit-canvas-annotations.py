"""Build a private Canvas note bundle from an audited question crosswalk.

Run import-canvas-annotations.py first. Review tmp/canvas-import/audit.json; optional
tmp/canvas-import/overrides.json maps Canvas node IDs to question IDs or null.
Only confidently matched notes are emitted. The JSON and source assets are ignored;
prepare-protected.mjs encrypts them before the static site is built.
"""

from __future__ import annotations

from collections import defaultdict
from io import BytesIO
import json
from pathlib import Path
import re

from PIL import Image, ImageOps

import importlib.util


ROOT = Path(__file__).resolve().parents[1]
VAULT_DIR = Path("S:/0_Obsidian/my_study_library/考研/Marginnote")
WORK = ROOT / "tmp/canvas-import"
OUTPUT = ROOT / "src/lib/ustc843-canvas-notes.json"
ASSETS = ROOT / "public/843/canvas"
TAG_RE = re.compile(r"#错因/([^\s#]+)")


def load_helpers():
    spec = importlib.util.spec_from_file_location("canvas_import", ROOT / "scripts/import-canvas-annotations.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def export_image(source: Path, destination: Path, handwriting: bool):
    if destination.exists():
        return
    if source.suffix.lower() == ".svg":
        import cairosvg
        image = Image.open(BytesIO(cairosvg.svg2png(url=str(source))))
    else:
        image = Image.open(source)
    with image:
        image = ImageOps.exif_transpose(image).convert("RGBA")
        image.thumbnail((3000, 4000), Image.Resampling.LANCZOS)
        destination.parent.mkdir(parents=True, exist_ok=True)
        image.save(destination, "WEBP", lossless=handwriting, quality=92, method=5)


def main():
    helpers = load_helpers()
    audit = json.loads((WORK / "audit.json").read_text(encoding="utf-8"))
    reviewed_path = ROOT / "scripts/canvas-annotation-overrides.json"
    overrides = json.loads(reviewed_path.read_text(encoding="utf-8"))
    overrides_path = WORK / "overrides.json"
    if overrides_path.exists():
        overrides.update(json.loads(overrides_path.read_text(encoding="utf-8")))
    bank = helpers.bank_questions()
    valid = {question["id"]: question for questions in bank.values() for question in questions}
    nodes, _, _ = helpers.load_tree(VAULT_DIR / "843真题套卷.canvas")
    records = defaultdict(list)
    year_notes = defaultdict(list)
    skipped = []
    failures = []
    for row in audit:
        candidates = row["candidates"]
        best = candidates[0] if candidates else None
        margin = best[0] - candidates[1][0] if best and len(candidates) > 1 else 1
        automatic = best and best[0] >= 0.52 and margin >= 0.17
        override = overrides.get(row["nodeId"], overrides.get(row["nodeId"][:8], best[1] if automatic else None))
        year_only = isinstance(override, dict) and override.get("yearOnly") is True
        include_excerpt = isinstance(override, dict) and override.get("includeExcerpt") is True
        question_id = override.get("questionId") if isinstance(override, dict) else override
        if question_id is None and not year_only:
            skipped.append({"year": row["year"], "nodeId": row["nodeId"], "title": row["title"], "candidates": candidates, "ocr": row["ocr"][:150]})
            continue
        if not year_only and (question_id not in valid or valid[question_id]["year"] != row["year"]):
            raise ValueError(f"Crosswalk points to a different year or unknown question: {row['nodeId']} -> {question_id}")
        texts = []
        images = []
        tags = []
        for node_id in row["nodeIds"]:
            node = nodes[node_id]
            raw = node.get("text", "")
            cleaned = helpers.text_without_assets(raw)
            if node_id == row["nodeId"]:
                cleaned = "\n".join(cleaned.splitlines()[1:]).strip()
            elif cleaned.startswith("## 无标题卡片"):
                cleaned = "\n".join(cleaned.splitlines()[1:]).strip()
            if cleaned:
                texts.append(cleaned)
            tags.extend(TAG_RE.findall(raw))
            for alt, relative in re.findall(r"!\[([^]]*)\]\((attachments/[^)]+)\)", raw):
                if alt.lower() == "excerpt" and node_id == row["nodeId"] and not include_excerpt:
                    continue  # The bank already contains the question image.
                source = VAULT_DIR / relative
                if not source.exists():
                    failures.append(str(source))
                    continue
                import hashlib
                stem = hashlib.sha256(relative.encode("utf-8")).hexdigest()[:20]
                destination = ASSETS / f"{stem}.webp"
                handwriting = "handwriting" in alt.lower() or source.suffix.lower() == ".svg"
                try:
                    export_image(source, destination, handwriting)
                    images.append({"path": f"/843/canvas/{destination.name}", "label": "手写批注" if handwriting else "补充材料"})
                except Exception as exc:
                    failures.append(f"{relative}: {exc}")
        title = TAG_RE.sub("", row["title"]).strip(" #；;，, ")
        if not title or title == "无标题卡片":
            title = "整卷手写批注" if year_only else "一刷错因" if tags else "原始批注"
        # Bare question excerpts do not constitute a personal annotation.
        if not texts and not images and not tags and title == "原始批注":
            continue
        entry = {
            "nodeId": row["nodeId"], "title": title, "text": "\n\n".join(texts),
            "tags": list(dict.fromkeys(tags)), "deepLink": row["deepLink"], "images": list({image["path"]: image for image in images}.values()),
        }
        if year_only:
            year_notes[row["year"]].append(entry)
        else:
            records[question_id].append(entry)
    if failures:
        raise RuntimeError(f"{len(failures)} attachment(s) failed; first: {failures[0]}")
    bundle = {"version": 1, "source": "843真题套卷.canvas", "years": sorted({valid[id]["year"] for id in records} | set(year_notes)),
              "records": dict(sorted(records.items())), "yearNotes": dict(sorted(year_notes.items()))}
    OUTPUT.write_text(json.dumps(bundle, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (WORK / "skipped.json").write_text(json.dumps(skipped, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Emitted {sum(map(len, records.values()))} question notes for {len(records)} questions across {len(bundle['years'])} years; {sum(map(len, year_notes.values()))} year notes; {len(skipped)} unmatched excerpts")
    print(f"Handwritten/supplementary images: {len(list(ASSETS.glob('*.webp')))}")


if __name__ == "__main__":
    main()
