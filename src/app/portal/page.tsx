import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/data";
import { SignOut } from "@/components/sign-out";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Client portal",
  robots: { index: false, follow: false },
};
export default async function Portal({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const pageValue = (v: unknown) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= 1 && n <= 1000000 ? n : 1;
  };
  const enquiriesPage = pageValue(params.enquiries),
    bookingsPage = pageValue(params.bookings);
  const pager = (
    kind: "enquiries" | "bookings",
    page: number,
    total: number,
  ) => (
    <nav className="pagination" aria-label={`${kind} pages`}>
      <span>
        {total} requests · Page {page}
      </span>
      <div>
        {page > 1 && (
          <Link
            href={`/portal?enquiries=${kind === "enquiries" ? page - 1 : enquiriesPage}&bookings=${kind === "bookings" ? page - 1 : bookingsPage}`}
          >
            Previous
          </Link>
        )}
        {page * 10 < total && (
          <Link
            href={`/portal?enquiries=${kind === "enquiries" ? page + 1 : enquiriesPage}&bookings=${kind === "bookings" ? page + 1 : bookingsPage}`}
          >
            Next
          </Link>
        )}
      </div>
    </nav>
  );
  const { db, user, profile } = await requireUser();
  if (profile?.role === "admin") redirect("/admin");
  const [leads, bookings] = await Promise.all([
    db
      .from("leads")
      .select("id,service,status,created_at,message", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range((enquiriesPage - 1) * 10, enquiriesPage * 10 - 1),
    db
      .from("bookings")
      .select("id,preferred_at,scheduled_at,status", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range((bookingsPage - 1) * 10, bookingsPage * 10 - 1),
  ]);
  if (leads.error || bookings.error)
    throw new Error("Unable to load your requests.");
  return (
    <main className="portal container">
      <header className="portal-header">
        <Link href="/" className="brand">
          <span className="footer-mark">∞</span>
          <strong>ADS Solutions</strong>
        </Link>
        <SignOut />
      </header>
      <div className="section-top">
        <div>
          <span className="eyebrow">YOUR CLIENT PORTAL</span>
          <h1>Hi, {profile?.name || "there"}.</h1>
          <p>Here’s where things stand. Let’s keep moving forward.</p>
        </div>
        <Link className="button" href="/contact">
          New request ↗
        </Link>
      </div>
      <h2>Your enquiries</h2>
      <div className="portal-list">
        {leads.data?.length ? (
          leads.data.map((l) => (
            <article key={l.id}>
              <div>
                <small>
                  #{l.id.slice(0, 8).toUpperCase()} ·{" "}
                  {new Date(l.created_at).toLocaleDateString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}
                </small>
                <h3>{l.service}</h3>
                <p>{l.message}</p>
              </div>
              <span className="status-badge">{l.status}</span>
            </article>
          ))
        ) : (
          <p className="empty">
            No enquiries yet. Submit your first request while signed in and
            track it here.
          </p>
        )}
      </div>
      {pager("enquiries", enquiriesPage, leads.count || 0)}
      <h2>Your booking requests</h2>
      <div className="portal-list">
        {bookings.data?.length ? (
          bookings.data.map((b) => (
            <article key={b.id}>
              <div>
                <h3>
                  {b.status === "Requested" ? "Preferred time" : "Appointment"}
                </h3>
                <p>
                  {new Date(b.scheduled_at || b.preferred_at).toLocaleString(
                    "en-IN",
                    {
                      timeZone: "Asia/Kolkata",
                      dateStyle: "medium",
                      timeStyle: "short",
                    },
                  )}{" "}
                  IST
                </p>
                {b.status === "Requested" && (
                  <small>Awaiting confirmation from the ADS team.</small>
                )}
              </div>
              <span className="status-badge">{b.status}</span>
            </article>
          ))
        ) : (
          <p className="empty">No booking requests yet.</p>
        )}
      </div>
      {pager("bookings", bookingsPage, bookings.count || 0)}
    </main>
  );
}
