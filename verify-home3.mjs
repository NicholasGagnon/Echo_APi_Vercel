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

await page.screenshot({ path: "v3-1-default.png" });

// check button matrix row count by inspecting Y positions of first/last button
const buttons = page.locator("button[title]");
const count = await buttons.count();
const tops = [];
for (let i = 0; i < count; i++) {
  const box = await buttons.nth(i).boundingBox();
  if (box) tops.push(Math.round(box.y));
}
console.log("button tops:", JSON.stringify([...new Set(tops)]));

// left resizer drag test
const leftHandle = page.locator(".cursor-col-resize").nth(0);
const lb = await leftHandle.boundingBox();
const leftAside = page.locator("aside").nth(0);
const beforeLeft = await leftAside.boundingBox();
console.log("left aside width before:", beforeLeft.width);
await page.mouse.move(lb.x + lb.width / 2, lb.y + lb.height / 2);
await page.mouse.down();
await page.mouse.move(lb.x + lb.width / 2 + 100, lb.y + lb.height / 2, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(150);
const afterLeft = await leftAside.boundingBox();
console.log("left aside width after +100 drag:", afterLeft.width);
await page.screenshot({ path: "v3-2-left-resized.png" });

// reload to reset, then test send + auto-scroll
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.waitForSelector("#settings-trigger", { timeout: 15000 });
const closeBtn2 = page.locator('button[title="Fermer"]').first();
if (await closeBtn2.count() > 0) await closeBtn2.click().catch(() => {});

const textarea = page.locator("textarea[maxlength]").first();
for (let i = 0; i < 5; i++) {
  await textarea.fill(`Message de test numero ${i}`);
  await page.getByText("ENVOYER").click();
  await page.waitForTimeout(400);
}
await page.waitForTimeout(1500);
await page.screenshot({ path: "v3-3-after-send.png" });

const scrollContainer = page.locator(".overflow-y-auto.overflow-x-hidden").first();
const info = await scrollContainer.evaluate(el => ({ scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }));
console.log("messages scroll info:", JSON.stringify(info));

console.log("console errors:", JSON.stringify(errors));
await browser.close();
