#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 <prototype-render-root> <new-output.png>" >&2
  exit 2
fi

render_root=$(realpath "$1")
output=$(realpath -m "$2")
if [[ -e "$output" ]]; then
  echo "refusing to overwrite $output" >&2
  exit 3
fi

variants=(hollow_ghost veiled_specter shackled_poltergeist)
darkness_percent=(15 65 90)
frames=(01 01 04)
actions=(hover hover primary_attack)
review_tmp=$(mktemp -d)
trap 'rm -rf "$review_tmp"' EXIT

mkdir -p "$(dirname "$output")"
magick -size 396x246 xc:'#141821' \
  -fill '#1b202b' -draw 'rectangle 0,0 395,81 rectangle 0,164 395,245' \
  -fill '#191e28' -draw 'rectangle 0,82 395,163' \
  -stroke '#202634' -strokewidth 1 \
  -draw 'line 0,32 396,32 line 0,64 396,64 line 0,114 396,114 line 0,146 396,146 line 0,196 396,196 line 0,228 396,228' \
  -draw 'line 32,0 32,246 line 64,0 64,246 line 96,0 96,246 line 132,0 132,246 line 164,0 164,246 line 196,0 196,246 line 228,0 228,246 line 264,0 264,246 line 296,0 296,246 line 328,0 328,246 line 360,0 360,246' \
  "$review_tmp/background.png"

for row in 0 1 2; do
  for column in 0 1 2; do
    variant=${variants[$column]}
    action=${actions[$row]}
    frame=${frames[$row]}
    darkness=${darkness_percent[$row]}
    source="$render_root/$variant/$action/color/front_${frame}.png"
    shadow="$render_root/$variant/$action/shadow/front_${frame}.png"
    glow="$render_root/$variant/$action/glow/front_${frame}.png"
    for required in "$source" "$shadow" "$glow"; do
      [[ -f "$required" ]] || { echo "missing $required" >&2; exit 4; }
    done

    magick "$source" -filter point -resize 44x44 \
      -fill 'rgb(2,4,9)' -colorize "${darkness}%" \
      -channel A -evaluate multiply 0.78 +channel "$review_tmp/body.png"
    magick "$shadow" -filter point -resize 44x44 \
      -channel A -evaluate multiply 0.30 +channel "$review_tmp/shadow.png"
    magick "$glow" -filter point -resize 44x44 \
      -fill '#9f91ff' -colorize 100 \
      -channel A -evaluate multiply 0.52 +channel "$review_tmp/glow-core.png"
    magick "$review_tmp/glow-core.png" -channel A -blur 0x1.2 -evaluate multiply 0.32 +channel "$review_tmp/glow-soft.png"

    x=$((column * 132 + 44))
    y=$((row * 82 + 19))
    magick "$review_tmp/background.png" \
      "$review_tmp/shadow.png" -geometry "+${x}+$((y + 4))" -compose over -composite \
      "$review_tmp/body.png" -geometry "+${x}+${y}" -compose over -composite \
      "$review_tmp/glow-soft.png" -geometry "+${x}+${y}" -compose screen -composite \
      "$review_tmp/glow-core.png" -geometry "+${x}+${y}" -compose screen -composite \
      "$review_tmp/background-next.png"
    mv "$review_tmp/background-next.png" "$review_tmp/background.png"
  done
done

magick "$review_tmp/background.png" -define png:color-type=6 "$output"
echo "$output"
