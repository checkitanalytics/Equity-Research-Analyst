#!/usr/bin/env node
import fs from "fs";
import path from "path";

const [inputPath = "test-results/vitest-unit.json", outputPath = "test-results/vitest-unit.html"] = process.argv.slice(2);

async function main() {
  const input = path.resolve(process.cwd(), inputPath);
  const output = path.resolve(process.cwd(), outputPath);

  let data;
  try {
    const raw = await fs.promises.readFile(input, "utf-8");
    data = JSON.parse(raw);
  } catch (err) {
    const message = `Failed to read/parse ${input}: ${err instanceof Error ? err.message : String(err)}`;
    await fs.promises.writeFile(
      output,
      `<html><body><h2>Vitest Report</h2><p style="color:red;">${message}</p></body></html>`,
      "utf-8",
    );
    console.error(message);
    return;
  }

  const total = data.numTotalTests ?? data.totalTests ?? 0;
  const passed = data.numPassedTests ?? data.successful ?? data.passed ?? 0;
  const failed = data.numFailedTests ?? data.failed ?? 0;
  const skipped = data.numPendingTests ?? data.skipped ?? 0;
  const time = data.stopTime && data.startTime ? ((data.stopTime - data.startTime) / 1000).toFixed(2) : "n/a";

  const tests = (data.testResults || []).flatMap((suite) => {
    return (suite.assertionResults || []).map((t) => ({
      fullName: t.fullName || t.title || t.ancestorTitles?.concat(t.title).join(" ") || "unknown",
      status: t.status || "unknown",
      duration: t.duration ?? suite.perfStats?.runtime ?? 0,
    }));
  });

  const rows = tests
    .map(
      (t) =>
        `<tr><td>${escapeHtml(t.fullName)}</td><td>${t.status}</td><td>${t.duration || 0} ms</td></tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Vitest Unit Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; }
    table { border-collapse: collapse; width: 100%; margin-top: 16px; }
    th, td { border: 1px solid #ddd; padding: 8px; }
    th { background: #f3f4f6; text-align: left; }
  </style>
</head>
<body>
  <h2>Vitest Unit Report</h2>
  <p><strong>Total:</strong> ${total} &nbsp; <strong>Passed:</strong> ${passed} &nbsp; <strong>Failed:</strong> ${failed} &nbsp; <strong>Skipped:</strong> ${skipped} &nbsp; <strong>Time:</strong> ${time}s</p>
  <table>
    <thead><tr><th>Test</th><th>Status</th><th>Duration</th></tr></thead>
    <tbody>
      ${rows || "<tr><td colspan='3'>No tests found</td></tr>"}
    </tbody>
  </table>
</body>
</html>`;

  await fs.promises.writeFile(output, html, "utf-8");
  console.log(`HTML report written to ${output}`);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

main();
