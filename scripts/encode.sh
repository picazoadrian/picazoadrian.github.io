#!/usr/bin/env bash
# Encodea una pieza de vídeo para el portfolio.
#
#   ./scripts/encode.sh origen.mov 01
#
# Produce en assets/media/:
#   01.webm      VP9 1080p CRF 28, dos pasadas, sin audio   (grid, fuente principal)
#   01.mp4       H.264 1080p CRF 20 de fallback para Safari antiguo
#   01-full.mp4  H.264 a resolución de origen CRF 20        (lightbox a pantalla completa)
#   01-m.mp4     H.264 720 px recortado al 402:486 de la card móvil, CRF 30 (grid en móvil)
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

# Color: que se vea igual que el máster en QuickTime/Fotos en TODOS los navegadores.
# Apple pinta el vídeo bt709 con una curva que levanta los medios tonos (~+10/255);
# Chrome pinta el valor en bruto, más oscuro. Se aplica esa curva a los píxeles
# (apple-bt709.cube, medida en WebKit frente al máster) y al final se etiqueta la
# transferencia como sRGB para que Safari no la vuelva a aplicar encima.
LUT="$ROOT/scripts/apple-bt709.cube"
COLOR="scale=in_color_matrix=bt709:in_range=tv:out_range=pc,format=gbrp,lut1d=file=$LUT,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,"
POSTER_COLOR="scale=in_color_matrix=bt709:in_range=tv,format=gbrp,lut1d=file=$LUT,"

FULL_SCALE=""
[ -n "${FULL_WIDTH:-}" ] && FULL_SCALE=",scale=${FULL_WIDTH}:-2:flags=lanczos"

command -v ffmpeg >/dev/null || { echo "Falta ffmpeg: brew install ffmpeg" >&2; exit 1; }
command -v cwebp >/dev/null || { echo "Falta cwebp: brew install webp" >&2; exit 1; }

echo "→ VP9 (pasada 1/2)"
ffmpeg -y -i "$SRC" ${LOOP[@]+"${LOOP[@]}"} -an -map 0:v:0 -vf "${COLOR}scale=${WIDTH}:-2" \
  -c:v libvpx-vp9 -crf "$CRF" -b:v 0 -row-mt 1 -pass 1 -f null /dev/null

echo "→ VP9 (pasada 2/2)"
ffmpeg -y -i "$SRC" ${LOOP[@]+"${LOOP[@]}"} -an -map 0:v:0 -vf "${COLOR}scale=${WIDTH}:-2" \
  -c:v libvpx-vp9 -crf "$CRF" -b:v 0 -row-mt 1 -pass 2 "$OUT/$NAME.webm"

echo "→ H.264 de fallback"
ffmpeg -y -i "$SRC" ${LOOP[@]+"${LOOP[@]}"} -an -map 0:v:0 -vf "${COLOR}scale=${WIDTH}:-2" \
  -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -movflags +faststart "$OUT/$NAME.mp4"

echo "→ H.264 para móvil"
# La card móvil es vertical (402:486): se recorta el centro, que es lo que el cover
# enseña, y se baja a 720 px. ~1,5 Mbps: dos vídeos a la vez caben en un 4G flojo.
ffmpeg -y -i "$SRC" ${LOOP[@]+"${LOOP[@]}"} -an -map 0:v:0 \
  -vf "${COLOR}crop=ih*402/486:ih,scale=720:-2:flags=lanczos" \
  -c:v libx264 -crf 30 -preset slow -pix_fmt yuv420p -movflags +faststart "$OUT/$NAME-m.mp4"

echo "→ H.264 a resolución completa (lightbox)"
ffmpeg -y -i "$SRC" -an -map 0:v:0 -vf "${COLOR%,}${FULL_SCALE}" \
  -c:v libx264 -crf "$FULL_CRF" -preset slow -profile:v high -level 5.1 -pix_fmt yuv420p \
  -movflags +faststart "$OUT/$NAME-full.mp4"

echo "→ poster"
# El ffmpeg de Homebrew viene sin libwebp: se saca el fotograma en PNG y lo pasa cwebp.
POSTER_PNG="$(mktemp -t poster).png"
ffmpeg -y -i "$SRC" -map 0:v:0 -vf "${POSTER_COLOR}scale=${WIDTH}:-2" -frames:v 1 "$POSTER_PNG"
cwebp -quiet -q 80 "$POSTER_PNG" -o "$OUT/$NAME.webp"
rm -f "$POSTER_PNG"

rm -f ffmpeg2pass-0.log

echo "→ etiqueta de color"
# La transferencia se etiqueta como sRGB, sin recodificar: la curva de Apple ya va
# en los píxeles, y con la etiqueta bt709 Safari la aplicaría otra vez. En MP4
# cuenta el átomo colr del contenedor, no solo el VUI del H.264: se cambian ambos.
TMP="$(mktemp -d)"
for f in "$OUT/$NAME.mp4" "$OUT/$NAME-m.mp4" "$OUT/$NAME-full.mp4"; do
  ffmpeg -v error -y -i "$f" -map 0:v:0 -c copy \
    -bsf:v h264_metadata=transfer_characteristics=13 -color_trc iec61966-2-1 \
    -movflags +faststart+write_colr "$TMP/x.mp4" && mv "$TMP/x.mp4" "$f"
done
ffmpeg -v error -y -i "$OUT/$NAME.webm" -map 0:v:0 -c copy -color_trc iec61966-2-1 "$TMP/x.webm" \
  && mv "$TMP/x.webm" "$OUT/$NAME.webm"
rmdir "$TMP"

echo
echo "Listo. Pesos:"
ls -lh "$OUT/$NAME".{webm,mp4,webp} "$OUT/$NAME-full.mp4" "$OUT/$NAME-m.mp4" | awk '{print "  " $9 "  " $5}'
