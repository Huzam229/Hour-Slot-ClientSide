from pathlib import Path
from PIL import Image

PUBLIC = Path(__file__).resolve().parents[1] / "public"
mono = Image.open(PUBLIC / "duemet-mark.png").convert("RGBA")


def fit(size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    max_side = int(size * 0.86)
    ratio = min(max_side / mono.width, max_side / mono.height)
    nw = max(1, int(mono.width * ratio))
    nh = max(1, int(mono.height * ratio))
    scaled = mono.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas.paste(scaled, ((size - nw) // 2, (size - nh) // 2), scaled)
    return canvas


sizes = [16, 32, 48]
imgs = [fit(s) for s in sizes]
# Write ICO with multiple sizes embedded
imgs[0].save(
    PUBLIC / "favicon.ico",
    format="ICO",
    sizes=[(s, s) for s in sizes],
    append_images=imgs[1:],
)
print("favicon.ico bytes:", (PUBLIC / "favicon.ico").stat().st_size)
