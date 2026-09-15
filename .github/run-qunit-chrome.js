// Loads the project's QUnit suite in headless Chrome and exits non-zero when
// any assertion fails. Runs under the modern Node installed by
// .github/run-browser-tests.sh, not the project's own Node runtime.
const puppeteer = require("puppeteer");

// Chrome emits these for fixtures the suite loads on purpose (password inputs,
// unload handlers). Mirroring them floods the CI log stream and pushes the
// result summary out of a partially captured log, so drop just this noise.
const CONSOLE_NOISE = /autocomplete attributes|Permissions policy violation: unload/;

(async () => {
  const url = process.argv[2];
  // protocolTimeout defaults to 180s, which is shorter than the suite takes on a
  // slow CI worker; the waitForFunction poll below is then killed mid-run.
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    protocolTimeout: 0
  });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(0);
    page.on("console", msg => {
      const text = msg.text();
      if (!CONSOLE_NOISE.test(text)) {
        console.log("[browser] " + text);
      }
    });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => {
        const el = document.getElementById("qunit-testresult");
        return el && /completed/i.test(el.innerText);
      },
      { timeout: 900000, polling: 2000 }
    );
    const result = await page.evaluate(() => document.getElementById("qunit-testresult").innerText);
    const total = await page.evaluate(() => document.querySelectorAll("#qunit-tests > li").length);
    const failures = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#qunit-tests > li.fail")).map(li => {
        const m = li.querySelector(".module-name");
        const n = li.querySelector(".test-name");
        return (m ? m.innerText : "?") + ": " + (n ? n.innerText : "?");
      })
    );
    // Keep the summary on one line so a log grep can rely on it.
    console.log("QUnit result: " + result.replace(/\s+/g, " ").trim());
    console.log("QUnit tests run: " + total);
    console.log("Failed tests (" + failures.length + "):");
    failures.forEach(f => console.log("  - " + f));
    process.exitCode = failures.length === 0 ? 0 : 1;
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error(err);
  process.exitCode = 3;
}).then(() => {
  // process.exit() discards stdout still queued in the pipe buffer, which can
  // swallow the summary above on CI. Let Node exit on its own once stdout has
  // drained, keeping an unref'd guard in case a stray handle holds the loop open.
  setTimeout(() => process.exit(process.exitCode), 30000).unref();
});
