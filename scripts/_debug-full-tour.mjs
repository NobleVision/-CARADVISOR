import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: "new",
  args: ["--no-first-run", "--mute-audio"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

// Network watchdog: the tour must make NO live external API calls.
// (Cloudinary/static assets are fine — they're images, not data lookups.)
const forbidden = [];
page.on("request", (req) => {
  const url = req.url();
  if (/api\.nhtsa\.gov|api\.z\.ai|pinecone\.io|api\.search\.brave\.com|api\.mapbox\.com/.test(url)) {
    forbidden.push(url.slice(0, 120));
  }
});
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));

await page.goto("http://localhost:3000/", { waitUntil: "networkidle2" });
await page.evaluate(() => {
  localStorage.removeItem("gg-tour");
  document.cookie = "app_session_id=; Max-Age=0; path=/";
});
await page.reload({ waitUntil: "networkidle2" });
await page.waitForSelector("[data-tour-prompt]", { timeout: 9000 });
// Second button = Full tour.
await page.evaluate(() => {
  const buttons = document.querySelectorAll("[data-tour-prompt] button:not([aria-label])");
  buttons[1]?.click();
});
await page.waitForSelector(".driver-popover", { timeout: 10000 });

const state = () =>
  page.evaluate(() => ({
    progress: document.querySelector(".driver-popover-progress-text")?.textContent?.trim() ?? "",
    title: document.querySelector(".driver-popover-title")?.textContent ?? "",
    path: location.pathname + location.search,
    open: Boolean(document.querySelector(".driver-popover")),
  }));

let s = await state();
console.log("start:", JSON.stringify(s));
const seen = [s.title];
let completed = false;
for (let attempt = 0; attempt < 40; attempt++) {
  await page.evaluate(() => document.querySelector(".driver-popover-next-btn")?.click()).catch(() => {});
  await new Promise((r) => setTimeout(r, 2000));
  s = await state();
  if (!s.open) {
    completed = true;
    console.log("tour ended after", attempt + 1, "clicks");
    break;
  }
  if (s.title !== seen[seen.length - 1]) {
    seen.push(s.title);
    console.log(`step: ${s.progress} | ${s.title} | ${s.path}`);
    if (s.title === "Your Garage") {
      const auth = await page.evaluate(() => document.cookie.includes("app_session_id="));
      console.log("  -> auto demo login session cookie present:", auth);
      await page.screenshot({ path: "qa-shots/tour-garage.png" });
    }
    if (s.title === "A shortlist, not a haystack") {
      const runFlag = await page.evaluate(() =>
        Boolean(document.body.textContent?.includes("QuickFlip Motors")),
      );
      console.log("  -> fixture shortlist rendered (trap dealer visible):", runFlag);
      await page.screenshot({ path: "qa-shots/tour-results.png" });
    }
  }
}
console.log("steps seen:", seen.length, "| completed:", completed);
console.log("localStorage:", await page.evaluate(() => localStorage.getItem("gg-tour")));
console.log("forbidden external calls:", forbidden.length, forbidden.slice(0, 5));
console.log("page errors:", errors.length, errors.slice(0, 3));
const pass = completed && seen.length >= 12 && forbidden.length === 0 && errors.length === 0;
console.log(pass ? "FULL TOUR: PASS" : "FULL TOUR: FAIL");
await browser.close();
if (!pass) process.exit(1);
