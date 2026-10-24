import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { defaultContent } from "../src/lib/content";
test("PostgreSQL migrations, transactions, RLS and role boundaries", async (t) => {
  const db = new PGlite();
  const bootstrap = `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;grant usage on schema public,auth,storage to anon,authenticated,service_role;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant all on storage.objects to anon,authenticated;
 `;
  await db.exec(bootstrap);
  for (const file of [
    "001_initial.sql",
    "002_admin_transactions.sql",
    "003_hardening.sql",
    "004_reporting.sql",
  ])
    await db.exec(
      await readFile(
        new URL("../supabase/migrations/" + file, import.meta.url),
        "utf8",
      ),
    );
  await t.test(
    "combined setup seeds content and backfills existing users without admin privilege",
    async () => {
      const fresh = new PGlite();
      try {
        await fresh.exec(bootstrap);
        await fresh.exec(
          "insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000009','existing@example.com')",
        );
        await fresh.exec(
          await readFile(
            new URL("../supabase/setup-new-project.sql", import.meta.url),
            "utf8",
          ),
        );
        const content = await fresh.query<{ body: typeof defaultContent }>(
          "select body from site_content where id='main'",
        );
        assert.deepEqual(content.rows[0].body, defaultContent);
        const existing = await fresh.query<{ role: string }>(
          "select role from profiles where email='existing@example.com'",
        );
        assert.equal(existing.rows[0].role, "client");
      } finally {
        await fresh.close();
      }
    },
  );
  const a = "00000000-0000-4000-8000-000000000001",
    b = "00000000-0000-4000-8000-000000000002",
    admin = "00000000-0000-4000-8000-000000000003";
  await db.query(
    `insert into auth.users(id,email,raw_user_meta_data) values($1,'a@example.com','{"role":"admin"}'),($2,'b@example.com','{}'),($3,'admin@example.com','{}')`,
    [a, b, admin],
  );
  await db.query(`update profiles set role='admin' where id=$1`, [admin]);
  const role = async (r: string, id = "") => {
    await db.exec("reset role");
    await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [id]);
    await db.exec(`set role ${r}`);
  };
  let leadId = "";
  await t.test("signup metadata cannot grant admin", async () => {
    const { rows } = await db.query<{ role: string }>(
      "select role from profiles where id=$1",
      [a],
    );
    assert.equal(rows[0].role, "client");
  });
  await t.test("service intake is atomic and idempotent", async () => {
    await role("service_role");
    const args = [
      "00000000-0000-4000-8000-000000000011",
      a,
      "Client A",
      "a@example.com",
      "9999999999",
      "A studio",
      "Meta ads",
      "Grow my business",
      "booking",
      new Date(Date.now() + 86400000).toISOString(),
      {},
    ];
    const sql =
      "select submit_enquiry($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) as id";
    const first = await db.query<{ id: string }>(sql, args);
    const second = await db.query<{ id: string }>(sql, args);
    leadId = first.rows[0].id;
    assert.equal(second.rows[0].id, leadId);
    assert.equal((await db.query("select * from bookings")).rows.length, 1);
    await assert.rejects(
      db.query(sql, [
        ...args.slice(0, 0),
        "00000000-0000-4000-8000-000000000012",
        ...args.slice(1, 9),
        "2020-01-01T00:00:00Z",
        {},
      ]),
    );
    assert.equal((await db.query("select * from leads")).rows.length, 1);
  });
  await t.test(
    "client can read own record, not another client’s records or notes",
    async () => {
      await role("authenticated", a);
      assert.equal((await db.query("select * from leads")).rows.length, 1);
      assert.equal((await db.query("select * from bookings")).rows.length, 1);
      assert.equal((await db.query("select * from lead_notes")).rows.length, 0);
      await role("authenticated", b);
      assert.equal((await db.query("select * from leads")).rows.length, 0);
      assert.equal((await db.query("select * from bookings")).rows.length, 0);
    },
  );
  await t.test(
    "client cannot promote themselves, publish content, write records or bypass intake",
    async () => {
      await role("authenticated", a);
      await assert.rejects(
        db.query("update profiles set role='admin' where id=$1", [a]),
      );
      await assert.rejects(
        db.query("select publish_content($1,0)", [defaultContent]),
      );
      await assert.rejects(
        db.query("select update_lead_record($1,'Converted',null,'hacked')", [
          leadId,
        ]),
      );
      await assert.rejects(db.query("select consume_rate_limit('bypass')"));
      await assert.rejects(
        db.query(
          "insert into storage.objects(bucket_id,name) values('site-media','unauthorised.jpg')",
        ),
      );
    },
  );
  await t.test(
    "admin can update lead + private notes and publish with conflict protection",
    async () => {
      await role("authenticated", admin);
      await db.query(
        "select update_lead_record($1,'Follow-up',now()+interval '1 day','Internal note')",
        [leadId],
      );
      assert.equal(
        (await db.query<{ notes: string }>("select notes from lead_notes"))
          .rows[0].notes,
        "Internal note",
      );
      const result = await db.query<{ publish_content: number }>(
        "select publish_content($1,0)",
        [defaultContent],
      );
      assert.equal(result.rows[0].publish_content, 1);
      await assert.rejects(
        db.query("select publish_content($1,0)", [defaultContent]),
      );
      await db.query("select publish_content($1,1)", [defaultContent]);
      await db.query(
        "insert into storage.objects(bucket_id,name) values('site-media','authorised.jpg')",
      );
      assert.ok((await db.query("select * from audit_log")).rows.length >= 5);
      await assert.rejects(
        db.query("update leads set user_id=$1 where id=$2", [b, leadId]),
      );
    },
  );
  await t.test(
    "private notes remain hidden after admin writes them",
    async () => {
      await role("authenticated", a);
      assert.equal((await db.query("select * from lead_notes")).rows.length, 0);
      assert.equal((await db.query("select * from audit_log")).rows.length, 0);
    },
  );
  await t.test("anonymous access is public content only", async () => {
    await role("anon");
    assert.equal((await db.query("select * from site_content")).rows.length, 1);
    await assert.rejects(db.query("select * from leads"));
    await assert.rejects(db.query("select * from profiles"));
    await assert.rejects(db.query("select * from rate_limits"));
  });
  await t.test("rate limiter and webhook claims are durable", async () => {
    await role("service_role");
    for (let i = 1; i <= 6; i++) {
      const { rows } = await db.query<{ allowed: boolean }>(
        "select consume_rate_limit('test') as allowed",
      );
      assert.equal(rows[0].allowed, i <= 5);
    }
    assert.equal(
      (
        await db.query<{ claimed: boolean }>(
          "select claim_webhook_message('message1') as claimed",
        )
      ).rows[0].claimed,
      true,
    );
    assert.equal(
      (
        await db.query<{ claimed: boolean }>(
          "select claim_webhook_message('message1') as claimed",
        )
      ).rows[0].claimed,
      false,
    );
  });
  await t.test("reporting denies client and anonymous access", async () => {
    await role("authenticated", a);
    await assert.rejects(db.query("select admin_summary()"));
    await assert.rejects(db.query("select admin_records('leads')"));
    await role("anon");
    await assert.rejects(db.query("select admin_summary()"));
  });
  await t.test(
    "database pagination and aggregates include records beyond 1000",
    async () => {
      await role("service_role");
      await db.exec(
        "insert into leads(request_id,name,email,phone,service,message,status,source) select gen_random_uuid(),'Bulk'||i,'bulk@example.com','9999999999','Social media','Test requirement',case when i<=2 then 'Converted' else 'New' end,'test-campaign' from generate_series(1,1010) i",
      );
      await role("authenticated", admin);
      const summary = (
        await db.query<{
          result: { totalLeads: number; pipeline: Record<string, number> };
        }>("select admin_summary() result")
      ).rows[0].result;
      assert.equal(summary.totalLeads, 1011);
      assert.equal(summary.pipeline.New, 1008);
      assert.equal(summary.pipeline.Converted, 2);
      type Page = { total: number; rows: { id: string; name: string }[] };
      const read = async (page: number) =>
        (
          await db.query<{ result: Page }>(
            "select admin_records('leads','Bulk','All',$1,15) result",
            [page],
          )
        ).rows[0].result;
      const first = await read(1),
        second = await read(2),
        last = await read(68);
      assert.equal(first.total, 1010);
      assert.equal(first.rows.length, 15);
      assert.equal(last.rows.length, 5);
      assert.equal(
        new Set([...first.rows, ...second.rows].map((r) => r.id)).size,
        30,
      );
      const found = (
        await db.query<{ result: Page }>(
          "select admin_records('leads','Bulk1009') result",
        )
      ).rows[0].result;
      assert.equal(found.total, 1);
      assert.equal(found.rows[0].name, "Bulk1009");
      assert.equal(
        (
          await db.query<{ result: Page }>(
            "select admin_records('customers') result",
          )
        ).rows[0].result.total,
        2,
      );
      assert.equal(
        (
          await db.query<{ result: Page }>(
            "select admin_records('bookings','Client A') result",
          )
        ).rows[0].result.total,
        1,
      );
      assert.equal(
        (
          await db.query<{ result: Page }>(
            "select admin_records('activity','','All',2,15) result",
          )
        ).rows[0].result.rows.length,
        15,
      );
      await assert.rejects(
        db.query("select admin_records('leads','','All',0,15)"),
      );
    },
  );
  await t.test("analytics cache is private and refresh claims are durable", async () => {
    await role("postgres");
    await db.exec(await readFile(new URL("../supabase/migrations/005_analytics_reports.sql", import.meta.url), "utf8"));
    await role("authenticated", admin);
    await assert.rejects(db.query("select * from analytics_reports"));
    await assert.rejects(db.query("select claim_analytics_fetch('clarity')"));
    const version = (await db.query<{version:number}>("select version from site_content")).rows[0].version;
    await db.query("select publish_content($1,$2)", [JSON.stringify(defaultContent),version]);
    await db.query("insert into storage.objects(bucket_id,name) values('site-media','admin.png')");
    await role("service_role");
    assert.equal((await db.query<{ok:boolean}>("select claim_analytics_fetch('clarity') ok")).rows[0].ok,true);
    assert.equal((await db.query<{ok:boolean}>("select claim_analytics_fetch('clarity') ok")).rows[0].ok,false);
    await db.exec("update analytics_reports set next_fetch_at=now()-interval '1 minute'");
    assert.equal((await db.query<{ok:boolean}>("select claim_analytics_fetch('clarity') ok")).rows[0].ok,true);
  });
  await db.close();
});
