#!/bin/bash

#brew install librsvg

for size in 16 19 38 48 128; do
  rsvg-convert \
    --width "$size" \
    --height "$size" \
    ./rocket.svg \
    --output "../icons/icon_${size}.png"
done