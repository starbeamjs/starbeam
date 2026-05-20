import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();

page.on("console", (msg) => console.log(msg.text()));

await page.goto("http://localhost:4173/tests");

await page.waitForFunction(
  () => {
    const elem = document.getElementById("qunit-testresult");
    return elem?.classList.contains("complete");
  },
  { timeout: 30000 },
);

const failed = await page.evaluate(() => {
  const elem = document.getElementById("qunit-testresult");
  return elem?.querySelector(".failed")?.textContent;
});

await browser.close();

if (failed && parseInt(failed) > 0) {
  console.error(`❌ ${failed} test(s) failed`);
  process.exit(1);
}

console.log("✅ All tests passed!");
