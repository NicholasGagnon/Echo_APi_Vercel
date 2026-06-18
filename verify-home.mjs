import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
page.on("pageerror", (err) => errors.push(String(err)));

await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.waitForSelector("#settings-trigger", { timeout: 15000 });

const closeBtn = page.locator('button[title="Fermer"]').first();
if (await closeBtn.count() > 0) await closeBtn.click().catch(() => {});

await page.screenshot({ path: "verify-home-1.png" });

// check the right aside initial width
const aside = page.locator("aside").nth(1);
const beforeBox = await aside.boundingBox();
console.log("aside width before drag:", beforeBox.width);

// drag the resizer handle to the left by 120px (should shrink the right column / grow chat)
const handle = page.locator(".cursor-col-resize").first();
const handleBox = await handle.boundingBox();
await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
await page.mouse.down();
await page.mouse.move(handleBox.x + handleBox.width / 2 - 120, handleBox.y + handleBox.height / 2, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(200);

const afterBox = await aside.boundingBox();
console.log("aside width after drag (+120px to the right column):", afterBox.width);

await page.screenshot({ path: "verify-home-2-resized.png" });

console.log("console errors:", JSON.stringify(errors));

await browser.close();
