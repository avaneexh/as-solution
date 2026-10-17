export type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  business: string;
  service: string;
  message: string;
  status: string;
  source: string;
  attribution: Record<string, string>;
  follow_up_at: string | null;
  created_at: string;
  lead_notes: { notes: string } | null;
};
export type Booking = {
  id: string;
  lead_id: string;
  preferred_at: string;
  scheduled_at: string | null;
  status: string;
  created_at: string;
  booking_notes: { notes: string } | null;
  leads: { name: string; email: string; phone: string; service: string } | null;
};
export type Audit = {
  id: number;
  entity: string;
  record_id: string;
  action: string;
  created_at: string;
  actor_id: string | null;
  changes: Record<string, unknown>;
};
export type AdminSummary = {
  totalLeads: number;
  totalBookings: number;
  pipeline: Record<string, number>;
  sources: [string, number][];
  followupCount: number;
  followups: Lead[];
};
export type RecordPage = { total: number; rows: (Lead | Booking | Audit)[] };
