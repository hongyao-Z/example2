import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = "http://127.0.0.1:5173";
const outputDir = "output/playwright";

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const consoleErrors = [];
  desktop.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await desktop.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await desktop.waitForSelector(".home-page");
  await desktop.waitForTimeout(1200);

  const desktopOverflow = await desktop.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  if (desktopOverflow) throw new Error("desktop has horizontal overflow");

  await desktop.getByRole("button", { name: /查看演示/ }).click();
  await desktop.waitForFunction(() => window.scrollY > 250);
  await desktop.getByRole("button", { name: /生成访问顺序/ }).click();
  await desktop.waitForSelector(".demo-result.is-generated .demo-plan");

  await revealPage(desktop);
  await desktop.screenshot({ path: `${outputDir}/home-desktop.png`, fullPage: true });

  await desktop.getByRole("link", { name: /开始规划/ }).first().click();
  await desktop.waitForURL("**/app");
  if (!desktop.url().endsWith("/app")) throw new Error("start link did not navigate to /app");

  if (consoleErrors.length > 0) {
    throw new Error(`desktop console errors: ${consoleErrors.join("\n")}`);
  }

  const mobile = await browser.newPage({ viewport: { width: 390, height: 1200 }, isMobile: true });
  await mobile.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await mobile.waitForSelector(".home-page");
  await mobile.waitForTimeout(800);
  const mobileOverflow = await mobile.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  if (mobileOverflow) throw new Error("mobile has horizontal overflow");
  await revealPage(mobile);
  await mobile.screenshot({ path: `${outputDir}/home-mobile.png`, fullPage: true });

  console.log("home playwright check passed");
  console.log(`${outputDir}/home-desktop.png`);
  console.log(`${outputDir}/home-mobile.png`);
} finally {
  await browser.close();
}

async function revealPage(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const viewportHeight = page.viewportSize()?.height ?? 900;
  for (let y = 0; y <= height; y += Math.floor(viewportHeight * 0.72)) {
    await page.evaluate((nextY) => window.scrollTo(0, nextY), y);
    await page.waitForTimeout(180);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(350);
}
