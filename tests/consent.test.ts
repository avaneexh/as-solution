import test from "node:test";
import assert from "node:assert/strict";
import { trackingPermissions } from "../src/lib/consent";
import { contentSchema, defaultContent } from "../src/lib/content";
test("optional tracking is denied for absent, rejected and unrecognised consent", () => {
  for (const value of [null, "rejected", "loading", "invalid"]) {
    assert.deepEqual(trackingPermissions(value), {
      analytics: false,
      marketing: false,
    });
  }
});
test("analytics-only never authorises advertising", () => {
  assert.deepEqual(trackingPermissions("analytics"), {
    analytics: true,
    marketing: false,
  });
  assert.deepEqual(trackingPermissions("accepted"), {
    analytics: true,
    marketing: true,
  });
});
test("existing CMS documents receive legal defaults without losing business content", () => {
  const { legal, ...legacy } = defaultContent;
  const parsed = contentSchema.parse(legacy);
  assert.deepEqual(parsed.legal, legal);
  assert.deepEqual(parsed.brand, legacy.brand);
});
