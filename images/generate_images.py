#!/usr/bin/env python3
"""
サンプルコントローラー画像生成スクリプト
実際の写真に差し替える際はこのスクリプトは不要です。
"""
from PIL import Image, ImageDraw
import os, sys

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

# ──────────────────────────────────────────────────────────────────────────────
# 共通ヘルパー
# ──────────────────────────────────────────────────────────────────────────────
def rounded_rect(draw, xy, radius, fill, outline=None, width=2):
    x0, y0, x1, y1 = xy
    draw.rectangle([x0 + radius, y0, x1 - radius, y1], fill=fill)
    draw.rectangle([x0, y0 + radius, x1, y1 - radius], fill=fill)
    draw.ellipse([x0, y0, x0 + radius*2, y0 + radius*2], fill=fill)
    draw.ellipse([x1 - radius*2, y0, x1, y0 + radius*2], fill=fill)
    draw.ellipse([x0, y1 - radius*2, x0 + radius*2, y1], fill=fill)
    draw.ellipse([x1 - radius*2, y1 - radius*2, x1, y1], fill=fill)
    if outline:
        draw.arc([x0, y0, x0 + radius*2, y0 + radius*2], 180, 270, fill=outline, width=width)
        draw.arc([x1 - radius*2, y0, x1, y0 + radius*2], 270, 360, fill=outline, width=width)
        draw.arc([x0, y1 - radius*2, x0 + radius*2, y1], 90, 180, fill=outline, width=width)
        draw.arc([x1 - radius*2, y1 - radius*2, x1, y1], 0, 90, fill=outline, width=width)
        draw.line([x0 + radius, y0, x1 - radius, y0], fill=outline, width=width)
        draw.line([x0 + radius, y1, x1 - radius, y1], fill=outline, width=width)
        draw.line([x0, y0 + radius, x0, y1 - radius], fill=outline, width=width)
        draw.line([x1, y0 + radius, x1, y1 - radius], fill=outline, width=width)


def circle(draw, cx, cy, r, fill, outline=None, width=2):
    draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=fill, outline=outline, width=width)


