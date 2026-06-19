import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
const errors = [];
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
page.on("pageerror", (err) => errors.push(String(err)));

await page.goto("http://localhost:3000/books", { waitUntil: "networkidle" });
await page.waitForTimeout(500);

// presets visible
const printBtn = page.getByText("Impression", { exact: false }).first();
const kindleBtn = page.getByText("Kindle", { exact: false }).first();
const customBtn = page.getByText("Personnalisé", { exact: false }).first();
console.log("3 presets visible:", await printBtn.isVisible(), await kindleBtn.isVisible(), await customBtn.isVisible());

// language dropdown present in settings
await page.locator("button", { hasText: /^⚙️\s*(FR|EN)$/ }).first().click();
await page.waitForTimeout(150);
const langDropdownVisible = await page.getByText("Français", { exact: false }).first().isVisible().catch(() => false);
console.log("LangDropdown visible in settings:", langDropdownVisible);
await page.keyboard.press("Escape");
await page.mouse.click(700, 400);

// page grows with long text
const editor = page.locator('[contenteditable="true"]').first();
await editor.click();
const longHtml = Array.from({length: 60}, (_, i) => `<p>Ligne ${i} pour remplir l'espace et tester la croissance de la page.</p>`).join("");
await editor.evaluate((el, html) => { el.innerHTML = html; el.dispatchEvent(new Event("input", { bubbles: true })); }, longHtml);
await page.waitForTimeout(300);

const pageSheet = page.locator("div.shadow-2xl.border").first();
const sheetBox = await pageSheet.boundingBox();
console.log("page sheet height with long text:", sheetBox.height, "(should be >> viewport, not clipped)");

// page break spacing
await editor.evaluate(el => { el.innerHTML = "<p>Ligne A</p><p>Ligne B</p>"; el.dispatchEvent(new Event("input", { bubbles: true })); });
await page.waitForTimeout(150);
await page.getByTitle("Saut de page").click();
await page.waitForTimeout(150);
await page.keyboard.type("Texte apres saut");
await page.waitForTimeout(150);

const lines = editor.locator(":scope > *");
const count = await lines.count();
for (let i = 0; i < count; i++) {
  const box = await lines.nth(i).boundingBox();
  const tag = await lines.nth(i).evaluate(el => el.tagName);
  console.log(`line[${i}] <${tag}> y=${box?.y.toFixed(0)} h=${box?.height.toFixed(0)}`);
}

await page.screenshot({ path: "merged-final.png" });
console.log("console errors:", JSON.stringify(errors));
await browser.close();
