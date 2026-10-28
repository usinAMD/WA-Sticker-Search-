#!/usr/bin/env python3
"""Generate a small, controlled Hindi/Hinglish sticker image benchmark set."""
from __future__ import annotations

import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "stickers"
W, H = 560, 360
FONT_DEV = "/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf"
FONT_LATIN = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_LATIN_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
INK = (41, 35, 38, 255)
PAPER = (255, 249, 240, 255)

CASES = [
    {"id": "dev-laugh-01", "text": "हँसी रोक नहीं!", "concept": "laugh", "queries": ["hansi", "हंसी", "laugh"], "difficulty": "clear", "lines": ["हँसी रोक नहीं!"]},
    {"id": "dev-good-02", "text": "अच्छा जी!", "concept": "good", "queries": ["achha", "accha", "अच्छा"], "difficulty": "clear", "lines": ["अच्छा जी!"]},
    {"id": "dev-question-03", "text": "कहाँ हो?", "concept": "question", "queries": ["kahan", "कहाँ", "where"], "difficulty": "medium", "lines": ["कहाँ हो?"]},
    {"id": "dev-chai-04", "text": "चाय टाइम", "concept": "chai", "queries": ["chai", "tea", "चाय"], "difficulty": "clear", "lines": ["चाय टाइम"]},
    {"id": "dev-happy-05", "text": "बहुत खुश हूँ", "concept": "happy", "queries": ["khush", "खुशी", "happy"], "difficulty": "medium", "lines": ["बहुत खुश हूँ"]},
    {"id": "dev-angry-06", "text": "गुस्सा मत दिलाओ", "concept": "angry", "queries": ["gussa", "गुस्सा", "angry"], "difficulty": "medium", "lines": ["गुस्सा मत", "दिलाओ"]},
    {"id": "roman-happy-07", "text": "Aaj mood mast hai", "concept": "happy", "queries": ["mast", "happy", "mood"], "difficulty": "clear", "lines": ["Aaj mood mast hai"]},
    {"id": "roman-question-08", "text": "Yaar, kya scene hai?", "concept": "question", "queries": ["scene", "yaar", "kya"], "difficulty": "medium", "lines": ["Yaar, kya scene hai?"]},
    {"id": "roman-good-09", "text": "Accha! Bilkul sahi.", "concept": "good", "queries": ["acha", "achha", "sahi"], "difficulty": "clear", "lines": ["Accha! Bilkul sahi."]},
    {"id": "roman-no-10", "text": "Nope, abhi nahi", "concept": "no", "queries": ["nahi", "नहीं", "nope"], "difficulty": "medium", "lines": ["Nope, abhi nahi"]},
    {"id": "mixed-party-11", "text": "चलो, पार्टी करें!", "concept": "celebration", "queries": ["party", "celebrate", "पार्टी"], "difficulty": "medium", "lines": ["चलो, पार्टी", "करें!"]},
    {"id": "roman-laugh-12", "text": "Has has ke pagal!", "concept": "laugh", "queries": ["hasna", "hasi", "laugh"], "difficulty": "clear", "lines": ["Has has ke pagal!"]},
]
PALETTES = [
    ((248, 219, 140, 255), (255, 249, 240, 255), (83, 66, 113, 255)),
    ((190, 231, 214, 255), (255, 252, 243, 255), (41, 35, 38, 255)),
    ((203, 184, 242, 255), (255, 249, 240, 255), (87, 65, 115, 255)),
    ((242, 107, 79, 255), (255, 249, 240, 255), (41, 35, 38, 255)),
    ((245, 194, 202, 255), (255, 250, 245, 255), (77, 50, 55, 255)),
    ((168, 206, 231, 255), (249, 252, 255, 255), (35, 51, 67, 255)),
]


def font_for(text: str, size: int) -> ImageFont.FreeTypeFont:
    path = FONT_DEV if any("\u0900" <= ch <= "\u097f" for ch in text) else FONT_LATIN
    return ImageFont.truetype(path, size=size)


def fit_font(draw: ImageDraw.ImageDraw, text: str, max_width: int, preferred: int) -> ImageFont.FreeTypeFont:
    for size in range(preferred, 23, -1):
        font = font_for(text, size)
        if draw.textbbox((0, 0), text, font=font, language="hi")[2] <= max_width:
            return font
    return font_for(text, 24)


def draw_sticker(case: dict, index: int) -> Image.Image:
    accent, surface, text_color = PALETTES[index % len(PALETTES)]
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    card_box = (37, 36, W - 37, H - 36)
    draw.rounded_rectangle((card_box[0] + 8, card_box[1] + 10, card_box[2] + 8, card_box[3] + 10), radius=58, fill=(41, 35, 38, 35))
    draw.rounded_rectangle(card_box, radius=58, fill=surface, outline=INK, width=5)
    # A restrained corner peel and two small motion marks give each fixture a sticker-like silhouette.
    draw.ellipse((W - 115, 57, W - 76, 96), fill=accent)
    draw.line((67, H - 72, 94, H - 91), fill=accent, width=7)
    draw.line((92, H - 62, 115, H - 76), fill=accent, width=7)
    lines = case["lines"]
    preferred = 55 if len(lines) == 1 else 49
    fonts = [fit_font(draw, line, W - 150, preferred) for line in lines]
    heights = [draw.textbbox((0, 0), line, font=font, language="hi")[3] - draw.textbbox((0, 0), line, font=font, language="hi")[1] for line, font in zip(lines, fonts)]
    gap = 7
    total_h = sum(heights) + gap * (len(lines) - 1)
    y = (H - total_h) // 2 - 2
    for line, font, line_h in zip(lines, fonts, heights):
        box = draw.textbbox((0, 0), line, font=font, language="hi")
        x = (W - (box[2] - box[0])) // 2 - box[0]
        # Crisp small outline echoes a cut-paper sticker border without occluding glyph detail.
        draw.text((x, y - box[1]), line, font=font, fill=text_color, stroke_width=0, language="hi")
        y += line_h + gap
    # Alternate a few realistic image degradations / capture sizes, without obscuring ground truth.
    if index in {2, 5, 7, 9}:
        angle = {2: -2.0, 5: 1.4, 7: -1.2, 9: 2.0}[index]
        canvas = canvas.rotate(angle, resample=Image.Resampling.BICUBIC, expand=False)
    if index in {5, 9}:
        canvas = canvas.resize((420, 270), Image.Resampling.LANCZOS).resize((W, H), Image.Resampling.BICUBIC)
    if index == 9:
        canvas = canvas.filter(ImageFilter.GaussianBlur(radius=0.35))
        canvas = ImageEnhance.Contrast(canvas).enhance(0.94)
    return canvas


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {"dataset": "Stickly Hindi + Hinglish controlled OCR fixture set", "synthetic": True, "count": len(CASES), "cases": []}
    for index, case in enumerate(CASES):
        filename = f"{case['id']}.png"
        draw_sticker(case, index).save(OUT / filename, optimize=True)
        manifest["cases"].append({**case, "file": f"stickers/{filename}"})
    (ROOT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {len(CASES)} fixtures in {OUT}")


if __name__ == "__main__":
    main()
