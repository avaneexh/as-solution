import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  enquirySchema,
  updateBookingSchema,
  safeNext,
  csvCell,
} from "../src/lib/validation";
import { contentSchema, defaultContent } from "../src/lib/content";
import { verifySignature, botReply } from "../src/lib/whatsapp";
const valid = {
  name: "Test Client",
  email: "test@example.com",
  phone: "+919999999999",
  business: "Test Studio",
  service: "Meta ads",
  message: "I would like to grow my local business.",
  type: "enquiry",
  consent: true,
  request_id: "00000000-0000-4000-8000-000000000001",
};
test("lead validation rejects missing consent, invalid contact and excessive payloads", () => {
  assert.equal(enquirySchema.safeParse(valid).success, true);
  for (const bad of [
    { consent: false },
    { email: "bad" },
    { phone: "123" },
    { message: "x".repeat(5001) },
  ])
    assert.equal(enquirySchema.safeParse({ ...valid, ...bad }).success, false);
});
test("booking requires a future time within the allowed request window", () => {
  for (const preferred_at of [
    undefined,
    "bad",
    new Date(Date.now() - 1000).toISOString(),
    new Date(Date.now() + 181 * 86400000).toISOString(),
  ])
    assert.equal(
      enquirySchema.safeParse({ ...valid, type: "booking", preferred_at })
        .success,
      false,
    );
  assert.equal(
    enquirySchema.safeParse({
      ...valid,
      type: "booking",
      preferred_at: new Date(Date.now() + 86400000).toISOString(),
    }).success,
    true,
  );
});
test("confirmed booking requires a scheduled future time", () => {
  assert.equal(
    updateBookingSchema.safeParse({
      id: valid.request_id,
      status: "Confirmed",
      scheduled_at: null,
      notes: "",
    }).success,
    false,
  );
});
test("content rejects script URLs and invalid tracking IDs", () => {
  assert.equal(contentSchema.safeParse(defaultContent).success, true);
  assert.equal(
    contentSchema.safeParse({
      ...defaultContent,
      hero: { ...defaultContent.hero, image: "javascript:alert(1)" },
    }).success,
    false,
  );
  assert.equal(
    contentSchema.safeParse({
      ...defaultContent,
      tracking: { ga4: "G-X;alert(1)", pixel: "", clarity: "" },
    }).success,
    false,
  );
});
test("redirects stay on-site and CSV neutralises formula injection", () => {
  for (const x of ["//evil.com", "https://evil.com", "/\\evil.com"])
    assert.equal(safeNext(x), "/portal");
  assert.equal(safeNext("/login?reset=1"), "/login?reset=1");
  assert.equal(csvCell('=IMPORTXML("x")'), '"\'=IMPORTXML(""x"")"');
});
test("WhatsApp webhook verifies the raw body signature", () => {
  const raw = '{"hello":"world"}';
  const signature =
    "sha256=" + createHmac("sha256", "test").update(raw).digest("hex");
  assert.equal(verifySignature(raw, signature, "test"), true);
  assert.equal(verifySignature(raw + " ", signature, "test"), false);
  assert.equal(verifySignature(raw, "sha256=invalid", "test"), false);
  assert.match(botReply("1", defaultContent, "https://example.com"), /14,999/);
  assert.match(
    botReply("4", defaultContent, "https://example.com"),
    /type=booking/,
  );
});
