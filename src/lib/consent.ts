export function trackingPermissions(value: string | null) {
  return {
    analytics: value === "analytics" || value === "accepted",
    marketing: value === "accepted",
  };
}
