"""Draws the pictures that browsers and search engines ask for.

    site/assets/social-card.png      1200 x 630, shown when a link to the site is shared
    site/assets/icon-512.png, icon-192.png, apple-touch-icon.png (180), favicon-48.png

Everything is drawn here from the site's own colours (css/tokens.css, Light theme) and its own
mark (assets/ashesha-mark.svg, the same shapes). The card also shows one real SPHEREx picture of
comet 3I/ATLAS from site/data/pictures, cropped to its square of sky. No outside picture is used.

Run from the repository root:  python tools/make_share_images.py   (needs Pillow)
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "site" / "assets"
COMET = ROOT / "site" / "data" / "pictures" / "3i_atlas" / "all_images" / "2025-12-08_014802_0.82um.png"
COMET_CAPTION = "Comet 3I/ATLAS, seen by SPHEREx on 8 December 2025"

BG, INK, MUTED, POP, WHITE = "#F4EEFA", "#2A1247", "#5B3F86", "#A8327A", "#FFFFFF"
SKY_BOX = (12, 32, 382, 402)   # the square of sky inside a pipeline picture (see css/app.css)


def font(size, bold=False):
    """Atkinson Hyperlegible if this computer has it, otherwise a plain system font."""
    names = (["AtkinsonHyperlegible-Bold.ttf", "segoeuib.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf"] if bold
             else ["AtkinsonHyperlegible-Regular.ttf", "segoeui.ttf", "arial.ttf", "DejaVuSans.ttf"])
    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def rgb(hex_colour):
    h = hex_colour.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def draw_mark(size, background):
    """The Ashesha mark on a square of the given background colour (the SVG's shapes, 68 units)."""
    scale = 4                                  # draw large, then shrink, for smooth edges
    s = size * scale
    k = s / 68.0

    def pt(x, y):
        return ((x + 2) * k, (y + 2) * k)

    img = Image.new("RGB", (s, s), background)
    d = ImageDraw.Draw(img)
    d.polygon([pt(4, 6), pt(16, 6), pt(32, 42), pt(48, 6), pt(60, 6), pt(37, 58), pt(27, 58)], fill=INK)
    d.polygon([pt(1, 20.2), pt(52, 16.6), pt(52, 29.4), pt(1, 25.8)], fill=background)
    # The comet's tail: the pop colour, fading towards the left.
    tail = Image.new("RGB", (s, s), background)
    td = ImageDraw.Draw(tail)
    b, p = rgb(background), rgb(POP)
    x0, x1 = pt(2, 0)[0], pt(52, 0)[0]
    for x in range(int(x0), int(x1) + 1):
        t = (x - x0) / (x1 - x0)
        a = 0.4 + 0.6 * t
        td.line([(x, 0), (x, s)], fill=tuple(round(b[i] + (p[i] - b[i]) * a) for i in range(3)))
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).polygon([pt(2, 21.6), pt(52, 18), pt(52, 28), pt(2, 24.4)], fill=255)
    img.paste(tail, (0, 0), mask)
    d = ImageDraw.Draw(img)
    cx, cy = pt(52, 23)
    d.ellipse([cx - 9 * k, cy - 9 * k, cx + 9 * k, cy + 9 * k], fill=background)
    d.ellipse([cx - 6.5 * k, cy - 6.5 * k, cx + 6.5 * k, cy + 6.5 * k], fill=POP)
    return img.resize((size, size), Image.LANCZOS)


def rounded(img, radius):
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], radius=radius, fill=255)
    out = Image.new("RGBA", img.size)
    out.paste(img, (0, 0), mask)
    return out


def social_card():
    W, H = 1200, 630
    card = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(card)
    # Soft clouds, like the site's Light theme.
    for cx, cy, r in [(980, 70, 46), (1030, 52, 60), (1090, 74, 44)]:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=WHITE)
    d.rounded_rectangle([944, 76, 1128, 112], radius=18, fill=WHITE)

    # Left: the mark, the name and the invitation.
    card.paste(draw_mark(96, BG), (72, 64))
    d.text((184, 70), "Ashesha", font=font(64, True), fill=INK)
    d.text((186, 144), "A sky tool for all · Team Selenites", font=font(26), fill=MUTED)
    d.text((72, 236), "Something in the sky", font=font(60, True), fill=INK)
    d.text((72, 306), "is moving.", font=font(60, True), fill=INK)
    d.text((72, 384), "Can you spot it?", font=font(60, True), fill=POP)
    d.text((72, 486), "Play NASA SPHEREx pictures in date order.", font=font(28), fill=INK)
    d.text((72, 526), "Built for everyone: by keyboard, by ear or by eye.", font=font(28), fill=INK)

    # Right: one real SPHEREx picture of the comet, as the viewer shows it.
    sky = Image.open(COMET).convert("RGB").crop(SKY_BOX).resize((380, 380), Image.NEAREST)
    frame = Image.new("RGB", (404, 404), INK)
    frame.paste(sky, (12, 12))
    card.paste(rounded(frame, 28), (740, 150), rounded(frame, 28))
    d = ImageDraw.Draw(card)
    caption = font(19)
    width = d.textlength(COMET_CAPTION, font=caption)
    d.text((740 + (404 - width) / 2, 566), COMET_CAPTION, font=caption, fill=MUTED)
    card.save(ASSETS / "social-card.png", optimize=True)


def icons():
    for name, size in [("icon-512.png", 512), ("icon-192.png", 192), ("apple-touch-icon.png", 180), ("favicon-48.png", 48)]:
        pad = round(size * 0.14)                 # room around the mark, so a round mask does not clip it
        tile = Image.new("RGB", (size, size), BG)
        tile.paste(draw_mark(size - 2 * pad, BG), (pad, pad))
        tile.save(ASSETS / name, optimize=True)


if __name__ == "__main__":
    social_card()
    icons()
    for f in ["social-card.png", "icon-512.png", "icon-192.png", "apple-touch-icon.png", "favicon-48.png"]:
        print("wrote site/assets/" + f, (ASSETS / f).stat().st_size, "bytes")
