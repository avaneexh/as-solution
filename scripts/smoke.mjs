import assert from "node:assert/strict";
const origin = process.env.SMOKE_ORIGIN || "http://127.0.0.1:3000";
for (const path of [
  "/",
  "/about",
  "/services",
  "/portfolio",
  "/packages",
  "/testimonials",
  "/contact",
  "/privacy",
  "/terms",
  "/login",
  "/robots.txt",
  "/sitemap.xml",
]) {
  const response = await fetch(origin + path);
  assert.equal(response.status, 200, path);
  if (!path.endsWith(".txt") && !path.endsWith(".xml"))
    assert.match(await response.text(), /ADS Solutions/, path);
  console.log("PASS", path);
}
for (const path of ["/admin", "/portal", "/api/admin/export"]) {
  const response = await fetch(origin + path, { redirect: "manual" });
  assert.equal(response.status, 307, path);
  assert.match(response.headers.get("location") || "", /\/login/);
  if (path === "/admin") {
    const login = new URL(response.headers.get("location"), origin);
    assert.equal(login.searchParams.get("next"), "/admin");
    const loginHtml = await (await fetch(login)).text();
    assert.match(loginHtml, /Admin sign in/);
    assert.doesNotMatch(loginHtml, /Create an account/);
  }
  console.log("PASS protected", path);
}
const publicHtml = await (await fetch(origin)).text();
assert.doesNotMatch(publicHtml, /Client login|href="\/admin"|href="\/portal"/);
console.log("PASS public navigation has no account links; admin sign-in retains destination");
const forbidden = await fetch(origin + "/api/enquiries", {
  method: "POST",
  headers: {
    origin: "https://untrusted.invalid",
    "Content-Type": "application/json",
  },
  body: "{}",
});
assert.equal(forbidden.status, 403);
const invalid = await fetch(origin + "/api/enquiries", {
  method: "POST",
  headers: { origin, "Content-Type": "application/json" },
  body: "{}",
});
assert.equal(invalid.status, 400);
const webhook = await fetch(
  origin +
    "/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=invalid&hub.challenge=123",
);
assert.equal(webhook.status, 403);
console.log(
  "PASS cross-origin denial, invalid intake and webhook verification denial",
);
