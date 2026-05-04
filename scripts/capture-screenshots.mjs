import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const VIEWPORT = { width: 1440, height: 1100 };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const screenshotsDir = path.join(repoRoot, "public", "screenshots");
const tempDir = path.join(screenshotsDir, ".tmp-readme-capture");

async function ensureServerAvailable() {
  try {
    const response = await fetch(BASE_URL, {
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Unknown connection error";

    throw new Error(
      [
        `Expected a running local app at ${BASE_URL}, but it was not reachable (${reason}).`,
        "Start the app first, ideally in stable demo mode:",
        "NEXT_PUBLIC_DEMO_MODE=true npm run dev",
      ].join("\n"),
    );
  }
}

async function resetTempDirectory() {
  await fs.mkdir(screenshotsDir, { recursive: true });
  await fs.rm(tempDir, { recursive: true, force: true });
  await fs.mkdir(tempDir, { recursive: true });
}

function outputPath(fileName) {
  return path.join(tempDir, fileName);
}

async function finalizeCapture(fileName) {
  const tempFile = outputPath(fileName);
  const finalFile = path.join(screenshotsDir, fileName);

  await fs.rm(finalFile, { force: true });
  await fs.rename(tempFile, finalFile);
}

async function finalizeAll(files) {
  for (const file of files) {
    await finalizeCapture(file);
  }

  await fs.rm(tempDir, { recursive: true, force: true });
}

async function getSectionFromHeading(page, headingPattern) {
  const heading = page.getByRole("heading", { name: headingPattern }).first();
  await heading.waitFor({ state: "visible", timeout: 15000 });
  return heading.locator("xpath=ancestor::section[1]");
}

async function captureSection(locator, fileName) {
  await locator.scrollIntoViewIfNeeded();
  await locator.screenshot({
    path: outputPath(fileName),
    animations: "disabled",
  });
}

async function main() {
  await ensureServerAvailable();
  await resetTempDirectory();

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
  });

  const files = [
    "homepage.png",
    "diagnostic-form.png",
    "mock-report.png",
    "source-metadata.png",
    "fix-it-engine.png",
  ];

  try {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

    const heroSection = await getSectionFromHeading(
      page,
      /See how your product shows up inside AI buying answers\./i,
    );
    await captureSection(heroSection, "homepage.png");

    const loadSampleButton = page.getByRole("button", { name: "Load Sample" });
    await loadSampleButton.click();

    const productNameInput = page.locator('input[name="productName"]');
    await productNameInput.waitFor({ state: "visible" });
    await page.waitForFunction(
      (selector) => {
        const input = document.querySelector(selector);
        return Boolean(input && "value" in input && input.value.trim().length);
      },
      'input[name="productName"]',
    );

    const formSection = await getSectionFromHeading(
      page,
      /Build the first report from structured product context/i,
    );
    await captureSection(formSection, "diagnostic-form.png");

    const runDiagnosticButton = page.getByRole("button", {
      name: /Run Diagnostic|Preparing Report/i,
    });
    await runDiagnosticButton.click();

    const reportHeading = page.locator("h3").filter({
      hasText: /scores \d+\/100 for/i,
    });
    await reportHeading.first().waitFor({ state: "visible", timeout: 30000 });

    const reportSection = reportHeading.first().locator("xpath=ancestor::section[1]");
    await captureSection(reportSection, "mock-report.png");

    const sourceLine = page.getByText(/^Source:/).first();
    await sourceLine.waitFor({ state: "visible", timeout: 10000 });
    const sourceCard = sourceLine.locator(
      "xpath=ancestor::div[contains(@class,'rounded-3xl')][1]",
    );
    await captureSection(sourceCard, "source-metadata.png");

    const sourceText = (await sourceLine.textContent())?.trim() ?? "";
    if (!/Mock mode|Mock fallback/i.test(sourceText)) {
      console.warn(
        [
          "Warning: screenshots were captured from a non-mock run.",
          "For reproducible README assets, run the local app with NEXT_PUBLIC_DEMO_MODE=true.",
        ].join(" "),
      );
    }

    const fixItSection = await getSectionFromHeading(
      page,
      /Generate a stronger listing rewrite from the diagnostic/i,
    );
    const fixItButton = page.getByRole("button", {
      name: /Generate Listing Fix|Generating Fix/i,
    });
    await fixItButton.scrollIntoViewIfNeeded();
    await fixItButton.click();

    const rewrittenTitleLabel = page.getByText("Rewritten Title").first();
    await rewrittenTitleLabel.waitFor({ state: "visible", timeout: 30000 });
    await captureSection(fixItSection, "fix-it-engine.png");

    await finalizeAll(files);

    console.log("README screenshots saved:");
    for (const file of files) {
      console.log(`- public/screenshots/${file}`);
    }
  } catch (error) {
    await fs.rm(tempDir, { recursive: true, force: true });
    throw error;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Screenshot capture failed.",
  );
  process.exit(1);
});
