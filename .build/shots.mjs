import { chromium } from "playwright-core";
const SP = process.argv[2];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: 1280, height: 1400 } });
await p.goto("file://" + SP + "/fhd-command-center.html");
await p.waitForTimeout(2000);
for (const [tab, file] of [["Monthly Bonus", "shot-monthly.png"], ["Quality (A/T)", "shot-quality.png"]]) {
  await p.click(`button:has-text("${tab}")`);
  await p.waitForTimeout(900);
  await p.screenshot({ path: SP + "/" + file, fullPage: false });
}
await b.close();
