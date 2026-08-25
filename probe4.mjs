import { chromium } from "playwright";
import path from "path";
const PREVIEW = path.resolve("preview.html");
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("dialog", d => d.accept());
await page.goto("file://" + PREVIEW, { waitUntil: "networkidle" });
await page.waitForTimeout(300);
if (await page.locator("#public-login-btn").count()) { try { await page.locator("#public-login-btn").click({timeout:1200}); } catch {} }
await page.fill("#l-login", "operator"); await page.fill("#l-password", "turon2026");
await page.click("#login-btn"); await page.waitForTimeout(1200);
await page.locator('.tt-tab[data-tab="manifest"]').first().click({ force: true });
await page.waitForTimeout(900);
const code = await page.evaluate(async () => (await window.TuronApi.departures())[0].code);
await page.locator(`#adm-departure-cards [data-departure="${code}"]`).click();
await page.waitForTimeout(900);
await page.locator('[data-detail-open="prices"]').click();
await page.waitForTimeout(600);
console.log(await page.evaluate(() => ({
  editor: !!document.getElementById("adm-price-editor"),
  msg: !!document.getElementById("adm-price-msg"),
  save: !!document.getElementById("adm-price-save"),
  saveInPanel: !!document.querySelector("#panel-manifest #adm-price-save"),
  panes: Array.from(document.querySelectorAll("[data-detail-pane]")).map(p => p.dataset.detailPane + ":" + (p.hidden ? "hidden" : "shown")),
})));
