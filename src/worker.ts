// RSVP API + admin API. The invitation and admin pages are static files in ./dist (see scripts/build.mjs).
import config from "./config.generated.json";

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ADMIN_PASSPHRASE: string;
  // Optional: add `"send_email": [{ "name": "EMAIL" }]` to wrangler.jsonc to enable notifications (see README).
  EMAIL?: { send(msg: { to: string | string[]; from: string; subject: string; text: string; html?: string }): Promise<unknown> };
}

const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });

const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

const hex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function sign(env: Env, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.ADMIN_PASSPHRASE),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

// Compare in constant time so the passphrase can't be guessed from response timing.
function safeEqual(a: string, b: string) {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

async function isAdmin(req: Request, env: Env) {
  if (!env.ADMIN_PASSPHRASE) return false;
  const m = /(?:^|; )party_admin=([^;]+)/.exec(req.headers.get("cookie") ?? "");
  return !!m && safeEqual(m[1], await sign(env, "admin-v1"));
}

const escHtml = (s: unknown) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const titleCase = (s: string) => s.replace(/(^|[\s\-'’])(\p{L})/gu, (_m, p: string, c: string) => p + c.toUpperCase());

type Parsed = { values: readonly (string | number)[]; attending: boolean };

function parseRsvp(b: Record<string, unknown>): Parsed | { error: string } {
  const child = titleCase(clean(b.child_name, 80));
  const parent = titleCase(clean(b.parent_name, 80));
  const attending = b.attending === true || b.attending === "yes";
  if (!child || !parent || (b.attending !== true && b.attending !== false && b.attending !== "yes" && b.attending !== "no"))
    return { error: config.copy.errorMissing };
  const staying = attending && b.parents_staying === true ? 1 : 0;
  const kids = attending ? Math.min(config.maxKids, Math.max(1, Math.floor(Number(b.num_kids)) || 1)) : 0;
  const key = `${child.toLowerCase()}|${parent.toLowerCase()}`;
  const values = [child, parent, attending ? 1 : 0, staying, clean(b.food_preference, 160), clean(b.allergies, 200), clean(b.notes, 500), key, kids] as const;
  return { values, attending };
}

async function notify(env: Env, origin: string, r: Parsed) {
  const { to, from } = config.notify;
  if (!env.EMAIL || !to.length || !from) return; // notifications are optional
  const [child, parent, , staying, food, allergies, notes, , kids] = r.values;
  const kidWord = kids === 1 ? "kid" : "kids";
  const adminUrl = `${origin}/admin`;
  const rows: [string, string][] = [
    ["Coming", r.attending ? `Yes, ${kids} ${kidWord}` : "No"],
    ...(r.attending ? ([["Parent", staying ? "Staying" : "Drop-off"]] as [string, string][]) : []),
    ...(food ? ([[config.foodLabel, String(food)]] as [string, string][]) : []),
    ...(allergies ? ([["Allergies / dietary", String(allergies)]] as [string, string][]) : []),
    ...(notes ? ([["Notes", String(notes)]] as [string, string][]) : []),
  ];
  const text = [`New RSVP for ${config.emailBrand} (${config.emailDate})`, "", `${child} (parent: ${parent})`, ...rows.map(([k, v]) => `${k}: ${v}`), "", `Guest list: ${adminUrl}`].join("\n");
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f4f8;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1d1d3a">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e0e0ee">
<div style="background:${r.attending ? "#1f8f55" : "#6b6b85"};color:#fff;padding:16px 20px;font-size:13px;letter-spacing:.06em;text-transform:uppercase">${escHtml(config.emailBrand)} · ${escHtml(config.emailDate)}<br><span style="font-size:18px;font-weight:700;letter-spacing:0;text-transform:none">${r.attending ? "New RSVP: Yes" : "New RSVP: Can't make it"}</span></div>
<div style="padding:20px">
<div style="font-size:22px;font-weight:700">${escHtml(child)}</div>
<div style="color:#6b6b85;margin:2px 0 16px">Parent: ${escHtml(parent)}</div>
<table style="width:100%;border-collapse:collapse;font-size:15px">${rows.map(([k, v]) => `<tr><td style="padding:8px 0;border-top:1px solid #eee;color:#6b6b85;width:40%;vertical-align:top">${escHtml(k)}</td><td style="padding:8px 0;border-top:1px solid #eee;font-weight:600">${escHtml(v)}</td></tr>`).join("")}</table>
<a href="${escHtml(adminUrl)}" style="display:inline-block;margin-top:20px;background:#4b4bd6;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;font-size:14px">Open guest list</a>
</div></div></body></html>`;
  const res = await env.EMAIL.send({
    to,
    from,
    subject: r.attending
      ? `${config.emailBrand} RSVP: ${child} is coming (${kids} ${kidWord})`
      : `${config.emailBrand} RSVP: ${child} can't make it`,
    html,
    text,
  });
  console.log("notify sent", JSON.stringify(res));
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === "/api/rsvp" && req.method === "POST") {
      let b: Record<string, unknown>;
      try {
        b = await req.json();
      } catch {
        return json({ error: "Bad request" }, 400);
      }
      if (b.website) return json({ ok: true }); // honeypot: bots fill the hidden field
      const r = parseRsvp(b);
      if ("error" in r) return json({ error: r.error }, 400);
      await env.DB.prepare(
        `INSERT INTO rsvps (child_name, parent_name, attending, parents_staying, food_preference, allergies, notes, key, num_kids)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)
         ON CONFLICT(key) DO UPDATE SET attending=?3, parents_staying=?4, food_preference=?5,
           allergies=?6, notes=?7, num_kids=?9, deleted_at=NULL, updated_at=datetime('now')`,
      )
        .bind(...r.values)
        .run();
      ctx.waitUntil(notify(env, url.origin, r).catch((e) => console.error("notify failed", e)));
      return json({ ok: true, attending: r.attending });
    }

    if (path === "/api/admin/login" && req.method === "POST") {
      const b = (await req.json().catch(() => ({}))) as { passphrase?: string };
      if (!env.ADMIN_PASSPHRASE || !safeEqual(String(b.passphrase ?? ""), env.ADMIN_PASSPHRASE)) return json({ error: "Nope" }, 401);
      return json({ ok: true }, 200, {
        "set-cookie": `party_admin=${await sign(env, "admin-v1")}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`,
      });
    }

    if (path === "/api/admin/rsvps") {
      if (!(await isAdmin(req, env))) return json({ error: "Unauthorized" }, 401);
      const { results } = await env.DB.prepare("SELECT * FROM rsvps ORDER BY created_at DESC").all();
      return json({ rsvps: results });
    }

    const one = path.match(/^\/api\/admin\/rsvps\/(\d+)$/);
    if (one && (req.method === "PUT" || req.method === "DELETE")) {
      if (!(await isAdmin(req, env))) return json({ error: "Unauthorized" }, 401);
      const id = Number(one[1]);
      if (req.method === "DELETE") {
        // soft delete by default (restorable); ?hard=1 removes the row for good
        const sql = url.searchParams.get("hard") === "1"
          ? "DELETE FROM rsvps WHERE id = ?1"
          : "UPDATE rsvps SET deleted_at = datetime('now') WHERE id = ?1";
        await env.DB.prepare(sql).bind(id).run();
        return json({ ok: true });
      }
      const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
      if (!b) return json({ error: "Bad request" }, 400);
      const r = parseRsvp(b);
      if ("error" in r) return json({ error: r.error }, 400);
      try {
        const res = await env.DB.prepare(
          `UPDATE rsvps SET child_name=?1, parent_name=?2, attending=?3, parents_staying=?4, food_preference=?5,
             allergies=?6, notes=?7, key=?8, num_kids=?9, updated_at=datetime('now') WHERE id=?10`,
        )
          .bind(...r.values, id)
          .run();
        if (!res.meta.changes) return json({ error: "Not found" }, 404);
      } catch {
        return json({ error: "Another RSVP already has that child and parent name." }, 409);
      }
      return json({ ok: true });
    }

    const restore = path.match(/^\/api\/admin\/rsvps\/(\d+)\/restore$/);
    if (restore && req.method === "POST") {
      if (!(await isAdmin(req, env))) return json({ error: "Unauthorized" }, 401);
      await env.DB.prepare("UPDATE rsvps SET deleted_at = NULL WHERE id = ?1").bind(Number(restore[1])).run();
      return json({ ok: true });
    }

    if (path.startsWith("/api/")) return json({ error: "Not found" }, 404);
    return env.ASSETS.fetch(req);
  },
};
