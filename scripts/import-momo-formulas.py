"""Read the reviewed Momo workbook and preserve card IDs and source rows."""
import argparse
import hashlib
import json
import re
from pathlib import Path
import openpyxl

TAG = re.compile(r'\[([PTEF])#([^#]*)#')

def convert(text):
    output = ''
    offset = 0
    while match := TAG.search(text, offset):
        output += text[offset:match.start()]
        depth = 1
        end = match.end()
        while end < len(text) and depth:
            if text[end] == '[': depth += 1
            elif text[end] == ']': depth -= 1
            end += 1
        if depth: raise ValueError(f'Unbalanced markup: {text[match.start():]}')
        kind, style = match.groups()
        body = text[match.end():end-1]
        if kind == 'E': result = '\n\n$$\n' + body.strip() + '\n$$\n\n'
        else:
            body = convert(body)
            if kind == 'P':
                level = '## ' if 'H1' in style else '### ' if 'H2' in style else ''
                result = '\n\n' + level + body.strip().strip('*') + '\n\n'
            elif kind == 'T': result = '**' + body + '**' if 'B' in style or '!' in style else body
            else: result = '**' + body + '**'
        output += result
        offset = end
    return output + text[offset:]

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', required=True)
    args = parser.parse_args()
    source = Path(args.source)
    workbook = openpyxl.load_workbook(source, read_only=True, data_only=True)
    sheet = workbook.active
    cards = []
    for index, (card_id, chapter, raw) in enumerate(sheet.values, 1):
        if index == 1: continue
        if not raw: continue
        # Exported content uses literal newline tokens. Do not damage \\neq, \\nu, etc.
        text = re.sub(r'\\n(?![a-zA-Z])', '\n', raw)
        markdown = re.sub(r'\n{3,}', '\n\n', convert(text)).strip()
        lines = markdown.splitlines()
        assert lines[0].startswith('## '), (index, lines[0])
        title = lines[0][3:]
        body = '\n'.join(lines[1:]).strip()
        assert not TAG.search(body)
        cards.append(dict(id=card_id or "momo-" + hashlib.sha256((chapter + raw).encode()).hexdigest()[:16], originalId=card_id, chapter=chapter, title=title, content=body, sourceRow=index))
    assert len(cards) == index - 1
    assert len({c['id'] for c in cards}) == len(cards)
    root = Path(__file__).resolve().parents[1]
    data = dict(source=source.name, sheet=sheet.title, sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(), cards=cards)
    (root/'src/lib/ustc843-formulas.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Imported {len(cards)} cards in {len(set(c["chapter"] for c in cards))} chapters.')
