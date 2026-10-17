"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Palette,
  ChartNoAxesCombined,
  History,
  ArrowUpRight,
  Search,
  Download,
  ChevronRight,
  X,
  Menu,
  ExternalLink,
} from "lucide-react";
import { ContentEditor } from "./content-editor";
import { SignOut } from "./sign-out";
import type { Content } from "@/lib/content";
import type {
  Lead,
  Booking,
  Audit,
  AdminSummary,
  RecordPage,
} from "@/lib/types";
import { leadStatuses, bookingStatuses } from "@/lib/validation";
import {
  saveLead,
  saveBooking,
  deleteLead,
  fetchRecords,
} from "@/app/admin/actions";
type Tab =
  | "overview"
  | "leads"
  | "bookings"
  | "customers"
  | "content"
  | "analytics"
  | "activity";
const tabs: [Tab, string, typeof Users][] = [
  ["overview", "Overview", LayoutDashboard],
  ["leads", "Leads & enquiries", Users],
  ["bookings", "Bookings", CalendarDays],
  ["customers", "Customers", Users],
  ["content", "Website content", Palette],
  ["analytics", "Tracking & insights", ChartNoAxesCombined],
  ["activity", "Activity log", History],
];
const date = (s: string) =>
  new Date(s).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
function localDate(s: string | null) {
  if (!s) return "";
  const d = new Date(s);
  return new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 16);
}
export function AdminDashboard({
  leads,
  content,
  version,
  name,
  summary,
}: {
  leads: Lead[];
  content: Content;
  version: number;
  name: string;
  summary: AdminSummary;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [nav, setNav] = useState(false);
  const [contentDirty, setContentDirty] = useState(false);
  const router = useRouter();
  const { totalLeads, totalBookings } = summary;
  const [records, setRecords] = useState<RecordPage>({ total: 0, rows: [] });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => {
    setRefreshKey((k) => k + 1);
    router.refresh();
  };
  useEffect(() => {
    if (!["leads", "customers", "bookings", "activity"].includes(tab)) return;
    let active = true;
    setLoading(true);
    setLoadError("");
    const timeout = setTimeout(() => {
      fetchRecords({ kind: tab, search, status, page })
        .then((data) => {
          if (active) {
            setRecords(data);
            if (page > 1 && data.rows.length === 0)
              setPage(Math.max(1, Math.ceil(data.total / 15)));
          }
        })
        .catch(() => {
          if (active)
            setLoadError(
              "Records could not be loaded. Please refresh and try again.",
            );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [tab, search, status, page, refreshKey]);
  const filtered = records.rows as Lead[];
  const bookings = records.rows as Booking[];
  const audit = records.rows as Audit[];
  const pagination = (
    <div className="pagination">
      <span>
        {records.total} records · Page {page} of{" "}
        {Math.max(1, Math.ceil(records.total / 15))}
      </span>
      <div>
        <button
          disabled={loading || page === 1}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>
        <button
          disabled={loading || page * 15 >= records.total}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );

  useEffect(() => {
    if (!selected && !booking) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = document.querySelector<HTMLElement>(".record-panel");
    const controls = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),a[href],input,select,textarea",
        ) || [],
      );
    controls()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        setSelected(null);
        setBooking(null);
      }
      if (e.key === "Tab") {
        const a = controls();
        const first = a[0],
          last = a[a.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, [selected?.id, booking?.id, busy]);
  const converted = summary.pipeline.Converted || 0;
  const followups = summary.followups;
  const sources = summary.sources;
  function switchTab(t: Tab) {
    if (
      tab === "content" &&
      t !== tab &&
      contentDirty &&
      !confirm("Leave without publishing your content changes?")
    )
      return;
    if (t !== tab) setContentDirty(false);
    setRecords({ total: 0, rows: [] });
    setLoading(false);
    setLoadError("");
    setTab(t);
    setStatus("All");
    setSearch("");
    setPage(1);
    setNav(false);
  }
  async function handleLead(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setMessage("");
    const f = new FormData(e.currentTarget);
    try {
      const value = f.get("follow_up_at");
      const result = await saveLead({
        id: selected.id,
        status: f.get("status"),
        notes: f.get("notes"),
        follow_up_at: value
          ? new Date(String(value) + "+05:30").toISOString()
          : null,
      });
      if (result.error) setMessage(result.error);
      else {
        setSelected(null);
        refresh();
      }
    } catch {
      setMessage("Unable to save. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  async function handleBooking(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!booking) return;
    setBusy(true);
    setMessage("");
    const f = new FormData(e.currentTarget);
    try {
      const value = f.get("scheduled_at");
      const result = await saveBooking({
        id: booking.id,
        status: f.get("status"),
        notes: f.get("notes"),
        scheduled_at: value
          ? new Date(String(value) + "+05:30").toISOString()
          : null,
      });
      if (result.error) setMessage(result.error);
      else {
        setBooking(null);
        refresh();
      }
    } catch {
      setMessage("Unable to save. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  function openLead(l: Lead) {
    setSelected(l);
    setMessage("");
  }
  const leadTable = (items: Lead[]) =>
    items.length ? (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Contact</th>
              <th>Service</th>
              <th>Source</th>
              <th>Status</th>
              <th>Received</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <tr key={l.id}>
                <td>
                  <button className="table-name" onClick={() => openLead(l)}>
                    {l.name}
                  </button>
                  <small>{l.business || l.email}</small>
                </td>
                <td>{l.service}</td>
                <td>
                  <span className="source-chip">{l.source}</span>
                </td>
                <td>
                  <span
                    className={`status-badge status-${l.status.toLowerCase().replaceAll(" ", "-")}`}
                  >
                    {l.status}
                  </span>
                </td>
                <td>{date(l.created_at)}</td>
                <td>
                  <button
                    aria-label={`Open ${l.name}`}
                    className="icon-button"
                    onClick={() => openLead(l)}
                  >
                    <ChevronRight size={17} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="empty">
        <Users size={30} />
        <h3>No leads here yet.</h3>
        <p>
          New website enquiries will appear here. Try another filter if you’re
          looking for a specific request.
        </p>
      </div>
    );
  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${nav ? "open" : ""}`}>
        <Link className="brand" href="/">
          <span className="footer-mark">∞</span>
          <span>
            <strong>ADS Solutions</strong>
            <small>GROWTH WORKSPACE</small>
          </span>
        </Link>
        <span className="sidebar-label">WORKSPACE</span>
        <nav>
          {tabs.map(([id, label, Icon]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => switchTab(id)}
            >
              <Icon size={18} />
              {label}
              {id === "leads" && (
                <span className="nav-count">{totalLeads}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/" target="_blank">
            View live website <ExternalLink size={15} />
          </Link>
          <div className="admin-user">
            <span>{name.charAt(0).toUpperCase()}</span>
            <div>
              <strong>{name}</strong>
              <small>Administrator</small>
            </div>
          </div>
          <SignOut />
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <button
            className="icon-button admin-menu"
            aria-label="Toggle sidebar"
            onClick={() => setNav(!nav)}
          >
            <Menu size={20} />
          </button>
          <span>
            Workspace <ChevronRight size={13} />{" "}
            {tabs.find((t) => t[0] === tab)?.[1]}
          </span>
          <div>
            <span className="online-dot" /> Connected to Supabase
          </div>
        </header>
        <main className="admin-content">
          <div className="admin-heading">
            <div>
              <span className="eyebrow">ADS SOLUTIONS · ADMIN</span>
              <h1>
                {tab === "overview"
                  ? "A clear view of what’s next."
                  : tabs.find((t) => t[0] === tab)?.[1]}
              </h1>
              <p>
                {tab === "overview"
                  ? `Welcome back, ${name}. Here’s how your business is moving.`
                  : "Manage your business with everything in one place."}
              </p>
            </div>
            <button className="button secondary small" onClick={refresh}>
              Refresh data ↻
            </button>
          </div>
          {loading && (
            <p className="form-status" role="status">
              Loading records…
            </p>
          )}
          {loadError && (
            <p className="form-status error-status" role="alert">
              {loadError}
            </p>
          )}
          {tab === "overview" && (
            <>
              <div className="stat-grid">
                {[
                  [totalLeads, "Total enquiries", Users],
                  [summary.pipeline.New || 0, "New leads", ChartNoAxesCombined],
                  [totalBookings, "Booking requests", CalendarDays],
                  [converted, "Converted leads", ArrowUpRight],
                ].map(([value, label, Icon]) => {
                  const I = Icon as typeof Users;
                  return (
                    <div className="stat-card" key={String(label)}>
                      <div>
                        <span>{String(label)}</span>
                        <I size={18} />
                      </div>
                      <strong>{String(value)}</strong>
                      <small>Live business records</small>
                    </div>
                  );
                })}
              </div>
              <div className="overview-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Lead pipeline</h2>
                    <span>Current status</span>
                  </div>
                  <div className="pipeline">
                    {leadStatuses.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          switchTab("leads");
                          setStatus(s);
                        }}
                      >
                        <span>{s}</span>
                        <div>
                          <i
                            style={{
                              width: `${totalLeads ? ((summary.pipeline[s] || 0) / totalLeads) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <strong>{summary.pipeline[s] || 0}</strong>
                      </button>
                    ))}
                  </div>
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Follow-ups due</h2>
                    <span className="status-badge">
                      {summary.followupCount}
                    </span>
                  </div>
                  {followups.length ? (
                    followups.slice(0, 5).map((l) => (
                      <button
                        className="followup-row"
                        key={l.id}
                        onClick={() => openLead(l)}
                      >
                        <span>
                          <strong>{l.name}</strong>
                          <small>{l.service}</small>
                        </span>
                        <span>
                          {date(l.follow_up_at!)} <ChevronRight size={14} />
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="empty">
                      <CalendarDays size={28} />
                      <p>
                        You’re all caught up.
                        <br />
                        Schedule follow-ups from any lead.
                      </p>
                    </div>
                  )}
                </section>
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <h2>Recent enquiries</h2>
                  <button
                    className="text-link"
                    onClick={() => switchTab("leads")}
                  >
                    View all <ArrowUpRight size={16} />
                  </button>
                </div>
                {leadTable(leads.slice(0, 6))}
              </section>
            </>
          )}
          {(tab === "leads" || tab === "customers") && (
            <section className="panel">
              <div className="table-toolbar">
                <label className="search-box">
                  <Search size={17} />
                  <input
                    aria-label="Search leads"
                    placeholder="Search names, businesses, services…"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </label>
                <select
                  aria-label="Filter lead status"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option>All</option>
                  {leadStatuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <a
                  className="button secondary small"
                  href={`/api/admin/export?${new URLSearchParams({ kind: tab, search, status })}`}
                >
                  <Download size={15} /> Export filtered CSV
                </a>
              </div>
              {tab === "customers" && (
                <p className="table-help">
                  Customers are leads marked Converted. Open a record to view
                  details and private team notes.
                </p>
              )}
              {!loading && !loadError && leadTable(filtered)}
              {pagination}
            </section>
          )}
          {tab === "bookings" && (
            <section className="panel">
              <div className="table-toolbar">
                <label className="search-box">
                  <Search size={17} />
                  <input
                    aria-label="Search bookings"
                    placeholder="Search bookings…"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </label>
                <select
                  aria-label="Filter booking status"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option>All</option>
                  {bookingStatuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Service</th>
                      <th>Requested time · IST</th>
                      <th>Confirmed time · IST</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {!loading &&
                      !loadError &&
                      bookings.map((b) => (
                        <tr key={b.id}>
                          <td>
                            <strong>{b.leads?.name}</strong>
                            <small>{b.leads?.email}</small>
                          </td>
                          <td>{b.leads?.service}</td>
                          <td>{date(b.preferred_at)}</td>
                          <td>
                            {b.scheduled_at
                              ? date(b.scheduled_at)
                              : "Not confirmed"}
                          </td>
                          <td>
                            <span className="status-badge">{b.status}</span>
                          </td>
                          <td>
                            <button
                              className="text-link"
                              onClick={() => {
                                setBooking(b);
                                setMessage("");
                              }}
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {!loading && !loadError && !bookings.length && (
                  <div className="empty">
                    <CalendarDays size={30} />
                    <h3>No booking requests yet.</h3>
                    <p>Visitors can request a time from the contact page.</p>
                  </div>
                )}
              </div>
              {pagination}
            </section>
          )}
          {tab === "content" && (
            <ContentEditor
              initial={content}
              initialVersion={version}
              onDirtyChange={setContentDirty}
            />
          )}
          {tab === "analytics" && (
            <>
              <div className="stat-grid">
                <div className="stat-card">
                  <span>Lead-to-customer rate</span>
                  <strong>
                    {totalLeads
                      ? Math.round((converted / totalLeads) * 100)
                      : 0}
                    %
                  </strong>
                  <small>Converted / all leads</small>
                </div>
                <div className="stat-card">
                  <span>Booking requests</span>
                  <strong>{totalBookings}</strong>
                  <small>Stored requests, not confirmed calls</small>
                </div>
                <div className="stat-card">
                  <span>Campaign sources</span>
                  <strong>{sources.length}</strong>
                  <small>Consent-based UTM attribution</small>
                </div>
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <h2>Where enquiries come from</h2>
                </div>
                <div className="pipeline">
                  {sources.length ? (
                    sources.map(([s, n]) => (
                      <div className="source-row" key={s}>
                        <span>{s}</span>
                        <div>
                          <i
                            style={{
                              width: `${totalLeads ? (n / totalLeads) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <strong>{n}</strong>
                      </div>
                    ))
                  ) : (
                    <p className="empty">
                      Source data will appear with your first enquiries.
                    </p>
                  )}
                </div>
              </section>
              <div className="integration-grid">
                {[
                  [
                    "Google Analytics 4",
                    content.tracking.ga4,
                    "Visitors, sessions, devices, traffic sources and CTA events.",
                    "https://analytics.google.com/",
                  ],
                  [
                    "Meta Pixel",
                    content.tracking.pixel,
                    "PageView, Lead and Schedule conversion events.",
                    "https://business.facebook.com/events_manager2/",
                  ],
                  [
                    "Microsoft Clarity",
                    content.tracking.clarity,
                    "Heatmaps, scrolling and session recordings.",
                    "https://clarity.microsoft.com/",
                  ],
                ].map(([title, id, description, link]) => (
                  <article className="panel integration" key={title}>
                    <ChartNoAxesCombined />
                    <h3>{title}</h3>
                    <span className="status-badge">
                      {id ? "ID configured" : "Not configured"}
                    </span>
                    <p>{description}</p>
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-link"
                    >
                      Open platform <ExternalLink size={14} />
                    </a>
                  </article>
                ))}
              </div>
              <p className="table-help">
                Configure IDs in Website content → Tracking. Website consent is
                required. These panels show setup status, not verification that
                the providers received events. Raw visitor and heatmap reports
                live in their respective platforms.
              </p>
            </>
          )}
          {tab === "activity" && (
            <section className="panel">
              <div className="panel-heading">
                <h2>Change history</h2>
                <span>Full change history</span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Time · IST</th>
                      <th>Record type</th>
                      <th>Action</th>
                      <th>Reference</th>
                      <th>Changes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!loading &&
                      !loadError &&
                      audit.map((a) => (
                        <tr key={a.id}>
                          <td>{date(a.created_at)}</td>
                          <td>{a.entity}</td>
                          <td>{a.action}</td>
                          <td>{a.record_id.slice(0, 8)}</td>
                          <td>{JSON.stringify(a.changes)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {!loading && !loadError && !audit.length && (
                  <p className="empty">
                    Changes to leads, bookings and content will appear here.
                  </p>
                )}
              </div>
              {pagination}
            </section>
          )}
        </main>
      </div>
      {selected && (
        <div
          className="modal-backdrop"
          onClick={() => !busy && setSelected(null)}
        >
          <section
            className="record-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Lead details"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-heading">
              <div>
                <span className="eyebrow">LEAD #{selected.id.slice(0, 8)}</span>
                <h2>{selected.name}</h2>
              </div>
              <button
                className="icon-button"
                aria-label="Close lead"
                onClick={() => setSelected(null)}
              >
                <X />
              </button>
            </div>
            <div className="record-details">
              <a href={`mailto:${selected.email}`}>{selected.email}</a>
              <a href={`tel:${selected.phone}`}>{selected.phone}</a>
              <p>
                {selected.business} · {selected.service}
              </p>
              <p className="message-box">{selected.message}</p>
              <small>
                Source: {selected.source} · Received {date(selected.created_at)}
              </small>
              {Object.entries(selected.attribution || {}).map(([k, v]) => (
                <small key={k}>
                  {k}: {v}
                </small>
              ))}
            </div>
            <form onSubmit={handleLead} className="fields">
              <label className="field">
                Lead status
                <select name="status" defaultValue={selected.status}>
                  {leadStatuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Follow-up time · IST
                <input
                  type="datetime-local"
                  name="follow_up_at"
                  defaultValue={localDate(selected.follow_up_at)}
                />
              </label>
              <label className="field wide">
                Private team notes
                <textarea
                  name="notes"
                  maxLength={10000}
                  defaultValue={selected.lead_notes?.notes || ""}
                />
              </label>
              <button className="button" disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </button>
              <a
                className="button secondary"
                href={`https://wa.me/${selected.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${selected.name}, following up on your ${selected.service} enquiry with ADS Solutions.`)}`}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp ↗
              </a>
              {message && (
                <p className="form-status error-status field wide" role="alert">
                  {message}
                </p>
              )}
            </form>
            <button
              className="danger-link"
              disabled={busy}
              onClick={async () => {
                if (
                  !confirm(
                    "Permanently delete this lead and its associated booking? This cannot be undone.",
                  )
                )
                  return;
                setBusy(true);
                try {
                  const r = await deleteLead(selected.id);
                  if (r.error) setMessage(r.error);
                  else {
                    setSelected(null);
                    refresh();
                  }
                } catch {
                  setMessage("Deletion failed. Retry.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Delete lead and booking
            </button>
          </section>
        </div>
      )}
      {booking && (
        <div
          className="modal-backdrop"
          onClick={() => !busy && setBooking(null)}
        >
          <section
            className="record-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Booking details"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-heading">
              <h2>{booking.leads?.name}</h2>
              <button
                className="icon-button"
                aria-label="Close booking"
                onClick={() => setBooking(null)}
              >
                <X />
              </button>
            </div>
            <p className="message-box">
              {booking.leads?.service}
              <br />
              Requested: {date(booking.preferred_at)} IST
            </p>
            <form className="fields" onSubmit={handleBooking}>
              <label className="field">
                Status
                <select name="status" defaultValue={booking.status}>
                  {bookingStatuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Confirmed time · IST
                <input
                  type="datetime-local"
                  name="scheduled_at"
                  defaultValue={localDate(booking.scheduled_at)}
                />
              </label>
              <label className="field wide">
                Private team notes
                <textarea
                  name="notes"
                  maxLength={10000}
                  defaultValue={booking.booking_notes?.notes || ""}
                />
              </label>
              <button className="button" disabled={busy}>
                {busy ? "Saving…" : "Save booking"}
              </button>
              {message && (
                <p className="form-status error-status field wide" role="alert">
                  {message}
                </p>
              )}
            </form>
            <p className="table-help">
              Contact the client to confirm the change. Saving does not send a
              message.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
