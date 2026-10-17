import { createHmac, timingSafeEqual } from "node:crypto";
import type { Content } from "./content";
export function verifySignature(
  raw: string,
  signature: string | null,
  secret: string,
) {
  if (!signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const actual = Buffer.from(signature.slice(7), "hex");
  const expected = createHmac("sha256", secret).update(raw).digest();
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function botReply(text: string, content: Content, site: string) {
  const t = text.trim().toLowerCase();
  if (["1", "packages", "pricing"].includes(t))
    return `${content.brand.name} packages:\n${content.packages
      .filter((p) => p.published && p.category === "social")
      .map((p) => `${p.name}: ₹${p.price.toLocaleString("en-IN")}/month`)
      .join(
        "\n",
      )}\nMeta ad spend is separate.\nExplore: ${site}/packages\nReply 3 to enquire or 4 to book a call.`;
  if (["2", "services"].includes(t))
    return `We can help with:\n${content.services
      .filter((s) => s.published)
      .map((s) => "• " + s.title)
      .join("\n")}\nReply 3 to enquire or 4 to book a call.`;
  if (["3", "enquiry", "enquire"].includes(t))
    return `Tell us about your business securely here: ${site}/contact\nOur team will review your request. You can also leave a message here for a team member.`;
  if (["4", "booking", "book"].includes(t))
    return `Request a free strategy call: ${site}/contact?type=booking\nChoose a preferred time. Our team will confirm availability.`;
  return `Hi! Welcome to ${content.brand.name}. This is our automated guide.\nReply with a number:\n1 — Packages & pricing\n2 — Our services\n3 — Make an enquiry\n4 — Book a strategy call\nFor anything else, leave your question and our team can follow up.`;
}
