import { readFileSync, writeFileSync } from "node:fs";
const css = readFileSync("dist/app.css", "utf8");
const js = readFileSync("dist/app.js", "utf8");
if (js.toLowerCase().includes("</script")) throw new Error("script terminator in bundle");
const shell = `<title>FHD Production Command Center</title>
<style>
/* Committed single-theme printed report — 1994 sales floor, light stock only. */
:root { color-scheme: light; }
html, body { background: #e7e5dc; }
body { -webkit-font-smoothing: antialiased; font-variant-numeric: tabular-nums; }
input[type="range"] { accent-color: #7f1d1d; }
:focus-visible { outline: 2px solid #1e3a8a; outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
}
</style>
<style>${css}</style>
<div id="root"></div>
<script>${js}</script>
`;
writeFileSync("dist/fhd-command-center.html", shell);
