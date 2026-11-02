"""
Process Duemet brand logos:
- Remove near-white backgrounds → transparent PNG
- Color variants for light backgrounds
- White/knockout variants for dark / colored backgrounds
- Favicon + PWA icons from the D monogram
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
BRAND = PUBLIC / "brand"
ICONS = PUBLIC / "icons"

WORDMARK_SRC = BRAND / "duemet-logo-01-wordmark-calendar.jpg"
MONOGRAM_SRC = BRAND / "duemet-logo-03-monogram-d.jpg"

# Near-white threshold for chroma-key style removal
WHITE_THRESH = 245
# Navy/dark ink → white for knockout; keep bright blue accents
NAVY_MAX = 90  # channels roughly below this and similar → treat as dark ink
ACCENT_BLUE_MIN_B = 160
ACCENT_BLUE_MAX_RG_DIFF = 80  # B significantly higher than R/G


def remove_white_bg(img: Image.Image, thresh: int = WHITE_THRESH) -> Image.Image:
    rgba = img.convert("RGBA")
    pixels = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if r >= thresh and g >= thresh and b >= thresh:
                pixels[x, y] = (r, g, b, 0)
            else:
                # Soft edge: fade near-white fringe
                m = min(r, g, b)
                if m > 220:
                    alpha = int(255 * (thresh - m) / max(1, thresh - 220))
                    alpha = max(0, min(255, alpha))
                    pixels[x, y] = (r, g, b, alpha)
    return rgba


def trim_transparent(img: Image.Image, pad: int = 12) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(img.width, r + pad)
    b = min(img.height, b + pad)
    return img.crop((l, t, r, b))


def is_accent_blue(r: int, g: int, b: int) -> bool:
    return b >= ACCENT_BLUE_MIN_B and (b - r) >= 40 and (b - g) >= 20


def is_dark_ink(r: int, g: int, b: int) -> bool:
    return r < NAVY_MAX + 40 and g < NAVY_MAX + 50 and b < NAVY_MAX + 80 and not is_accent_blue(r, g, b)


def to_knockout_white(img: Image.Image, keep_accent: bool = True) -> Image.Image:
    """Dark navy → white; optional keep bright blue accents; preserve alpha."""
    rgba = img.convert("RGBA")
    pixels = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            if keep_accent and is_accent_blue(r, g, b):
                # Slightly brighten accent for dark backgrounds
                pixels[x, y] = (min(255, r + 20), min(255, g + 30), min(255, b + 10), a)
            elif is_dark_ink(r, g, b) or (r + g + b) / 3 < 140:
                # Map ink to white, preserve soft alpha
                pixels[x, y] = (255, 255, 255, a)
            else:
                # Mid tones → white-ish
                pixels[x, y] = (255, 255, 255, a)
    return rgba


def fit_square(img: Image.Image, size: int, bg=None) -> Image.Image:
    """Center logo in square canvas. bg=None → transparent."""
    canvas = Image.new("RGBA", (size, size), bg if bg else (0, 0, 0, 0))
    # Scale to fit with padding
    max_side = int(size * 0.82)
    ratio = min(max_side / img.width, max_side / img.height)
    nw, nh = max(1, int(img.width * ratio)), max(1, int(img.height * ratio))
    scaled = img.resize((nw, nh), Image.Resampling.LANCZOS)
    ox = (size - nw) // 2
    oy = (size - nh) // 2
    canvas.paste(scaled, (ox, oy), scaled)
    return canvas


def save_ico(png: Image.Image, path: Path) -> None:
    sizes = [(16, 16), (32, 32), (48, 48)]
    icons = []
    for s in sizes:
        icons.append(fit_square(png, s[0]))
    icons[0].save(
        path,
        format="ICO",
        sizes=[(i.width, i.height) for i in icons],
        append_images=icons[1:],
    )


def main() -> None:
    BRAND.mkdir(parents=True, exist_ok=True)
    ICONS.mkdir(parents=True, exist_ok=True)

    # --- Wordmark (main logo) ---
    word = trim_transparent(remove_white_bg(Image.open(WORDMARK_SRC)))
    word_color = word
    word_white = to_knockout_white(word, keep_accent=True)

    word_color.save(PUBLIC / "duemet-logo.png", "PNG", optimize=True)
    word_white.save(PUBLIC / "duemet-logo-white.png", "PNG", optimize=True)
    word_color.save(BRAND / "duemet-logo.png", "PNG", optimize=True)
    word_white.save(BRAND / "duemet-logo-white.png", "PNG", optimize=True)
    # Back-compat primary path used across app
    word_color.save(PUBLIC / "duemet.png", "PNG", optimize=True)

    # --- Monogram (favicon / mark) ---
    mono = trim_transparent(remove_white_bg(Image.open(MONOGRAM_SRC)))
    mono_color = mono
    mono_white = to_knockout_white(mono, keep_accent=True)

    mono_color.save(PUBLIC / "duemet-mark.png", "PNG", optimize=True)
    mono_white.save(PUBLIC / "duemet-mark-white.png", "PNG", optimize=True)
    mono_color.save(BRAND / "duemet-mark.png", "PNG", optimize=True)
    mono_white.save(BRAND / "duemet-mark-white.png", "PNG", optimize=True)

    # Favicon + touch icons
    fav = fit_square(mono_color, 64)
    save_ico(mono_color, PUBLIC / "favicon.ico")
    fit_square(mono_color, 192).save(ICONS / "icon-192.png", "PNG", optimize=True)
    fit_square(mono_color, 512).save(ICONS / "icon-512.png", "PNG", optimize=True)
    fit_square(mono_color, 180).save(ICONS / "apple-touch-icon.png", "PNG", optimize=True)
    # Also expose PNG favicon for modern browsers
    fit_square(mono_color, 32).save(PUBLIC / "favicon-32.png", "PNG", optimize=True)
    fit_square(mono_color, 16).save(PUBLIC / "favicon-16.png", "PNG", optimize=True)

    print("Wrote:")
    for p in [
        PUBLIC / "duemet.png",
        PUBLIC / "duemet-logo.png",
        PUBLIC / "duemet-logo-white.png",
        PUBLIC / "duemet-mark.png",
        PUBLIC / "duemet-mark-white.png",
        PUBLIC / "favicon.ico",
        PUBLIC / "favicon-32.png",
        ICONS / "icon-192.png",
        ICONS / "icon-512.png",
        ICONS / "apple-touch-icon.png",
    ]:
        print(f"  {p.relative_to(ROOT)} ({p.stat().st_size} bytes) {Image.open(p).size}")


if __name__ == "__main__":
    main()
