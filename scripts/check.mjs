// Builds every theme and checks it in a real browser at phone size.
// These are the things that went wrong (and got fixed) while this template was being built.
//
//   npm run check              checks all themes
//   npm run check -- arcade    checks one theme
//   npm run check -- --shots   also writes screenshots to .cache/shots and previews to docs/previews

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { build, THEMES } from "./build.mjs";
import { launch } from "./og.mjs";

const root = path.resolve(import.meta.dirname, "..");
const argv = process.argv.slice(2);
const wantShots = argv.includes("--shots");
const only = argv.filter((a) => !a.startsWith("--"));
const themes = only.length ? only : THEMES;

const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".svg": "image/svg+xml", ".ics": "text/calendar" };

function serve(dir) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    if (url.pathname === "/api/rsvp" && req.method === "POST") {
      let body = "";
      req.on("data", (d) => (body += d));
      req.on("end", () => {
        const b = JSON.parse(body || "{}");
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ ok: true, attending: !!b.attending }));
      });
      return;
    }
    let p = url.pathname === "/" ? "/index.html" : url.pathname;
    if (p === "/admin") p = "/admin/index.html";
    const file = path.join(dir, p);
    if (!file.startsWith(dir) || !fs.existsSync(file)) { res.statusCode = 404; return res.end("nope"); }
    res.setHeader("content-type", MIME[path.extname(file)] || "application/octet-stream");
    res.end(fs.readFileSync(file));
  });
  return new Promise((r) => server.listen(0, "127.0.0.1", () => r(server)));
}

// WCAG contrast for the colour pairs a theme defines (hex colours only).
const lum = (hex) => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

let failures = 0;
const fail = (theme, msg) => { failures++; console.log(`  FAIL  ${msg}`); };
const ok = (msg) => console.log(`  ok    ${msg}`);

// Your own config: does it build? (written to .cache only; never to docs/)
try {
  await build({ out: path.join(root, ".cache", "check", "_yours"), "skip-og": true });
  ok("your event config builds");
} catch (e) {
  fail("config", `your event config doesn't build: ${e.message}`);
}

