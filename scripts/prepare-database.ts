import { readFileSync, writeFileSync } from "node:fs";
import { defaultContent } from "../src/lib/content";
const names = [
  "001_initial.sql",
  "002_admin_transactions.sql",
  "003_hardening.sql",
  "004_reporting.sql",
];
const sql = names
  .map(
    (name) =>
      `-- ${name}\n` +
      readFileSync(`supabase/migrations/${name}`, "utf8")
        .replace(/^begin;\s*$/gim, "")
        .replace(/^commit;\s*$/gim, ""),
  )
  .join("\n\n");
const seed = JSON.stringify(defaultContent).replaceAll("'", "''");
writeFileSync(
  "supabase/setup-new-project.sql",
  `-- Generated from versioned migrations and current CMS defaults.\n-- Run ONCE in a new project. Transaction rolls back all changes on failure.\nbegin;\n${sql}\n-- Repair profiles for users registered before schema installation.\ninsert into public.profiles(id,email,name) select id,email,left(coalesce(raw_user_meta_data->>'name',''),100) from auth.users where email is not null on conflict(id) do nothing;\ninsert into public.site_content(id,body) values ('main','${seed}'::jsonb) on conflict(id) do nothing;\ncommit;\n`,
);
console.log(
  "Generated transactional schema + CMS seed: supabase/setup-new-project.sql",
);
