import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
const html = readFileSync("dist/fhd-command-center.html");
const srv = createServer((q, r) => { r.writeHead(200, { "Content-Type": "text/html" }); r.end(html); }).listen(8898);
const errs = [];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });

// --- "Laptop": log a week, copy the sync code
const laptop = await b.newContext({ viewport: { width: 1280, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
const L = await laptop.newPage();
L.on("pageerror", (e) => errs.push("LAPTOP " + e.message));
L.on("dialog", (d) => d.accept());
await L.goto("http://localhost:8898/"); await L.waitForTimeout(1500);
await L.click('button:has-text("Weekly Log")'); await L.waitForTimeout(400);
await L.locator('input[placeholder="0"]').first().fill("7800");
await L.locator('input[placeholder="0"]').nth(1).fill("32");
await L.click('button:has-text("Log week")'); await L.waitForTimeout(1000);
await L.click('button:has-text("Dashboard")'); await L.waitForTimeout(400);
await L.click('button:has-text("Phone")'); await L.waitForTimeout(300);
await L.click('button:has-text("Copy sync code")'); await L.waitForTimeout(600);
const code = await L.evaluate(() => navigator.clipboard.readText());
console.log("code prefix:", code.slice(0, 12), "| length:", code.length);

// --- "Phone": separate browser context = separate localStorage, like a different device
const phone = await b.newContext({ viewport: { width: 390, height: 844 } });
const P = await phone.newPage();
P.on("pageerror", (e) => errs.push("PHONE " + e.message));
P.on("dialog", (d) => d.accept());
await P.goto("http://localhost:8898/"); await P.waitForTimeout(1500);
const before = await P.textContent("#root");
console.log("phone before sync — has $7,800:", before.includes("$7,800"));
await P.click('button:has-text("Phone")'); await P.waitForTimeout(300);
await P.fill('textarea[placeholder="Paste the sync code here…"]', code);
await P.click('button:has-text("Load this log onto this device")'); await P.waitForTimeout(1200);
const after = await P.textContent("#root");
console.log("phone after sync — has $7,800:", after.includes("$7,800"));
await P.reload(); await P.waitForTimeout(1600);
const afterReload = await P.textContent("#root");
console.log("phone after reload — has $7,800:", afterReload.includes("$7,800"));
console.log("phone string club level:", afterReload.match(/Globe Week|Green Out/)?.[0]);
const overflow = await P.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log("phone horizontal overflow:", overflow);
console.log("bad code rejected:", await (async () => {
  await P.fill('textarea[placeholder="Paste the sync code here…"]', "hello there");
  await P.click('button:has-text("Load this log onto this device")'); await P.waitForTimeout(600);
  return (await P.textContent("#root")).includes("not an FHD sync code");
})());
console.log("ERRORS:", errs.length ? errs.slice(0,5) : "none");
await b.close(); srv.close();
