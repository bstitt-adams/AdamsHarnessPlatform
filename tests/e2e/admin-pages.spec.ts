import { readFileSync, readdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const ADMIN_DIR = "app/(portal)/portal/admin";
const PAGES = readdirSync(ADMIN_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const creds = JSON.parse(readFileSync("test-results/.crud-admin.json", "utf8")) as { email: string; password: string };

/** Noise that is not an app defect (dev tooling, third-party embeds, idle streams). */
const IGNORED = [
  /Download the React DevTools/i,
  /\[HMR\]|\[Fast Refresh\]/i,
  /Disconnecting idle stream/i,
  /favicon/i,
  /vercel\.live|_vercel\/insights/i,
  /webchannel|Listen\/channel/i,
];

test.describe.configure({ mode: "default" });

let page: Page;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  await page.goto("/sign-in");
  await page.fill("#email", creds.email);
  await page.fill("#password", creds.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/portal/, { timeout: 60_000 });
});

test.afterAll(async () => {
  await page?.close();
});

/** Pages whose non-standard behaviour for an `admin` user is intentional. */
const EXPECTED: Record<string, "removed" | "superadmin-only"> = {
  "book-call-leads": "removed",
  superadmin: "superadmin-only",
};

for (const [name, kind] of Object.entries(EXPECTED)) {
  test(`admin/${name} behaves as ${kind}`, async () => {
    const response = await page.goto(`/portal/admin/${name}`, { waitUntil: "domcontentloaded" });
    if (kind === "removed") {
      expect(response?.status()).toBe(404);
    } else {
      await page.waitForURL((url) => !url.pathname.startsWith(`/portal/admin/${name}`), { timeout: 15_000 });
    }
  });
}

for (const name of PAGES.filter((p) => !(p in EXPECTED))) {
  test(`admin/${name} loads without errors`, async () => {
    const problems: string[] = [];
    const onConsole = (msg: import("@playwright/test").ConsoleMessage) => {
      if (msg.type() === "error" && !IGNORED.some((re) => re.test(msg.text()))) problems.push(`console: ${msg.text().slice(0, 200)}`);
    };
    const onPageError = (err: Error) => problems.push(`uncaught: ${err.message.slice(0, 200)}`);
    const onResponse = (res: import("@playwright/test").Response) => {
      const url = res.url();
      if (res.status() >= 500 && !IGNORED.some((re) => re.test(url))) problems.push(`HTTP ${res.status()} ${url.replace(/^https?:\/\/[^/]+/, "")}`);
    };
    page.on("console", onConsole);
    page.on("pageerror", onPageError);
    page.on("response", onResponse);
    try {
      const response = await page.goto(`/portal/admin/${name}`, { waitUntil: "domcontentloaded" });
      expect(response?.status(), "page HTTP status").toBeLessThan(400);
      await page.waitForLoadState("networkidle", { timeout: 6_000 }).catch(() => undefined);
      await page.waitForTimeout(2_500);

      expect(page.url(), "redirected away from admin page").toContain(`/portal/admin/${name}`);
      const body = (await page.locator("body").innerText()).slice(0, 20_000);
      for (const marker of ["Application error", "Unhandled Runtime Error", "This page could not be found", "Something went wrong", "Missing or insufficient permissions"]) {
        if (body.includes(marker)) problems.push(`page shows "${marker}"`);
      }
      expect(problems, problems.join("\n")).toEqual([]);
    } finally {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      page.off("response", onResponse);
    }
  });
}
