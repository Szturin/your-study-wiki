"""Import the reviewed 843 corpus; preserve typeset math and figures without OCR.

Usage: python -X utf8 scripts/import-ustc843.py --source <vault 真题/latex>
Only question regions of the existing typeset PDF are rendered, never OCR'd.
"""
import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path

import fitz
from PIL import Image, ImageChops

parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
source = args.source
name = '中科大843信号与系统1997-2026年真题分类习题册'
work = source / '_build/classified_20261022'
units = json.loads((work / 'classified.json').read_text(encoding='utf-8'))
index = json.loads((source / f'{name}_题目索引.json').read_text(encoding='utf-8'))
meta = {u['id']: u for u in index}
assert len(units) == len(meta) == 345 and {u['id'] for u in units} == set(meta)
pdf_path = source / f'最终PDF/无水印版/{name}_2026-10-23分类优化版.pdf'
pdf = fitz.open(pdf_path)
names = pdf.resolve_names()
log = (work / 'classified.log').read_text(encoding='utf-8')
heights = {uid: float(h) * 72 / 72.27 for uid, h in re.findall(r'QUESTION-HEIGHT ([\d-]+): ([\d.]+)pt', log)}
assets = root / 'public/843/questions'
assets.mkdir(parents=True, exist_ok=True)
chapters = {}
audit = []
for unit in units:
    uid = unit['id']
    info = meta[uid]
    anchor = names[f'q-{uid}']
    page = pdf[anchor['page']]
    assert anchor['page'] + 1 == info['page'], (uid, anchor, info['page'])
    y = page.rect.height - anchor['to'][1]
    bars = [d['rect'] for d in page.get_drawings() if d.get('fill') and d['rect'].width > 300 and abs(d['rect'].y0 - y) < 2]
    assert len(bars) == 1, (uid, y, bars)
    bar = bars[0]
    # Every exercise was boxed as one unit by the LaTeX source. Its measured
    # height includes the header. No heuristic splitting of equations/figures.
    end = y + heights[uid]
    next_bars = [d['rect'].y0 for d in page.get_drawings() if d.get('fill') and d['rect'].width > 300 and d['rect'].y0 > y + 2]
    if next_bars:
        end = min(end, min(next_bars) - 1)
    end = min(end, page.rect.height - 55)
    clip = fitz.Rect(bar.x0 - 1, bar.y1 + 3, bar.x1 + 1, end)
    assert clip.height > 5, (uid, clip)
    pix = page.get_pixmap(matrix=fitz.Matrix(2.5, 2.5), clip=clip, alpha=False)
    image = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
    bbox = ImageChops.difference(image, Image.new('RGB', image.size, 'white')).getbbox()
    assert bbox, uid
    # Keep a stable full-width baseline; trim vertical whitespace only.
    image = image.crop((0, max(0, bbox[1] - 8), image.width, min(image.height, bbox[3] + 8)))
    image.save(assets / f'{uid}.webp', quality=94, method=6)
    text = page.get_text(clip=clip).strip()
    chapter = chapters.setdefault(unit['chapter'], {
        'id': f"843-ch{unit['chapter']}", 'name': unit['chapter_title'],
        'summary': '中科大843历年真题', 'knowledgeNodes': [], 'typeGroups': [],
    })
    group_id = f"843-{unit['category']}"
    group = next((g for g in chapter['typeGroups'] if g['id'] == group_id), None)
    if group is None:
        group = {'id': group_id, 'name': unit['section_title'], 'description': '', 'difficulty': '综合',
                 'years': '1997—2026', 'questionCount': 0, 'knowledgePoints': [unit['section_title']], 'questions': []}
        chapter['typeGroups'].append(group)
        chapter['knowledgeNodes'].append({'id': group_id, 'name': unit['section_title'], 'summary': ''})
    group['questions'].append({
        'id': uid, 'title': unit['source'], 'year': str(unit['year']), 'source': unit['source'],
        'knowledgePoint': unit['section_title'], 'prompt': text, 'latex': unit['tex'], 'note': info['editorial_note'],
        'strategy': [], 'mastery': 'unknown', 'paperMajor': unit['major'], 'paperMinor': unit['minor'],
        'image': f'/843/questions/{uid}.webp', 'imageWidth': image.width, 'imageHeight': image.height,
        'sourcePage': info['page'], 'proofMarker': info['proof_marker'],
    })
    group['questionCount'] += 1
    audit.append({'id': uid, 'page': info['page'], 'clip': list(clip), 'width': image.width, 'height': image.height,
                  'texSha256': hashlib.sha256(unit['tex'].encode()).hexdigest()})

data = {'id': 'signal-system', 'name': '843 信号与系统', 'shortName': '843',
        'description': '中国科学技术大学 · 1997—2026年真题', 'chapters': list(chapters.values())}
target = root / 'src/lib/ustc843-bank.json'
target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
papers = root / 'public/843/papers'
papers.mkdir(parents=True, exist_ok=True)
for year in range(1997, 2027):
    shutil.copyfile(source / f'最终PDF/无水印版/中科大843信号与系统{year}年真题.pdf', papers / f'{year}.pdf')
shutil.copyfile(pdf_path, papers / 'classified.pdf')
(root / 'docs/843-import-audit.json').write_text(json.dumps({
    'sourcePdf': pdf_path.name, 'sourceSha256': hashlib.sha256(pdf_path.read_bytes()).hexdigest(),
    'units': len(units), 'years': list(range(1997, 2027)), 'questions': audit,
    'knownGaps': ['2025年第一大题第7、8小题缺失；第4小题现有来源仅A/B/C。'],
}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Imported {len(units)} questions, {len(chapters)} chapters, 30 annual PDFs.')
