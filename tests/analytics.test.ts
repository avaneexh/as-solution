import test from "node:test";
import assert from "node:assert/strict";
import { googleRows, claritySections } from "../src/lib/analytics-format";
import { reportingConfig, reportingIssue } from "../src/lib/analytics-config";
test("deployment configuration reports exact missing fields without secret values", () => {
  const env = { GA4_PROPERTY_ID: "559412997", GA4_PRIVATE_KEY: "secret-test-value" };
  const issue = reportingIssue("ga4", env)!;
  assert.ok(issue.includes("GA4_CLIENT_EMAIL"));
  assert.ok(!issue.includes("secret-test-value"));
  assert.ok(reportingIssue("clarity", { CLARITY_API_TOKEN: "   " })!.includes("CLARITY_API_TOKEN"));
  assert.ok(reportingIssue("ga4", { ...env, GA4_PROPERTY_ID: "G-ABC", GA4_CLIENT_EMAIL: "service@example.com" })!.includes("numeric"));
});
test("pasted env values tolerate outer quotes, whitespace and escaped key newlines", () => {
  const env = { GA4_PROPERTY_ID: ' "559412997" ', GA4_CLIENT_EMAIL: " service@example.com ", GA4_PRIVATE_KEY: '"first\\nsecond"', CLARITY_API_TOKEN: " 'token' " };
  assert.equal(reportingIssue("ga4", env), null);
  assert.equal(reportingIssue("clarity", env), null);
  assert.equal(reportingConfig(env).key, "first\nsecond");
  assert.equal(reportingConfig(env).clarity, "token");
});
test("Google empty and dimension reports are parsed without inventing data", () => {
  assert.deepEqual(googleRows({}), []);
  assert.deepEqual(
    googleRows({
      rows: [
        {
          dimensionValues: [{ value: "Organic Search" }],
          metricValues: [{ value: "12" }, { value: "4" }],
        },
      ],
    }),
    [["Organic Search", "12", "4"]],
  );
  assert.throws(() => googleRows({ rows: [{ metricValues: "bad" }] }));
});
test("Clarity retains aggregate metrics and excludes URLs and unknown report groups", () => {
  const sections = claritySections([
    {
      metricName: "Traffic",
      information: [
        {
          totalSessionCount: "9554",
          totalBotSessionCount: "8369",
          distantUserCount: "189733",
          PagesPerSessionPercentage: 1.0931,
          URL: "https://private.example",
        },
      ],
    },
    {
      metricName: "PopularPages",
      information: [{ URL: "https://private.example" }],
    },
  ]);
  assert.equal(sections.length, 1);
  assert.deepEqual(sections[0].rows, [["9554", "8369", "189733", "1.0931"]]);
  assert.equal(JSON.stringify(sections).includes("private.example"), false);
  assert.deepEqual(claritySections([]), []);
  assert.throws(() => claritySections({ error: "unauthorized" }));
});
