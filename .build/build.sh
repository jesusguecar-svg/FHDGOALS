#!/usr/bin/env bash
# Builds FHDProductionCommandCenter.jsx into a single self-contained HTML page
# (React + recharts + lucide + Tailwind all inlined, no external requests).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p dist
npx esbuild .build/entry.jsx --bundle --minify --format=iife --loader:.jsx=jsx \
  --define:process.env.NODE_ENV='"production"' --outfile=dist/app.js
npx tailwindcss -c .build/tw.config.js -i .build/tw.css -o dist/app.css --minify
node .build/inline.mjs
echo "built dist/fhd-command-center.html"
