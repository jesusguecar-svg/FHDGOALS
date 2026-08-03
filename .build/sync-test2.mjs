import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
const html = readFileSync("dist/fhd-command-center.html");
const srv = createServer((q, r) => { r.writeHead(200, { "Content-Type": "text/html" }); r.end(html); }).listen(8897);
const errs = [];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const P = await ctx.newPage();
P.on("pageerror", (e) => errs.push(e.message));
P.on("dialog", (d) => d.accept());
await P.goto("http://localhost:8897/"); await P.waitForTimeout(1500);

// garbage input
await P.click('button:has-text("Phone")'); await P.waitForTimeout(300);
await P.fill('textarea[placeholder="Paste the sync code here…"]', "hello there");
await P.click('button:has-text("Load this log onto this device")'); await P.waitForTimeout(700);
console.log("garbage rejected:", (await P.textContent("#root")).includes("doesn't look like a sync code"));
await P.fill('textarea[placeholder="Paste the sync code here…"]', "FHD1.bm90anNvbg==");
await P.click('button:has-text("Load this log onto this device")'); await P.waitForTimeout(700);
const t = await P.textContent("#root");
console.log("corrupt code handled:", /backup is damaged|not a backup|no weekly log/i.test(t));

// $7,800 week -> Globe Week rung
await P.click('button:has-text("Weekly Log")'); await P.waitForTimeout(400);
await P.locator('input[placeholder="0"]').first().fill("7800");
await P.locator('input[placeholder="0"]').nth(1).fill("32");
await P.click('button:has-text("Log week")'); await P.waitForTimeout(1000);
await P.click('button:has-text("String Club")'); await P.waitForTimeout(600);
const sc = await P.textContent("#root");
console.log("highest level reads Globe Week:", /HIGHEST LEVEL ACHIEVED\s*Globe Week/i.test(sc.replace(/\s+/g," ")));
console.log("Flight of the Eagle still locked:", /2,200/.test(sc));
console.log("ERRORS:", errs.length ? errs : "none");
await b.close(); srv.close();
