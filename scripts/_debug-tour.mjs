import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: "new",
  args: ["--no-first-run", "--mute-audio"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on("console", (m) => {
  if (m.type() === "error") console.log("  [console.error]", m.text().slice(0, 180));
});
page.on("pageerror", (e) => console.log("  [pageerror]", String(e).slice(0, 180)));

await page.goto("http://localhost:3000/", { waitUntil: "networkidle2" });
await page.evaluate(() => {
  localStorage.removeItem("gg-tour");
  document.cookie = "app_session_id=; Max-Age=0; path=/";
});
await page.reload({ waitUntil: "networkidle2" });
await page.waitForSelector("[data-tour-prompt]", { timeout: 9000 });
await page.evaluate(() => {
  document.querySelector("[data-tour-prompt]")?.querySelector("button:not([aria-label])")?.click();
});
await page.waitForSelector(".driver-popover", { timeout: 10000 });

const state = () =>
  page.evaluate(() => ({
    progress: document.querySelector(".driver-popover-progress-text")?.textContent ?? "(none)",
    title: document.querySelector(".driver-popover-title")?.textContent ?? "(none)",
    path: location.pathname,
    popover: Boolean(document.querySelector(".driver-popover")),
    nextBtn: document.querySelector(".driver-popover-next-btn")?.textContent ?? "(none)",
  }));

console.log("start:", JSON.stringify(await state()));
for (let i = 1; i <= 8; i++) {
  await page.evaluate(() => document.querySelector(".driver-popover-next-btn")?.click());
  await new Promise((r) => setTimeout(r, 3500));
  const s = await state();
  console.log(`after next #${i}:`, JSON.stringify(s));
  if (!s.popover) {
    console.log("tour ended at click", i);
    break;
  }
}
console.log("localStorage gg-tour:", await page.evaluate(() => localStorage.getItem("gg-tour")));
await browser.close();
