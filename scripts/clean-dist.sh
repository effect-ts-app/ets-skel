#!/bin/bash

for d in `find dist -type d | grep -v dist$`
do
  src_d="$1${d#dist/}"
  if [ ! -d "$src_d" ]; then
    echo "Removing $d"
    rm -rf $d
  fi
done

for f in `find dist -type f | grep .js$`
do
  src_f="$1${f#dist/}"
  src_f="${src_f%.js}.ts"
  raw="${f%.js}"
  if [ ! -f "$src_f" ]; then
    echo "Removing $raw.js $raw.js.map $raw.d.ts $raw.d.ts.map"
    rm -f $raw.js $raw.js.map $raw.d.ts $raw.d.ts.map
  fi
done
