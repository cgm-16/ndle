"""Spec-fit matrix for https://github.com/cgm-16/ndle/blob/3ccd37b/docs/research/game-modes/README.md.

Data is transcribed from each draft's own §1 "Spec collisions" table:
2 = the proposed mode needs the line amended, 1 = only an optional variant
or a stated wish needs it, 0 = untouched. Writes spec-fit.svg to argv[1].
"""
import sys
from xml.sax.saxutils import escape

GROUPS = [
    ("EXPLICIT LINES · NEED A SCOPE RULING", "#e2795f",
     ["÷ modes", "Seeds", "Saved", "Curves", "Score", "Rulings"]),
    ("RULES THE MODE REWRITES", "#f7f0e2",
     ["Draw", "Answer", "Overflow", "End"]),
    ("PRESENTATION", "#f7f0e2", ["Motion", "Keys"]),
]

# Column order: ÷ Seeds Saved Curves Score Rulings | Draw Answer Overflow End | Motion Keys
ROWS = [
    ("01", "Market", "장터",          [0, 0, 0, 0, 0, 0,  2, 0, 0, 2,  0, 2]),
    ("02", "Factor", "팩터",          [2, 0, 0, 0, 0, 0,  2, 2, 0, 0,  0, 2]),
    ("03", "Puzzle", "묘수풀이",      [0, 1, 0, 0, 0, 1,  2, 2, 0, 2,  0, 0]),
    ("04", "Table for Two", "둘이서", [0, 0, 0, 0, 0, 2,  2, 2, 2, 2,  0, 2]),
    ("05", "Card", "카드",            [0, 0, 0, 2, 0, 1,  2, 0, 0, 2,  0, 0]),
    ("06", "Riichi", "리치",          [0, 0, 0, 0, 2, 0,  0, 0, 2, 0,  0, 2]),
    ("07", "Kiln", "가마",            [0, 0, 0, 0, 0, 0,  0, 2, 2, 2,  1, 2]),
    ("08", "Well", "우물",            [0, 0, 0, 0, 0, 2,  2, 2, 2, 2,  2, 2]),
    ("09", "Four Winds", "네 바람",   [0, 0, 0, 2, 0, 2,  2, 2, 2, 2,  1, 2]),
    ("10", "Dojo", "도장",            [0, 0, 1, 1, 0, 0,  2, 2, 2, 2,  0, 0]),
    ("11", "Suits", "무늬",           [0, 0, 0, 0, 0, 2,  2, 2, 0, 2,  2, 2]),
]

FOOT = [
    "÷ modes: product.md §1.17 division modes · Seeds: AGENTS.md seed line, §1.17 seeded/replayable runs ·",
    "Saved: AGENTS.md persistence, §1.17 saved history · Curves: §1.17 difficulty curves · Score: §1.5 unweighted score ·",
    "Rulings: §1.1 competition note, AGENTS.md tutorials, endless-polish §2, decisions.md locks · Draw §1.2–1.3 ·",
    "Answer & rewards §1.4–1.6 · Overflow §1.7 · End: capacity and end of run §1.7a–1.8 · Motion: ui-i18n §1.12 · Keys §1.11",
]

UI = "'Zen Kaku Gothic New','Helvetica Neue',Arial,'Apple SD Gothic Neo','Noto Sans KR',sans-serif"
W, LABEL_W, LEFT, RIGHT, GAP, COL = 800, 180, 24, 20, 14, 44
TOP_ROWS, ROW_H = 168, 34
H = TOP_ROWS + ROW_H * len(ROWS) + 110


