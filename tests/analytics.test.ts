import test from "node:test";
import assert from "node:assert/strict";
import { googleRows, claritySections } from "../src/lib/analytics-format";
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
