import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
const html = readFileSync("dist/fhd-command-center.html");
const srv = createServer((q, r) => { r.writeHead(200, { "Content-Type": "text/html" }); r.end(html); }).listen(8899);

const errs = [];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
p.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message));
p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
p.on("dialog", (d) => d.accept());

await p.goto("http://localhost:8899/");
await p.waitForTimeout(1500);
console.log("driver chip:", (await p.textContent("#root")).match(/Saved on this device|Saved to Claude storage|Session only/)?.[0]);

// Log week 32 at $6,200 / 26 apps through the real form.
await p.click('button:has-text("Weekly Log")'); await p.waitForTimeout(500);
const napBox = p.locator('input[placeholder="0"]').first();
await napBox.fill("6200");
await p.locator('input[placeholder="0"]').nth(1).fill("26");
await p.click('button:has-text("Log week")');
await p.waitForTimeout(1200);
const afterSave = await p.textContent("#root");
console.log("PR callout shown:", /NEW PERSONAL RECORD|New personal record/i.test(afterSave));
console.log("stored keys:", await p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith("fhd:"))));

// Reload — this is the whole point.
await p.reload();
await p.waitForTimeout(1800);
const dash = await p.textContent("#root");
console.log("week 32 NAP after reload:", dash.match(/WEEK 32 NAP[^$]*\$[\d,]+/)?.[0] || dash.match(/\$6,200/)?.[0]);
console.log("$6,200 survived reload:", dash.includes("$6,200"));
console.log("streak reset to production:", /Consecutive production weeks/i.test(dash));
console.log("activity minimum now:", dash.match(/\d \/ 3/)?.[0]);

// Backup download path (no window.claude here -> blob fallback)
const dl = p.waitForEvent("download", { timeout: 5000 }).catch(() => null);
await p.click('button:has-text("Backup")');
const got = await dl;
console.log("backup filename:", got ? got.suggestedFilename() : "NO DOWNLOAD");

console.log("ERRORS:", errs.length ? errs.slice(0, 5) : "none");
await b.close(); srv.close();
