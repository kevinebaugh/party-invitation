// Demo only. Pretends to be the Worker so the real invitation and admin pages work on static hosting.
// Data lives in the visitor's own browser (localStorage), so nothing is shared or sent anywhere.
(() => {
  const THEMES = __THEMES__;
  const MAX_KIDS = __MAXKIDS__;
  const DATA_KEY = "party-demo-v1", AUTH_KEY = "party-demo-auth", THEME_KEY = "party-demo-theme", SCROLL_KEY = "party-demo-scroll";

  const safe = (area) => {
    try { const s = window[area]; s.setItem("_t", "1"); s.removeItem("_t"); return s; }
    catch { const m = {}; return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } }; }
  };
  const local = safe("localStorage"), session = safe("sessionStorage");

  // ---- fake database ----
  const stamp = (minsAgo) => new Date(Date.now() - minsAgo * 60000).toISOString().replace("T", " ").slice(0, 19);
  const row = (id, ago, o) => ({ id, created_at: stamp(ago), updated_at: stamp(ago), deleted_at: null, parents_staying: 0, food_preference: "", allergies: "", notes: "", ...o, key: `${o.child_name}|${o.parent_name}`.toLowerCase() });
  const seed = () => [
    row(1, 5200, { child_name: "Sam And Jo", parent_name: "Taylor Reed", attending: 1, num_kids: 2, food_preference: "Cheese, Pepperoni", notes: "Jo is bringing a card!" }),
    row(2, 3100, { child_name: "Priya", parent_name: "Anita Rao", attending: 1, num_kids: 1, parents_staying: 1, food_preference: "Anything is fine", allergies: "Peanuts" }),
    row(3, 1500, { child_name: "Marcus", parent_name: "Dee Johnson", attending: 1, num_kids: 1, food_preference: "Hawaiian (controversial)" }),
    row(4, 900, { child_name: "Lena", parent_name: "Chris Park", attending: 0, num_kids: 0, notes: "So sorry, we're away that weekend!" }),
    row(5, 240, { child_name: "Noah", parent_name: "Jamie Cole", attending: 1, num_kids: 1, food_preference: "Cheese, Sausage", allergies: "Gluten-free" }),
    { ...row(6, 60, { child_name: "Test Entry", parent_name: "Test", attending: 1, num_kids: 1 }), deleted_at: stamp(30) },
  ];
  const save = (v) => local.setItem(DATA_KEY, JSON.stringify(v));
  const load = () => {
    try { const v = JSON.parse(local.getItem(DATA_KEY)); if (Array.isArray(v)) return v; } catch {}
    const v = seed(); save(v); return v;
  };

  // ---- same rules as the real Worker ----
  const clean = (v, max) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
  const titleCase = (s) => s.replace(/(^|[\s\-'’])(\p{L})/gu, (m, p, c) => p + c.toUpperCase());
  function parse(b) {
    const child = titleCase(clean(b.child_name, 80)), parent = titleCase(clean(b.parent_name, 80));
    const valid = b.attending === true || b.attending === false || b.attending === "yes" || b.attending === "no";
    if (!child || !parent || !valid) return { error: "Please add both names and pick yes or no." };
    const attending = b.attending === true || b.attending === "yes";
    return {
      child_name: child, parent_name: parent, attending: attending ? 1 : 0,
      parents_staying: attending && b.parents_staying === true ? 1 : 0,
      num_kids: attending ? Math.min(MAX_KIDS, Math.max(1, Math.floor(Number(b.num_kids)) || 1)) : 0,
      food_preference: clean(b.food_preference, 300), allergies: clean(b.allergies, 200), notes: clean(b.notes, 500),
      key: `${child}|${parent}`.toLowerCase(),
    };
  }

  const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const authed = () => session.getItem(AUTH_KEY) === "1";

  async function handle(path, method, body) {
    await sleep(250); // feel like a network
    let m;
    if (path === "/api/rsvp" && method === "POST") {
      if (body.website) return json({ ok: true });
      const r = parse(body);
      if (r.error) return json({ error: r.error }, 400);
      const rows = load(), existing = rows.find((x) => x.key === r.key);
      if (existing) Object.assign(existing, r, { deleted_at: null, updated_at: stamp(0) });
      else rows.push({ id: Math.max(0, ...rows.map((x) => x.id)) + 1, created_at: stamp(0), updated_at: stamp(0), deleted_at: null, ...r });
      save(rows);
      return json({ ok: true, attending: !!r.attending });
    }
    if (path === "/api/admin/login" && method === "POST") {
      if (body.passphrase !== "demo") return json({ error: "Nope" }, 401);
      session.setItem(AUTH_KEY, "1");
      return json({ ok: true });
    }
    if (!path.startsWith("/api/admin/")) return json({ error: "Not found" }, 404);
    if (!authed()) return json({ error: "Unauthorized" }, 401);
    const rows = load();
    if (path === "/api/admin/rsvps" && method === "GET") return json({ rsvps: [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at)) });
    if ((m = path.match(/^\/api\/admin\/rsvps\/(\d+)\/restore$/)) && method === "POST") {
      const x = rows.find((r) => r.id === +m[1]); if (x) x.deleted_at = null; save(rows); return json({ ok: true });
    }
    if ((m = path.match(/^\/api\/admin\/rsvps\/(\d+)$/))) {
      const id = +m[1], x = rows.find((r) => r.id === id);
      if (method === "DELETE") {
        if (body.hard) save(rows.filter((r) => r.id !== id)); else { if (x) x.deleted_at = stamp(0); save(rows); }
        return json({ ok: true });
      }
      if (method === "PUT") {
        if (!x) return json({ error: "Not found" }, 404);
        const r = parse(body);
        if (r.error) return json({ error: r.error }, 400);
        if (rows.some((o) => o.id !== id && o.key === r.key)) return json({ error: "Another RSVP already has that child and parent name." }, 409);
        Object.assign(x, r, { updated_at: stamp(0) }); save(rows);
        return json({ ok: true });
      }
    }
    return json({ error: "Not found" }, 404);
  }

  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url, location.href);
    if (!url.pathname.startsWith("/api/")) return realFetch(input, init);
    let body = {};
    try { body = init.body ? JSON.parse(init.body) : {}; } catch {}
    if (init.method === "DELETE" && url.searchParams.get("hard") === "1") body = { hard: true };
    return handle(url.pathname, (init.method || "GET").toUpperCase(), body);
  };

  // ---- demo bar: theme switcher ----
  const onAdmin = /\/admin\/?$/.test(location.pathname);
  const current = THEMES.find((t) => new RegExp(`/${t.id}/?$`).test(location.pathname));
  if (current) session.setItem(THEME_KEY, current.id);
  const lastTheme = session.getItem(THEME_KEY) || THEMES[0].id;

  const css = `
  .demo-bar{position:sticky;top:0;z-index:1000;flex-shrink:0;display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(15,15,35,.92);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
    border-bottom:1px solid rgba(255,255,255,.15);font:700 14px/1 system-ui,-apple-system,sans-serif;color:#fff;overflow-x:auto;white-space:nowrap;scrollbar-width:none}
  .demo-bar::-webkit-scrollbar{display:none}
  .demo-bar .tag{flex:none;color:#ffd23f;letter-spacing:.08em;text-transform:uppercase;font-size:12px;margin-right:2px}
  .demo-bar a,.demo-bar button{flex:none;display:inline-flex;align-items:center;gap:7px;padding:9px 12px;border-radius:999px;border:2px solid rgba(255,255,255,.22);background:transparent;color:#fff;
    font:inherit;text-decoration:none;cursor:pointer}
  .demo-bar a.on{background:#fff;color:#111;border-color:#fff}
  .demo-bar i{width:11px;height:11px;border-radius:50%;display:inline-block;border:1px solid rgba(0,0,0,.25)}
  .demo-bar .sp{flex:1}
  .demo-bar .note{flex:none;color:#b9b9d8;font-weight:600;margin-left:6px}
  body.demo-admin{padding-top:0!important}
  body.demo-admin .demo-bar{margin:0 -20px 16px}
  @media (max-width:720px){body.demo-admin .demo-bar{margin:0 -14px 14px}}`;
  document.addEventListener("DOMContentLoaded", () => {
    const style = document.createElement("style"); style.textContent = css; document.head.appendChild(style);
    const bar = document.createElement("nav");
    bar.className = "demo-bar"; bar.setAttribute("aria-label", "Demo controls");
    const chip = (href, label, dot, on) => `<a href="${href}" class="${on ? "on" : ""}" ${on ? 'aria-current="page"' : ""}>${dot ? `<i style="background:${dot}"></i>` : ""}${label}</a>`;
    if (onAdmin) {
      bar.innerHTML = `<span class="tag">Demo</span>${chip(`../${lastTheme}/`, "← Invitation")}<span class="sp"></span><span class="note">Passphrase: <b>demo</b></span><button id="demo-reset" type="button">Reset demo data</button>`;
    } else {
      bar.innerHTML = `<span class="tag">Demo</span>${THEMES.map((t) => chip(`../${t.id}/`, t.name, t.accent, current && t.id === current.id)).join("")}<span class="sp"></span>${chip("../admin/", "Admin page")}<span class="note">Nothing is saved to a server</span>`;
    }
    if (onAdmin) document.body.classList.add("demo-admin");
    document.body.insertBefore(bar, document.body.firstChild);
    // keep your place when flipping themes
    bar.addEventListener("click", (e) => { if (e.target.closest("a")) session.setItem(SCROLL_KEY, String(scrollY)); });
    const reset = document.getElementById("demo-reset");
    if (reset) reset.addEventListener("click", () => { local.removeItem(DATA_KEY); session.removeItem(AUTH_KEY); location.reload(); });
    const hint = document.querySelector("#login");
    if (hint) { const p = document.createElement("p"); p.style.cssText = "flex-basis:100%;text-align:center;color:#b9b9d8;margin:0"; p.innerHTML = "Demo passphrase: <b>demo</b>"; hint.appendChild(p); }
  });
  window.addEventListener("load", () => {
    const y = Number(session.getItem(SCROLL_KEY));
    if (y) { session.removeItem(SCROLL_KEY); document.documentElement.style.scrollBehavior = "auto"; window.scrollTo(0, y); document.documentElement.style.scrollBehavior = ""; }
  });
})();
