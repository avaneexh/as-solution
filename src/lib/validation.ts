import { z } from "zod";
export const leadStatuses = [
  "New",
  "Contacted",
  "Follow-up",
  "Converted",
  "Closed",
  "Not Interested",
] as const;
export const bookingStatuses = [
  "Requested",
  "Confirmed",
  "Rescheduled",
  "Completed",
  "Cancelled",
] as const;
export const enquirySchema = z
  .object({
    name: z.string().trim().min(2, "Enter your name.").max(100),
    email: z.email("Enter a valid email.").max(254),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{10,20}$/, "Enter a valid phone number."),
    business: z.string().trim().max(160),
    service: z.string().trim().min(2).max(160),
    message: z
      .string()
      .trim()
      .min(10, "Please add at least 10 characters about your requirement.")
      .max(5000),
    type: z.enum(["enquiry", "booking"]),
    preferred_at: z.string().max(40).optional(),
    consent: z.literal(true, { error: "Please agree to the privacy policy." }),
    website: z.string().max(200).optional(),
    turnstile: z.string().max(3000).optional(),
    attribution: z.record(z.string(), z.string().max(200)).optional(),
    request_id: z.uuid(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "booking") {
      const time = Date.parse(v.preferred_at || "");
      if (
        !Number.isFinite(time) ||
        time < Date.now() + 3600000 ||
        time > Date.now() + 180 * 86400000
      )
        ctx.addIssue({
          code: "custom",
          path: ["preferred_at"],
          message: "Choose a time at least one hour ahead and within 180 days.",
        });
    }
  });
export const updateLeadSchema = z.object({
  id: z.uuid(),
  status: z.enum(leadStatuses),
  notes: z.string().max(10000),
  follow_up_at: z
    .string()
    .nullable()
    .refine(
      (v) => !v || Number.isFinite(Date.parse(v)),
      "Invalid follow-up date",
    ),
});
export const updateBookingSchema = z
  .object({
    id: z.uuid(),
    status: z.enum(bookingStatuses),
    scheduled_at: z
      .string()
      .nullable()
      .refine(
        (v) => !v || Number.isFinite(Date.parse(v)),
        "Invalid appointment date",
      ),
    notes: z.string().max(10000),
  })
  .superRefine((v, ctx) => {
    if (
      ["Confirmed", "Rescheduled"].includes(v.status) &&
      (!v.scheduled_at || Date.parse(v.scheduled_at) < Date.now())
    )
      ctx.addIssue({
        code: "custom",
        path: ["scheduled_at"],
        message: "Set a future confirmed appointment time.",
      });
  });
export function safeNext(value: string | null) {
  return value?.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
    ? value
    : "/portal";
}
export function csvCell(value: unknown) {
  const s = String(value ?? "");
  return (
    '"' + (/^[\s]*[=+@-]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"'
  );
}
