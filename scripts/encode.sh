#!/usr/bin/env bash
# Encodea una pieza de vídeo para el portfolio.
#
#   ./scripts/encode.sh origen.mov 01
#
# Produce en assets/media/:
#   01.webm      VP9 1080p CRF 28, dos pasadas, sin audio   (grid, fuente principal)
#   01.mp4       H.264 1080p CRF 20 de fallback para Safari antiguo
#   01-full.mp4  H.264 a resolución de origen CRF 20        (lightbox a pantalla completa)
#   01.webp      poster del primer fotograma
#
# El grid tiene siete vídeos en loop a la vez, así que ahí basta 1080p. El lightbox
# carga aparte la versión a resolución completa: CRF 20 da un SSIM de ~0,99 contra
# el máster (indistinguible) y un clip de 18 s en 4K queda en ~65 MB, por debajo del
# límite de 100 MB por archivo de GitHub. H.264 porque lo decodifica cualquier navegador.
#
# Ajustes opcionales por pieza, para clips que no caben en ese límite:
#
#   LOOP_SECONDS=13.8   el grid usa solo los primeros N segundos (el lightbox, el clip
#                       entero). Conviene cortar justo antes de un cambio de plano.
#   FULL_WIDTH=2560     ancho de la versión del lightbox, en vez de la resolución de origen
#   FULL_CRF=22         calidad de la versión del lightbox
#
#   LOOP_SECONDS=13.8 FULL_WIDTH=2560 FULL_CRF=22 ./scripts/encode.sh largo.mp4 05
set -euo pipefail

SRC="${1:?Falta el vídeo de origen}"
NAME="${2:?Falta el número de pieza, p.ej. 01}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/assets/media"
mkdir -p "$OUT"

WIDTH=1920
CRF=28
FULL_CRF="${FULL_CRF:-20}"

LOOP=()
[ -n "${LOOP_SECONDS:-}" ] && LOOP=(-t "$LOOP_SECONDS")

FULL_VF=()
[ -n "${FULL_WIDTH:-}" ] && FULL_VF=(-vf "scale=${FULL_WIDTH}:-2:flags=lanczos")

command -v ffmpeg >/dev/null || { echo "Falta ffmpeg: brew install ffmpeg" >&2; exit 1; }
command -v cwebp >/dev/null || { echo "Falta cwebp: brew install webp" >&2; exit 1; }

echo "→ VP9 (pasada 1/2)"
ffmpeg -y -i "$SRC" ${LOOP[@]+"${LOOP[@]}"} -an -vf "scale=${WIDTH}:-2" \
  -c:v libvpx-vp9 -crf "$CRF" -b:v 0 -row-mt 1 -pass 1 -f null /dev/null

echo "→ VP9 (pasada 2/2)"
ffmpeg -y -i "$SRC" ${LOOP[@]+"${LOOP[@]}"} -an -vf "scale=${WIDTH}:-2" \
  -c:v libvpx-vp9 -crf "$CRF" -b:v 0 -row-mt 1 -pass 2 "$OUT/$NAME.webm"

echo "→ H.264 de fallback"
ffmpeg -y -i "$SRC" ${LOOP[@]+"${LOOP[@]}"} -an -vf "scale=${WIDTH}:-2" \
  -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -movflags +faststart "$OUT/$NAME.mp4"

echo "→ H.264 a resolución completa (lightbox)"
ffmpeg -y -i "$SRC" -an ${FULL_VF[@]+"${FULL_VF[@]}"} \
  -c:v libx264 -crf "$FULL_CRF" -preset slow -profile:v high -level 5.1 -pix_fmt yuv420p \
  -movflags +faststart "$OUT/$NAME-full.mp4"

echo "→ poster"
# El ffmpeg de Homebrew viene sin libwebp: se saca el fotograma en PNG y lo pasa cwebp.
POSTER_PNG="$(mktemp -t poster).png"
ffmpeg -y -i "$SRC" -vf "scale=${WIDTH}:-2" -frames:v 1 "$POSTER_PNG"
cwebp -quiet -q 80 "$POSTER_PNG" -o "$OUT/$NAME.webp"
rm -f "$POSTER_PNG"

rm -f ffmpeg2pass-0.log

echo
echo "Listo. Pesos:"
ls -lh "$OUT/$NAME".{webm,mp4,webp} "$OUT/$NAME-full.mp4" | awk '{print "  " $9 "  " $5}'
