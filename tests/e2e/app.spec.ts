import { test, expect } from "@playwright/test";

test("home page renders greeting", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByText(/personal equity research analyst/i),
  ).toBeVisible();
  await expect(page.getByTestId("input-message")).toBeVisible();
  await expect(page.getByRole("button", { name: /ask/i })).toBeVisible();
});

test("backend heartbeat responds", async ({ request }) => {
  const res = await request.get("/api/test");
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  expect(json.message).toBe("API is working!");
});

test("classify-intent can be hit and UI consumes mocked response", async ({
  page,
}) => {
  await page.route("**/api/classify-intent", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        query: "TSLA news",
        intent: "NEWS",
        confidence: 0.9,
        identifier: "TSLA",
        identifier_type: "ticker",
        ticker: "TSLA",
        company_name: "Tesla",
        industry: "EV",
        rationale: "Keyword match",
      }),
    });
  });

  await page.goto("/");
  await page.getByTestId("input-message").fill("TSLA news");
  await page.getByRole("button", { name: /ask/i }).click();

  await expect(page.getByText(/AI Understanding/i)).toBeVisible();
  await expect(page.getByText(/Intent:\s*NEWS/i)).toBeVisible();
  await expect(page.getByText(/TSLA/i).first()).toBeVisible();
});
