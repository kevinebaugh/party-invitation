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

    // preview tags present in the static HTML
    const head = fs.readFileSync(path.join(out, "index.html"), "utf8");
    ["og:title", "og:description", "og:image", "twitter:card"].every((t) => head.includes(t)) ? ok("link-preview tags are in the static HTML") : fail(id, "missing og/twitter tags");
    fs.existsSync(path.join(out, ogFile)) ? ok(`preview image ${ogFile} exists`) : fail(id, "preview image missing");

    await ctx.close();
    server.close();
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

    const tabs = () => d.evaluate(() => [document.getElementById("tab-active").textContent, document.getElementById("tab-deleted").textContent]);
    const before = await tabs();
    await d.locator("[data-del]").first().click();
    await d.waitForFunction((t) => document.getElementById("tab-deleted").textContent !== t, before[1]);
    await d.locator("#tab-deleted").click();
    await d.locator("[data-restore]").first().click();
    await d.waitForTimeout(500);
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
