#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 4 ]]; then
  echo "usage: $0 <aseprite-appimage> <palette.gpl> <raw-sheet-dir> <new-indexed-dir>" >&2
  exit 2
fi

aseprite=$(realpath "$1")
palette=$(realpath "$2")
source_dir=$(realpath "$3")
output_dir=$(realpath -m "$4")
[[ -x "$aseprite" ]] || { echo "Aseprite is not executable: $aseprite" >&2; exit 3; }
[[ -f "$palette" ]] || { echo "palette not found: $palette" >&2; exit 3; }
[[ -d "$source_dir" ]] || { echo "source directory not found: $source_dir" >&2; exit 3; }
if [[ -d "$output_dir" ]] && [[ -n "$(find "$output_dir" -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
  echo "refusing to overwrite populated directory $output_dir" >&2
  exit 4
fi

mkdir -p "$output_dir"
count=0
for source in "$source_dir"/*.png; do
  [[ -f "$source" ]] || continue
  target="$output_dir/$(basename "$source")"
  APPIMAGE_EXTRACT_AND_RUN=1 "$aseprite" --batch "$source" \
    --palette "$palette" \
    --dithering-algorithm none \
    --color-mode indexed \
    --save-as "$target"
  count=$((count + 1))
done

echo "indexed_sheets=$count output=$output_dir"