def label(draw, cx, cy, text, color=(200, 200, 210), font=None):
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text((cx - tw//2, cy - th//2), text, fill=color, font=font)


# ──────────────────────────────────────────────────────────────────────────────
# DualSense スタイル (gamepad.png)  800 × 400
# ──────────────────────────────────────────────────────────────────────────────
# ボタン座標（config.js と同じ値を使用）
DS_BUTTONS = {
    # face buttons
    "cross":    (590, 285),
    "circle":   (630, 245),
    "square":   (550, 245),
    "triangle": (590, 205),
    # shoulder
    "L1": (165, 112), "R1": (635, 112),
    "L2": (155,  68), "R2": (645,  68),
    # stick centers
    "L3": (315, 270), "R3": (480, 270),
    # dpad
    "dup":   (225, 197), "ddown": (225, 275),
    "dleft": (186, 236), "dright":(264, 236),
    # misc
    "create":  (330, 183), "options": (470, 183),
    "ps":      (400, 300), "touchpad":(400, 183),
}

def create_dualsense():
    W, H = 800, 400
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    BODY    = (40, 42, 54)
    OUTLINE = (80, 82, 95)
    DARK    = (25, 27, 35)

    # ── グリップ左右 ──
    d.ellipse([ 50, 180, 310, 400], fill=BODY, outline=OUTLINE, width=2)
    d.ellipse([490, 180, 750, 400], fill=BODY, outline=OUTLINE, width=2)
    # ── 中央ボディ ──
    rounded_rect(d, [130, 80, 670, 370], 40, BODY, OUTLINE, 2)

    # ── L2 / R2 トリガー ──
    rounded_rect(d, [95, 45, 230, 90], 12, DARK, OUTLINE, 2)
    label(d, 155, 68, "L2")
    rounded_rect(d, [570, 45, 705, 90], 12, DARK, OUTLINE, 2)
    label(d, 645, 68, "R2")

    # ── L1 / R1 バンパー ──
    rounded_rect(d, [115, 92, 250, 125], 8, (55, 57, 70), OUTLINE, 2)
    label(d, 165, 112, "L1")
    rounded_rect(d, [550, 92, 685, 125], 8, (55, 57, 70), OUTLINE, 2)
    label(d, 635, 112, "R1")

    # ── 方向キー ──
    s = 22
    cx, cy = 225, 236
    for (dx, dy, lbl) in [(0,-39,"↑"),(0,39,"↓"),(-39,0,"←"),(39,0,"→")]:
        d.rectangle([cx+dx-s, cy+dy-s, cx+dx+s, cy+dy+s], fill=(65,68,80), outline=OUTLINE, width=1)
        label(d, cx+dx, cy+dy, lbl, (180,180,200))
    # center cross cutout fill
    d.rectangle([cx-s, cy-s, cx+s, cy+s], fill=(65,68,80), outline=OUTLINE, width=1)

    # ── タッチパッド ──
    rounded_rect(d, [340, 145, 460, 225], 10, (55, 58, 72), (100,102,118), 1)
    label(d, 400, 183, "TOUCH", (110,112,130))

    # ── Create / Options ──
    circle(d, 330, 183, 14, (55,58,72), OUTLINE, 1)
    label(d, 330, 183, "≡", (150,152,170))
    circle(d, 470, 183, 14, (55,58,72), OUTLINE, 1)
    label(d, 470, 183, "☰", (150,152,170))

    # ── PS ボタン ──
    circle(d, 400, 300, 16, (55,58,72), OUTLINE, 1)
    label(d, 400, 300, "PS", (150,152,170))

    # ── 左スティック ──
    circle(d, 315, 270, 42, (60,63,78), OUTLINE, 2)
    circle(d, 315, 270, 22, (75,78,95), None)
    label(d, 315, 270, "L3", (140,142,160))

    # ── 右スティック ──
    circle(d, 480, 270, 42, (60,63,78), OUTLINE, 2)
    circle(d, 480, 270, 22, (75,78,95), None)
    label(d, 480, 270, "R3", (140,142,160))

    # ── フェイスボタン ──
    face = [
        ("×",   590, 285, (50,100,160), (100,180,255)),
        ("○",   630, 245, (140, 50, 50),(255,130,130)),
        ("□",   550, 245, (100, 50,110),(200,140,220)),
        ("△",   590, 205, ( 50,110, 70),(130,220,140)),
    ]
    for lbl, fx, fy, fill, outline in face:
        circle(d, fx, fy, 20, fill, outline, 2)
        label(d, fx, fy, lbl, outline)

    out = os.path.join(OUT_DIR, "gamepad.png")
    img.save(out)
    print(f"Saved {out}")


# ──────────────────────────────────────────────────────────────────────────────
# ファイティングスティック スタイル (fightingstick.png)  800 × 400
# ──────────────────────────────────────────────────────────────────────────────
# ボタン座標（Gamepad API インデックス順）
FS_BUTTONS_POS = [
    # index 0-3 下段
    (370, 268), (450, 252), (530, 252), (610, 268),
    # index 4-7 上段
    (370, 188), (450, 172), (530, 172), (610, 188),
]
FS_EXTRA = {
    "L3":  (175, 215),   # レバー中心（クリック）
    "share":  (240, 345),
    "options":(320, 345),
    "ps":     (400, 345),
    "R1": (670, 160), "R2": (670, 235),
    "R3": (670, 310),
}
# 色テーブル（ボタン 0-7 の色）
FS_COLORS = [
    ((180, 40, 40), (255,100,100)),  # 0 赤
    ((180,120, 30), (255,200, 60)),  # 1 黄
    ((40, 140, 40), (100,220,100)),  # 2 緑
    ((40,  60,170), (100,140,255)),  # 3 青
    ((150, 40,150), (220,120,220)),  # 4 紫
    ((160, 80, 30), (240,150, 80)),  # 5 橙
    ((30, 140,150), ( 80,220,230)),  # 6 青緑
    ((40, 170,170), (100,240,240)),  # 7 シアン
]

def create_fightingstick():
    W, H = 800, 400
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    BODY    = (25, 27, 35)
    PANEL   = (35, 37, 48)
    OUTLINE = (70, 72, 88)

    # ── ボディ ──
    rounded_rect(d, [30, 60, 770, 390], 30, BODY, OUTLINE, 2)

    # ── レバー台座 ──
    circle(d, 175, 215, 75, PANEL, OUTLINE, 2)

    # ── レバー スティック ──
    circle(d, 175, 215, 35, (50, 52, 65), OUTLINE, 2)
    # 棒
    d.rectangle([168, 140, 182, 215], fill=(60,62,78), outline=OUTLINE, width=1)
    # 玉
    circle(d, 175, 140, 20, (70,72,90), OUTLINE, 2)
    label(d, 175, 140, "JOY", (140,142,165))

    # ── ボタン ──
    for i, (bx, by) in enumerate(FS_BUTTONS_POS):
        fill, out = FS_COLORS[i]
        circle(d, bx, by, 28, fill, out, 2)
        label(d, bx, by, str(i), out)

    # ── サイドボタン ──
    for name, (sx, sy) in FS_EXTRA.items():
        if name == "L3":
            continue  # レバーで代用
        if name in ("R1","R2","R3"):
            circle(d, sx, sy, 18, (55,57,72), OUTLINE, 1)
            label(d, sx, sy, name, (150,152,170))
        else:
            circle(d, sx, sy, 14, (55,57,72), OUTLINE, 1)
            label(d, sx, sy, name[:2], (140,142,160))

    out = os.path.join(OUT_DIR, "fightingstick.png")
    img.save(out)
    print(f"Saved {out}")


if __name__ == "__main__":
    create_dualsense()
    create_fightingstick()
    print("Done.")
