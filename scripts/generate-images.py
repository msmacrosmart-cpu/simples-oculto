#!/usr/bin/env python3
"""
Gera/otimiza as imagens do Simples Oculto.

O que este script faz
---------------------
1. Otimiza `images/hero-mystic.jpg` (capa do site e base do og:image).
2. Otimiza as capas de `images/articles/` e cria variantes WebP responsivas
   (-480, -768, -1200) usadas no `srcset` dos cartões/artigos.
3. Gera `images/og-image.jpg` (1200x630) para Open Graph / Twitter.
4. Gera a marca e os ícones a partir de `images/logo.png` (se existir):
   `images/logo.svg` não é gerado — ele é manual; os PNGs de favicon são:
   favicon-16.png, favicon-32.png, apple-touch-icon.png.

Requisitos
----------
    python3 -m venv .venv && .venv/bin/pip install pillow
    python3 scripts/generate-images.py

Observação: a logo de origem deve ser um PNG com fundo transparente e
proporção aproximada de 4:1 (ex.: 800x200). Troque `images/logo.png` e
rode este script novamente para atualizar o favicon em todos os tamanhos.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
except ImportError:  # pragma: no cover
    sys.exit("Pillow não instalado: pip install pillow")

ROOT = Path(__file__).resolve().parent.parent
IMAGES = ROOT / "images"
ARTICLES = IMAGES / "articles"

ACCENT = (251, 191, 36)      # #FBBF24 — amarelo de "Oculto"
LIGHT = (250, 250, 250)      # #FAFAFA
DARK = (9, 9, 11)            # #09090b

FONT_SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"
FONT_SERIF_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
FONT_SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_SANS_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def font(path: str, size: int):
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def save_jpeg(img: Image.Image, dest: Path, max_width: int, quality: int = 80) -> None:
    img = img.convert("RGB")
    if img.width > max_width:
        img = img.resize((max_width, round(img.height * max_width / img.width)), Image.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "JPEG", quality=quality, optimize=True, progressive=True)
    print(f"  • {dest.relative_to(ROOT)}  {img.width}x{img.height}  {dest.stat().st_size // 1024} KB")


def save_webp(img: Image.Image, dest: Path, width: int, quality: int = 78) -> None:
    h = round(img.height * width / img.width)
    resized = img.convert("RGB").resize((width, h), Image.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    resized.save(dest, "WEBP", quality=quality, method=5)
    print(f"  • {dest.relative_to(ROOT)}  {width}x{h}  {dest.stat().st_size // 1024} KB")


def optimize_articles() -> None:
    print("Capas dos artigos:")
    for src in sorted(ARTICLES.glob("*.jpg")):
        if src.stem.endswith(("-480", "-768", "-1200")):
            continue
        img = Image.open(src)
        save_jpeg(img, src, max_width=1200, quality=80)
        img = Image.open(src)
        for w in (480, 768, 1200):
            if w <= img.width:
                save_webp(img, src.with_name(f"{src.stem}-{w}.webp"), w)


def optimize_hero() -> None:
    print("Capa do site:")
    hero = IMAGES / "hero-mystic.jpg"
    if hero.exists():
        save_jpeg(Image.open(hero), hero, max_width=1400, quality=78)


def build_og_image() -> None:
    print("og-image.jpg:")
    hero = IMAGES / "hero-mystic.jpg"
    dest = IMAGES / "og-image.jpg"
    W, H = 1200, 630
    canvas = Image.new("RGB", (W, H), DARK)
    if hero.exists():
        bg = Image.open(hero).convert("RGB")
        scale = max(W / bg.width, H / bg.height)
        bg = bg.resize((round(bg.width * scale), round(bg.height * scale)), Image.LANCZOS)
        left = (bg.width - W) // 2
        top = (bg.height - H) // 2
        canvas.paste(bg.crop((left, top, left + W, top + H)))
        canvas = canvas.filter(ImageFilter.GaussianBlur(1.5))
    # véu escuro para garantir contraste do texto
    veil = Image.new("RGBA", (W, H), (9, 9, 11, 0))
    draw_veil = ImageDraw.Draw(veil)
    for i in range(H):
        alpha = int(215 * (i / H) ** 1.4)
        draw_veil.line([(0, i), (W, i)], fill=(9, 9, 11, alpha))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), veil).convert("RGB")

    draw = ImageDraw.Draw(canvas)
    f_big = font(FONT_SERIF_BOLD, 92)
    f_small = font(FONT_SANS, 34)
    f_tag = font(FONT_SANS_BOLD, 26)

    # linha de acento
    draw.rectangle([80, 150, 180, 158], fill=ACCENT)

    draw.text((80, 190), "Simples", font=f_big, fill=LIGHT)
    w_simples = draw.textlength("Simples ", font=f_big)
    draw.text((80 + w_simples, 190), "Oculto", font=f_big, fill=ACCENT)
    draw.text(
        (80, 320),
        "Tecnologia, curiosidades, esoterismo e mistérios",
        font=f_small,
        fill=(212, 212, 216),
    )
    draw.text(
        (80, 380),
        "explicados com profundidade e responsabilidade editorial.",
        font=f_small,
        fill=(161, 161, 170),
    )
    draw.text((80, 500), "SIMPLESOCULTO", font=f_tag, fill=ACCENT)

    # moldura
    draw.rectangle([40, 40, W - 40, H - 40], outline=(63, 63, 70), width=2)
    dest.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(dest, "JPEG", quality=82, optimize=True, progressive=True)
    print(f"  • {dest.relative_to(ROOT)}  {W}x{H}  {dest.stat().st_size // 1024} KB")


def build_icons() -> None:
    print("Favicon / ícones:")
    logo = IMAGES / "logo.png"
    if not logo.exists():
        print("  ! images/logo.png não encontrado — ícones não foram gerados.")
        print("    Coloque a logo em images/logo.png e rode este script novamente.")
        return
    src = Image.open(logo).convert("RGBA")
    # Logos horizontais (marca + nome) não funcionam em favicon: quando a
    # proporção passa de 2:1 usamos apenas a área quadrada da esquerda,
    # que é onde costuma ficar o símbolo.
    if src.width / src.height > 2:
        src = src.crop((0, 0, src.height, src.height))
    # recorta o espaço transparente ao redor da marca
    bbox = src.getbbox()
    if bbox:
        src = src.crop(bbox)

    sizes = {
        "favicon-16.png": 16,
        "favicon-32.png": 32,
        "favicon-64.png": 64,
        "apple-touch-icon.png": 180,
        "android-chrome-192.png": 192,
        "android-chrome-512.png": 512,
    }
    for name, size in sizes.items():
        dest = IMAGES / name
        if size >= 180:
            # ícone quadrado com a marca centralizada e respiro nas bordas
            canvas = Image.new("RGBA", (size, size), DARK + (255,))
            inner = int(size * 0.78)
            thumb = src.copy()
            thumb.thumbnail((inner, inner), Image.LANCZOS)
            canvas.paste(thumb, ((size - thumb.width) // 2, (size - thumb.height) // 2), thumb)
        else:
            thumb = src.copy()
            thumb.thumbnail((size, size), Image.LANCZOS)
            canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
            canvas.paste(thumb, ((size - thumb.width) // 2, (size - thumb.height) // 2), thumb)
        dest.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(dest, "JPEG", quality=82, optimize=True, progressive=True)
        print(f"  • {dest.relative_to(ROOT)}  {size}x{size}  {dest.stat().st_size // 1024} KB")


if __name__ == "__main__":
    os.chdir(ROOT)
    optimize_hero()
    optimize_articles()
    build_og_image()
    build_icons()
    print("\nConcluído.")