def main(out_path: str) -> None:
    missing = [r[1] for r in ROWS if r[3] is None]
    if missing:
        sys.exit(f"rows still missing data: {', '.join(missing)}")
    for _, name, _, cells in ROWS:
        assert len(cells) == 12 and set(cells) <= {0, 1, 2}, name

    xs, group_spans, x = [], [], LEFT + LABEL_W
    for gi, (_, _, cols) in enumerate(GROUPS):
        start = x
        for _ in cols:
            xs.append(x + COL / 2)
            x += COL
        group_spans.append((start, x))
        x += GAP
    assert x - GAP <= W - RIGHT, "matrix wider than the canvas"
    colour_of = [g[1] for g in GROUPS for _ in g[2]]

    desc = "; ".join(
        f"{n} {name}: " + ", ".join(
            f"{lab} {'needed' if v == 2 else 'variant or wish'}"
            for lab, v in zip([c for g in GROUPS for c in g[2]], cells) if v)
        for n, name, _, cells in ROWS)
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-labelledby="t d">',
         '<title id="t">Spec fit: which lines each draft would move</title>',
         f'<desc id="d">{escape(desc)}</desc>',
         f'<rect width="{W}" height="{H}" fill="#071711"/>',
         f'<rect x="8" y="8" width="{W - 16}" height="{H - 16}" rx="14" fill="#0b211b"/>',
         f'<text x="{LEFT}" y="44" font-family="{UI}" font-size="20" font-weight="600" fill="#f7f0e2">Which lines each draft would move</text>',
         f'<text x="{LEFT}" y="68" font-family="{UI}" font-size="12.5" fill="#f7f0e2" fill-opacity="0.72">From each draft’s own §1. Every draft also needs the ordinary new-mode text: mode count, title select, copy, share.</text>']
    # Legend
    ly = 96
    o.append(f'<circle cx="{LEFT + 7}" cy="{ly}" r="7" fill="#f7f0e2"/>')
    o.append(f'<text x="{LEFT + 20}" y="{ly + 4}" font-family="{UI}" font-size="12" fill="#f7f0e2">the proposed mode needs it amended</text>')
    o.append(f'<circle cx="{LEFT + 262}" cy="{ly}" r="6.2" fill="none" stroke="#f7f0e2" stroke-width="1.6"/>')
    o.append(f'<text x="{LEFT + 275}" y="{ly + 4}" font-family="{UI}" font-size="12" fill="#f7f0e2">only an optional variant or a stated wish needs it</text>')
    o.append(f'<circle cx="{LEFT + 588}" cy="{ly}" r="1.6" fill="#f7f0e2" fill-opacity="0.3"/>')
    o.append(f'<text x="{LEFT + 598}" y="{ly + 4}" font-family="{UI}" font-size="12" fill="#f7f0e2">untouched</text>')
    # Group headers and column labels
    for (gname, gcol, cols), (gx0, gx1) in zip(GROUPS, group_spans):
        o.append(f'<text x="{(gx0 + gx1) / 2}" y="132" text-anchor="middle" font-family="{UI}" font-size="9.5" letter-spacing="1" fill="{gcol}">{escape(gname)}</text>')
        o.append(f'<line x1="{gx0 + 2}" x2="{gx1 - 2}" y1="139" y2="139" stroke="{gcol}" stroke-opacity="0.55"/>')
    for cx, lab in zip(xs, [c for g in GROUPS for c in g[2]]):
        o.append(f'<text x="{cx}" y="158" text-anchor="middle" font-family="{UI}" font-size="10" fill="#f7f0e2" fill-opacity="0.72">{escape(lab)}</text>')
    # Rows
    for i, (num, name, ko, cells) in enumerate(ROWS):
        cy = TOP_ROWS + ROW_H * i + ROW_H / 2
        if i % 2 == 0:
            o.append(f'<rect x="{LEFT - 8}" y="{cy - ROW_H / 2}" width="{W - LEFT - RIGHT + 8}" height="{ROW_H}" fill="#14342a" fill-opacity="0.45"/>')
        label = f"{num}  {name}" + (f" · {ko}" if ko else "")
        o.append(f'<text x="{LEFT}" y="{cy + 4.5}" font-family="{UI}" font-size="13" fill="#f7f0e2">{escape(label)}</text>')
        for cx, v, col in zip(xs, cells, colour_of):
            if v == 2:
                o.append(f'<circle cx="{cx}" cy="{cy}" r="7" fill="{col}"/>')
            elif v == 1:
                o.append(f'<circle cx="{cx}" cy="{cy}" r="6.2" fill="none" stroke="{col}" stroke-width="1.6"/>')
            else:
                o.append(f'<circle cx="{cx}" cy="{cy}" r="1.6" fill="#f7f0e2" fill-opacity="0.3"/>')
    fy = TOP_ROWS + ROW_H * len(ROWS) + 28
    for j, line in enumerate(FOOT):
        o.append(f'<text x="{LEFT}" y="{fy + 17 * j}" font-family="{UI}" font-size="10.5" fill="#f7f0e2" fill-opacity="0.55">{escape(line)}</text>')
    o.append('</svg>')
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(o) + "\n")


if __name__ == "__main__":
    main(sys.argv[1])