const browser = await launch();
try {
  for (const id of themes) {
    console.log(`\n${id}`);
    const out = path.join(root, ".cache", "check", id);
    const example = (await import(pathToFileURL(path.join(root, "themes", `${id}.mjs`)).href)).default.example || {};
    // always the fictional demo config, so previews written to docs/previews can never contain a real party
    const { theme, ogFile } = await build({ theme: id, out, config: "scripts/demo.config.json", overrides: example });
    const v = theme.vars;
    const server = await serve(out);
    const base = `http://127.0.0.1:${server.address().port}`;

    // -- colour contrast between the pairs the stylesheet actually uses --
    const pairs = [
      ["card text on card", v["--card-ink"], v["--card"], 4.5],
      ["input text on input", v["--field-ink"], v["--field-bg"], 4.5],
      ["button text on button", v["--accent-ink"], v["--accent"], 4.5],
      ["small button text on small button", v["--accent2-ink"], v["--accent2"], 4.5],
      ["links on card", v["--link"], v["--card"], 4.5],
      ["labels on card", v["--label"], v["--card"], 4.5],
      ["headings on card", v["--h2"], v["--card"], 3],
      ["error text on card", v["--warn"], v["--card"], 4.5],
    ];
    for (const [name, fg, bg, min] of pairs) {
      const r = ratio(fg, bg);
      r >= min ? ok(`contrast ${name}: ${r.toFixed(1)}`) : fail(id, `contrast ${name} is ${r.toFixed(1)}, needs ${min}`);
    }

    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error" && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) errors.push(m.text()); });
    await page.goto(base + "/", { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    errors.length ? fail(id, `console errors: ${errors.join("; ")}`) : ok("no console errors");

    const fit = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
    fit.sw <= fit.iw ? ok("no horizontal overflow at 375px") : fail(id, `horizontal overflow: ${fit.sw} > ${fit.iw}`);

    const meta = await page.evaluate(() => ({
      viewport: document.querySelector('meta[name=viewport]').content,
      touch: getComputedStyle(document.documentElement).touchAction,
      overscrollY: getComputedStyle(document.documentElement).overscrollBehaviorY,
      userSelect: getComputedStyle(document.body).userSelect,
      cursor: getComputedStyle(document.body).cursor,
    }));
    /user-scalable=no/.test(meta.viewport) && /maximum-scale=1/.test(meta.viewport) ? ok("zoom locked") : fail(id, "viewport doesn't lock zoom");
    meta.touch === "pan-y" ? ok("touch-action: pan-y (no sideways pan)") : fail(id, `touch-action is ${meta.touch}`);
    meta.overscrollY === "auto" ? ok("vertical overscroll left on (pull-to-refresh works)") : fail(id, `overscroll-behavior-y is ${meta.overscrollY}`);
    meta.userSelect !== "none" && (meta.cursor === "auto" || meta.cursor === "default") ? ok("text selectable, default cursor") : fail(id, `user-select ${meta.userSelect}, cursor ${meta.cursor}`);

    const fonts = await page.evaluate(() => ({
      time: getComputedStyle(document.querySelector(".plan b")).fontFamily,
      small: getComputedStyle(document.querySelector(".btn.small")).fontFamily,
      label: getComputedStyle(document.querySelector("dt")).fontFamily,
    }));
    [fonts.time, fonts.small, fonts.label].every((f) => !f.includes(theme.fonts.display) || theme.fonts.display === "Nunito")
      ? ok("times, small buttons and labels use the body font (no digits or C/O in the display font)")
      : fail(id, `display font leaked into small text: ${JSON.stringify(fonts)}`);

    // RSVP button: a real <button>, never adds #hash, focuses the name field, scrolls near the card
    const tag = await page.evaluate(() => document.getElementById("rsvp-go").tagName);
    tag === "BUTTON" ? ok("RSVP control is a <button>") : fail(id, `RSVP control is <${tag}>`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator("#rsvp-go").tap({ force: true }); // it pulses, which Playwright reads as "unstable"
    await page.waitForTimeout(1300);
    const after = await page.evaluate(() => ({
      hash: location.hash,
      focus: document.activeElement?.name,
      top: document.getElementById("rsvp").offsetTop - scrollY,
    }));
    after.hash === "" ? ok("URL stays clean after tapping RSVP") : fail(id, `URL gained "${after.hash}"`);
    after.focus === "child_name" ? ok("name field focused") : fail(id, `focused: ${after.focus}`);
    Math.abs(after.top - 16) <= 40 ? ok(`scrolls to the form (card ${Math.round(after.top)}px from top)`) : fail(id, `card is ${Math.round(after.top)}px from the top`);

    // copy that must work for one or several kids
    await page.fill("input[name=child_name]", "max and sam o'brien");
    await page.fill("input[name=parent_name]", "pat lee");
    await page.locator("input[name=parent_name]").blur();
    const names = await page.evaluate(() => ({
      child: document.querySelector("input[name=child_name]").value,
      drop: document.getElementById("dropoff-label").textContent,
      legend: document.getElementById("attend-legend").textContent,
    }));
    names.child === "Max And Sam O'Brien" ? ok("names are Title Cased") : fail(id, `child name is "${names.child}"`);
    /Max And Sam O'Brien/.test(names.drop) && /Max And Sam O'Brien/.test(names.legend) ? ok("labels use the typed names (one or several kids)") : fail(id, `labels: ${names.drop} | ${names.legend}`);

    // submit (mock API)
    await page.check("input[name=attending][value=yes]");
    await page.waitForSelector("#yes-only:not([hidden])");
    await page.locator("#rsvp-form button[type=submit]").click();
    await page.waitForSelector("#done:not([hidden])", { timeout: 4000 }).catch(() => {});
    const done = await page.evaluate(() => ({ visible: !document.getElementById("done").hidden, text: document.getElementById("done-text").textContent }));
    done.visible && done.text.includes("Max And Sam") ? ok("RSVP submit shows a confirmation that works for several names") : fail(id, `confirmation: ${JSON.stringify(done)}`);

    if (wantShots) {
      fs.mkdirSync(path.join(root, ".cache", "shots"), { recursive: true });
      const shot = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
      const sp = await shot.newPage();
      await sp.goto(base + "/", { waitUntil: "networkidle" });
      await sp.waitForTimeout(300);
      await sp.screenshot({ path: path.join(root, ".cache", "shots", `${id}-full.png`), fullPage: true });
      await shot.close();
      fs.mkdirSync(path.join(root, "docs", "previews"), { recursive: true });
      fs.copyFileSync(path.join(out, ogFile), path.join(root, "docs", "previews", `${id}.png`));
    }

    // reduced motion: no scroll-reveal hiding, no animation
    const rm = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: "reduce" });
    const rp = await rm.newPage();
    await rp.goto(base + "/", { waitUntil: "networkidle" });
    const rmState = await rp.evaluate(() => ({
      js: document.documentElement.classList.contains("js"),
      anim: getComputedStyle(document.querySelector(".cta")).animationName,
      cardOpacity: getComputedStyle(document.querySelector(".card")).opacity,
    }));
    !rmState.js && rmState.anim === "none" && rmState.cardOpacity === "1" ? ok("reduced motion respected") : fail(id, `reduced motion: ${JSON.stringify(rmState)}`);
    await rm.close();

    // every invitation links back to the project
    const credit = await page.evaluate(() => { const a = document.querySelector("footer a"); return a ? { href: a.href, text: a.textContent, rel: a.rel, target: a.target } : null; });
    credit && credit.href === "https://github.com/kevinebaugh/party-invitation" && credit.text === "party-invitation" && credit.rel.includes("noopener")
      ? ok("footer links back to party-invitation") : fail(id, `footer link: ${JSON.stringify(credit)}`);

    // preview tags present in the static HTML
    const head = fs.readFileSync(path.join(out, "index.html"), "utf8");
    ["og:title", "og:description", "og:image", "twitter:card"].every((t) => head.includes(t)) ? ok("link-preview tags are in the static HTML") : fail(id, "missing og/twitter tags");
    fs.existsSync(path.join(out, ogFile)) ? ok(`preview image ${ogFile} exists`) : fail(id, "preview image missing");

    await ctx.close();
    server.close();
  }

  // ---- the Worker itself (real code, fake database and mail binding): RSVP email handling + Reply-To ----
  if (!only.length) {
    console.log("\nworker");
    const { build: esbuild } = await import("esbuild");
    const testConfig = {
      maxKids: 5, foodLabel: "Food", emailBrand: "Alex's 7th birthday", emailDate: "Mar 14",
      notify: { to: ["host@example.com"], from: "rsvp@example.com" },
      copy: { errorMissing: "missing fields", errorEmail: "bad email" },
    };
    fs.mkdirSync(path.join(root, ".cache", "worker-test"), { recursive: true });
    const cfgFile = path.join(root, ".cache", "worker-test", "config.json");
    fs.writeFileSync(cfgFile, JSON.stringify(testConfig));
    const bundle = path.join(root, ".cache", "worker-test", "worker.mjs");
    await esbuild({
      entryPoints: [path.join(root, "src", "worker.ts")], outfile: bundle, bundle: true, format: "esm", platform: "neutral", logLevel: "silent",
      plugins: [{ name: "test-config", setup: (b) => b.onResolve({ filter: /config\.generated\.json$/ }, () => ({ path: cfgFile })) }],
    });
    const worker = (await import(pathToFileURL(bundle).href + `?t=${Date.now()}`)).default;

    const makeEnv = () => {
      const db = [], sent = [];
      return {
        db, sent,
        env: {
          ADMIN_PASSPHRASE: "test-pass", ASSETS: { fetch: async () => new Response("asset") },
          EMAIL: { send: async (m) => { sent.push(m); return { messageId: "x" }; } },
          DB: { prepare: (sql) => ({ bind: (...args) => ({ run: async () => { db.push({ sql, args }); return { meta: { changes: 1 } }; }, all: async () => ({ results: [] }) }) }) },
        },
      };
    };
    const post = async (body, e = makeEnv(), url = "https://party.example.com/api/rsvp", method = "POST", headers = {}) => {
      const pending = [];
      const res = await worker.fetch(new Request(url, { method, headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }), e.env, { waitUntil: (p) => pending.push(p) });
      await Promise.all(pending);
      return { res, e, json: await res.json() };
    };
    const rsvp = { child_name: "sam", parent_name: "pat lee", attending: true, num_kids: 1 };

    let t = await post({ ...rsvp, parent_email: "pat.lee@example.com" });
    const m = t.e.sent[0];
    t.res.status === 200 && m && m.replyTo?.email === "pat.lee@example.com" && m.replyTo?.name === "Pat Lee"
      ? ok("a valid email becomes the Reply-To (with the guest's name)") : fail("worker", `replyTo: ${JSON.stringify(m?.replyTo)} status ${t.res.status}`);
    m?.text.includes("Email: pat.lee@example.com") && m?.html.includes("pat.lee@example.com") ? ok("the notification shows the guest's email") : fail("worker", "email missing from notification body");
    t.e.db[0]?.args.at(-1) === "pat.lee@example.com" ? ok("the email is saved with the RSVP") : fail("worker", `db args: ${JSON.stringify(t.e.db[0]?.args)}`);

    t = await post(rsvp);
    t.res.status === 200 && t.e.sent.length === 1 && !("replyTo" in t.e.sent[0]) ? ok("no email given: notification sent without a Reply-To") : fail("worker", `sent: ${JSON.stringify(t.e.sent[0]?.replyTo)}`);

    for (const bad of ["not an email", "a@b", "a@b.com, evil@x.com", "a@b.com\r\nBcc: evil@x.com", '"x y"@b.com', "a@b.com>", "<a@b.com>", "a@@b.com", "a b@c.com", "x@y.com;z@y.com"]) {
      t = await post({ ...rsvp, parent_email: bad });
      t.res.status === 400 && t.json.error === "bad email" && t.e.db.length === 0 && t.e.sent.length === 0 ? null : fail("worker", `accepted a bad email: ${JSON.stringify(bad)} -> ${t.res.status}`);
    }
    ok("malformed and header-injection emails are rejected before saving or sending");

    t = await post({ ...rsvp, parent_name: "Pat <evil@x.com>\"", parent_email: "pat@example.com" });
    /^[\p{L}\p{N} .'’-]+$/u.test(t.e.sent[0]?.replyTo?.name || "") ? ok("odd characters in the guest's name can't reach the Reply-To header") : fail("worker", `name: ${JSON.stringify(t.e.sent[0]?.replyTo)}`);

    t = await post({ ...rsvp, parent_name: "<<>>", parent_email: "pat@example.com" });
    typeof t.e.sent[0]?.replyTo === "string" ? ok("a name with nothing safe left falls back to a plain address") : fail("worker", `replyTo: ${JSON.stringify(t.e.sent[0]?.replyTo)}`);

    // admin edit keeps the email too
    const e2 = makeEnv();
    const login = await post({ passphrase: "test-pass" }, e2, "https://party.example.com/api/admin/login");
    const cookie = login.res.headers.get("set-cookie").split(";")[0];
    const edit = await post({ ...rsvp, parent_email: "new@example.com" }, e2, "https://party.example.com/api/admin/rsvps/7", "PUT", { cookie });
    edit.res.status === 200 && e2.db.at(-1).args.at(9) === "new@example.com" && e2.db.at(-1).args.at(10) === 7 ? ok("admin edit saves the email") : fail("worker", `edit: ${edit.res.status} ${JSON.stringify(e2.db.at(-1)?.args)}`);
    const badEdit = await post({ ...rsvp, parent_email: "nope" }, e2, "https://party.example.com/api/admin/rsvps/7", "PUT", { cookie });
    badEdit.res.status === 400 ? ok("admin edit rejects a bad email") : fail("worker", `bad edit: ${badEdit.res.status}`);
  }

  // ---- optional email field on the form ----
  if (!only.length) {
    console.log("\nemail field");
    const variants = [
      { name: "notifications on", overrides: { notify: { to: ["host@example.com"], from: "rsvp@example.com" }, askEmail: undefined }, expect: true },
      { name: "notifications off", overrides: { notify: { to: [], from: "" }, askEmail: undefined }, expect: false },
      { name: "askEmail forced on", overrides: { notify: { to: [], from: "" }, askEmail: true }, expect: true },
      { name: "askEmail forced off", overrides: { notify: { to: ["host@example.com"], from: "rsvp@example.com" }, askEmail: false }, expect: false },
    ];
    for (const [i, v] of variants.entries()) {
      const outDir = path.join(root, ".cache", "check", `_email${i}`);
      const cfgPath = path.join(root, ".cache", "check", `_email${i}.json`);
      const base = JSON.parse(fs.readFileSync(path.join(root, "scripts", "demo.config.json"), "utf8"));
      delete base.askEmail;
      fs.writeFileSync(cfgPath, JSON.stringify({ ...base, ...Object.fromEntries(Object.entries(v.overrides).filter(([, x]) => x !== undefined)) }));
      await build({ config: path.relative(root, cfgPath), theme: "arcade", out: outDir, "skip-og": true });
      const has = fs.readFileSync(path.join(outDir, "index.html"), "utf8").includes('name="parent_email"');
      has === v.expect ? ok(`${v.name}: email field ${v.expect ? "shown" : "hidden"}`) : fail("email", `${v.name}: field present = ${has}`);
      const adminHidden = fs.readFileSync(path.join(outDir, "admin", "index.html"), "utf8").includes(".col-email{display:none!important}");
      adminHidden === !v.expect ? ok(`${v.name}: admin email column ${v.expect ? "shown" : "hidden"}`) : fail("email", `${v.name}: admin column hidden = ${adminHidden}`);
    }
    // behaviour in a browser: bad email stops the submit, good one is sent, blank is fine
    const outDir = path.join(root, ".cache", "check", "_email0");
    const srv = await serve(outDir);
    const ectx = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: "reduce" });
    const ep = await ectx.newPage();
    let sentBody = null, requests = 0;
    await ep.route("**/api/rsvp", (route) => { requests++; sentBody = JSON.parse(route.request().postData()); route.fulfill({ json: { ok: true, attending: true } }); });
    await ep.goto(`http://127.0.0.1:${srv.address().port}/`, { waitUntil: "networkidle" });
    await ep.fill("input[name=child_name]", "Sam"); await ep.fill("input[name=parent_name]", "Pat");
    await ep.check("input[name=attending][value=yes]");
    await ep.fill("input[name=parent_email]", "pat at example");
    await ep.locator("#rsvp-form button[type=submit]").click();
    await ep.waitForTimeout(250);
    const errText = await ep.$eval("#msg", (e) => e.textContent);
    requests === 0 && /email/i.test(errText) ? ok("a bad email is caught on the page, nothing is sent") : fail("email", `requests ${requests}, message "${errText}"`);
    await ep.fill("input[name=parent_email]", "pat@example.com");
    await ep.locator("#rsvp-form button[type=submit]").click();
    await ep.waitForFunction(() => !document.getElementById("done").hidden);
    sentBody?.parent_email === "pat@example.com" ? ok("a valid email is sent with the RSVP") : fail("email", `sent: ${JSON.stringify(sentBody?.parent_email)}`);
    await ep.click("#again"); await ep.fill("input[name=parent_email]", "");
    await ep.locator("#rsvp-form button[type=submit]").click();
    await ep.waitForFunction(() => !document.getElementById("done").hidden);
    sentBody?.parent_email === "" ? ok("leaving the email blank is fine") : fail("email", `sent: ${JSON.stringify(sentBody?.parent_email)}`);
    await ectx.close(); srv.close();
  }

  // ---- food question: tick-any / pick-one, and the "Something else" write-in ----
  if (!only.length) {
    console.log("\nfood options");
    const options = ["Cheese", "Pepperoni", "Mac - extra cheesy"];
    const scenarios = [
      { name: "tick-any with write-in", food: { question: "Any snacks?", options, multiple: true, other: true } },
      { name: "pick-one with write-in", food: { question: "Which flavour?", options, multiple: false, other: "Something different" } },
    ];
    for (const [i, sc] of scenarios.entries()) {
      const outDir = path.join(root, ".cache", "check", `_food${i}`);
      await build({ config: "scripts/demo.config.json", theme: "arcade", out: outDir, "skip-og": true, overrides: { food: sc.food } });
      const srv = await serve(outDir);
      const fctx = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: "reduce" });
      const fp = await fctx.newPage();
      let sent = null;
      await fp.route("**/api/rsvp", (route) => { sent = JSON.parse(route.request().postData()); route.fulfill({ json: { ok: true, attending: true } }); });
      await fp.goto(`http://127.0.0.1:${srv.address().port}/`, { waitUntil: "networkidle" });
      await fp.fill("input[name=child_name]", "Sam"); await fp.fill("input[name=parent_name]", "Pat");
      await fp.check("input[name=attending][value=yes]");
      const kind = await fp.$eval('input[name=food][value="Cheese"]', (e) => e.type);
      kind === (sc.food.multiple ? "checkbox" : "radio") ? ok(`${sc.name}: options are ${kind === "checkbox" ? "checkboxes" : "radios"}`) : fail("food", `${sc.name}: options are ${kind}`);
      const ph = await fp.$eval("input[name=food_other]", (e) => e.placeholder);
      ph === (sc.food.other === true ? "Something else" : sc.food.other) ? ok(`${sc.name}: write-in label "${ph}"`) : fail("food", `${sc.name}: write-in label "${ph}"`);

      if (sc.food.multiple) {
        await fp.check('input[name=food][value="Cheese"]');
        await fp.fill("input[name=food_other]", "gluten free, dairy free");
        (await fp.isChecked('input[name=food][value="__other__"]')) ? ok("typing in the write-in ticks it") : fail("food", "write-in didn't tick itself");
        await fp.uncheck('input[name=food][value="__other__"]');
        (await fp.inputValue("input[name=food_other]")) === "" ? ok("un-ticking the write-in clears it") : fail("food", "write-in text stayed after un-ticking");
        await fp.check('input[name=food][value="__other__"]');
        (await fp.evaluate(() => document.activeElement.name)) === "food_other" ? ok("ticking the write-in focuses its box") : fail("food", "write-in box not focused");
        await fp.fill("input[name=food_other]", "gluten free, dairy free");
        await fp.locator("#rsvp-form button[type=submit]").click();
        await fp.waitForFunction(() => !document.getElementById("done").hidden);
        sent?.food_preference === "Cheese, gluten free / dairy free" ? ok("saved answer lists ticked items + write-in, commas in the write-in replaced") : fail("food", `saved: ${JSON.stringify(sent?.food_preference)}`);
      } else {
        (await fp.isChecked('input[name=food][value=""]')) ? ok('"No preference" is selected by default') : fail("food", "no default selection");
        await fp.check('input[name=food][value="Pepperoni"]');
        await fp.fill("input[name=food_other]", "just plain");
        const still = await fp.isChecked('input[name=food][value="Pepperoni"]');
        !still && (await fp.isChecked('input[name=food][value="__other__"]')) ? ok("typing a write-in switches away from the other choice") : fail("food", "write-in didn't replace the radio choice");
        await fp.locator("#rsvp-form button[type=submit]").click();
        await fp.waitForFunction(() => !document.getElementById("done").hidden);
        sent?.food_preference === "just plain" ? ok("pick-one saves just the write-in") : fail("food", `saved: ${JSON.stringify(sent?.food_preference)}`);
      }
      await fctx.close(); srv.close();
    }
    // default-selected "No preference" saves nothing
    {
      const outDir = path.join(root, ".cache", "check", "_food1");
      const srv = await serve(outDir);
      const fctx = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: "reduce" });
      const fp = await fctx.newPage();
      let sent = null;
      await fp.route("**/api/rsvp", (route) => { sent = JSON.parse(route.request().postData()); route.fulfill({ json: { ok: true, attending: true } }); });
      await fp.goto(`http://127.0.0.1:${srv.address().port}/`, { waitUntil: "networkidle" });
      await fp.fill("input[name=child_name]", "Sam"); await fp.fill("input[name=parent_name]", "Pat");
      await fp.check("input[name=attending][value=yes]");
      await fp.locator("#rsvp-form button[type=submit]").click();
      await fp.waitForFunction(() => !document.getElementById("done").hidden);
      sent?.food_preference === "" ? ok('pick-one left on "No preference" saves nothing') : fail("food", `saved: ${JSON.stringify(sent?.food_preference)}`);
      await fctx.close(); srv.close();
    }
  }

  // ---- the static demo (themes + switcher + fake in-browser backend), served under a sub-path like GitHub Pages ----
  if (!only.length) {
    console.log("\ndemo");
    execFileSync(process.execPath, [path.join(root, "scripts", "build-demo.mjs")], { stdio: "ignore" });
    const demoDir = path.join(root, "demo");
    const srv = http.createServer((req, res) => {
      const u = new URL(req.url, "http://x");
      if (!u.pathname.startsWith("/pi/")) { res.statusCode = 404; return res.end(); }
      let p = u.pathname.slice(3);
      if (p.endsWith("/")) p += "index.html";
      const file = path.join(demoDir, p);
      if (!file.startsWith(demoDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; return res.end(); }
      res.setHeader("content-type", MIME[path.extname(file)] || "application/octet-stream");
      res.end(fs.readFileSync(file));
    });
    await new Promise((r) => srv.listen(0, "127.0.0.1", r));
    const base = `http://127.0.0.1:${srv.address().port}/pi`;
    const dctx = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: "reduce" });
    const d = await dctx.newPage();
    const derrors = [];
    d.on("pageerror", (e) => derrors.push(e.message));
    await d.goto(`${base}/arcade/`, { waitUntil: "networkidle" });
    const chips = await d.$$eval(".demo-bar a", (as) => as.map((a) => a.textContent.trim()));
    chips.length === THEMES.length + 1 && THEMES.every((t) => chips.some((c) => c.toLowerCase() === t)) ? ok(`switcher lists all ${THEMES.length} themes + admin`) : fail("demo", `chips: ${chips}`);
    (await d.evaluate(() => getComputedStyle(document.body).backgroundColor)) !== "rgba(0, 0, 0, 0)" ? ok("works under a sub-path (styles load)") : fail("demo", "styles didn't load under /pi/");

    await d.evaluate(() => window.scrollTo(0, 600));
    await d.locator(".demo-bar a", { hasText: "Ocean" }).click();
    await d.waitForURL(/\/ocean\/$/);
    await d.waitForLoadState("load");
    await d.waitForTimeout(300);
    const y = await d.evaluate(() => Math.round(scrollY));
    Math.abs(y - 600) < 40 ? ok(`theme switch keeps scroll position (${y}px)`) : fail("demo", `scroll after switch: ${y}`);

    await d.evaluate(() => localStorage.removeItem("party-demo-v1"));
    await d.fill("input[name=child_name]", "riley and kai");
    await d.fill("input[name=parent_name]", "sam ortiz");
    await d.check("input[name=attending][value=yes]");
    await d.locator("#rsvp-form button[type=submit]").click();
    await d.waitForSelector("#done:not([hidden])", { timeout: 4000 }).catch(() => {});
    (await d.evaluate(() => !document.getElementById("done").hidden)) ? ok("demo RSVP is accepted by the fake backend") : fail("demo", "RSVP not confirmed");

    await d.goto(`${base}/admin/`, { waitUntil: "networkidle" });
    await d.fill("#pw", "nope"); await d.locator("#login button").click();
    await d.waitForFunction(() => document.getElementById("err").textContent.length > 0);
    ok("admin rejects a wrong passphrase");
    await d.fill("#pw", "demo"); await d.locator("#login button").click();
    await d.waitForSelector("#list:not([hidden])");
    const names = await d.$$eval("#rows tr .name, #rows tr td:first-child", (els) => els.map((e) => e.textContent));
    names.some((n) => /Riley And Kai/.test(n)) ? ok("the RSVP just sent shows up in the demo admin (names Title Cased)") : fail("demo", `admin rows: ${names}`);
    const stats = await d.$eval("#stats", (e) => e.innerText);
    /Pizza:/.test(stats) && /Other ×1/.test(stats) ? ok("admin totals group write-in answers under \"Other\"") : fail("demo", `stats: ${stats.replace(/\n/g, " ")}`);

    const tabs = () => d.evaluate(() => [document.getElementById("tab-active").textContent, document.getElementById("tab-deleted").textContent]);
    const before = await tabs();
    await d.locator("[data-del]").first().click();
    await d.waitForFunction((t) => document.getElementById("tab-deleted").textContent !== t, before[1]);
    await d.locator("#tab-deleted").click();
    await d.locator("[data-restore]").first().click();
    // wait for the restore to land (it makes two fake network calls), instead of sleeping a fixed time
    await d.waitForFunction((t) => document.getElementById("tab-deleted").textContent === t, before[1], { timeout: 5000 }).catch(() => {});
    const restored = await tabs();
    restored[0] === before[0] && restored[1] === before[1] ? ok("soft delete and restore work in the demo admin") : fail("demo", `tabs ${before} -> ${restored}`);
    derrors.length ? fail("demo", `page errors: ${derrors.join("; ")}`) : ok("no page errors");
    await dctx.close(); srv.close();
  }
} finally {
  await browser.close();
}

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
