#!/usr/bin/env bash
# Encodea una pieza de vídeo para el portfolio.
#
#   ./scripts/encode.sh origen.mov 01
#
# Produce en assets/media/:
#   01.webm  VP9 1080p CRF 32, dos pasadas, sin audio   (fuente principal)
#   01.mp4   H.264 de fallback para Safari antiguo
#   01.webp  poster del primer fotograma
#
# Un solo archivo por pieza sirve al grid y al lightbox, así que 1080p es el suelo:
# por debajo se ve blando a pantalla completa.
set -euo pipefail

SRC="${1:?Falta el vídeo de origen}"
NAME="${2:?Falta el número de pieza, p.ej. 01}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/assets/media"
mkdir -p "$OUT"

WIDTH=1920
CRF=32

command -v ffmpeg >/dev/null || { echo "Falta ffmpeg: brew install ffmpeg" >&2; exit 1; }

echo "→ VP9 (pasada 1/2)"
ffmpeg -y -i "$SRC" -an -vf "scale=${WIDTH}:-2" \
  -c:v libvpx-vp9 -crf "$CRF" -b:v 0 -row-mt 1 -pass 1 -f null /dev/null

echo "→ VP9 (pasada 2/2)"
ffmpeg -y -i "$SRC" -an -vf "scale=${WIDTH}:-2" \
  -c:v libvpx-vp9 -crf "$CRF" -b:v 0 -row-mt 1 -pass 2 "$OUT/$NAME.webm"

echo "→ H.264 de fallback"
ffmpeg -y -i "$SRC" -an -vf "scale=${WIDTH}:-2" \
  -c:v libx264 -crf 23 -preset slow -pix_fmt yuv420p -movflags +faststart "$OUT/$NAME.mp4"

echo "→ poster"
ffmpeg -y -i "$SRC" -vf "scale=${WIDTH}:-2" -frames:v 1 -q:v 80 "$OUT/$NAME.webp"

rm -f ffmpeg2pass-0.log

echo
echo "Listo. Pesos:"
ls -lh "$OUT/$NAME".{webm,mp4,webp} | awk '{print "  " $9 "  " $5}'
