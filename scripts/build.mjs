// Renders dist/ (static site) and src/config.generated.json (Worker settings)
// from event.config.json + themes/<theme>.mjs.
//
//   node scripts/build.mjs [--skip-og] [--theme=<id>] [--out=<dir>] [--config=<file>]

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import {
  localToUtc, icsStamp, fmtDateLong, fmtDateShort, fmtClock, fmtTime, fmtTimeShort, fmtRange, ordinal,
} from "./lib/time.mjs";

const root = path.resolve(import.meta.dirname, "..");
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? true];
}));

export const THEMES = fs.readdirSync(path.join(root, "themes")).filter((f) => f.endsWith(".mjs")).map((f) => f.replace(/\.mjs$/, ""));

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const inlineJson = (o) => JSON.stringify(o).replace(/</g, "\\u003c");

// Every generated invitation links back here (turn it off with "credit": false in the config).
const REPO_URL = "https://github.com/kevinebaugh/party-invitation";

const DEFAULT_COPY = {
  kicker: "You're invited",
  sub: "You're invited to a {partyType}!",
  whenWhere: "When & Where", plan: "The Plan", rsvp: "RSVP",
  when: "When", where: "Where", addCal: "Add to calendar",
  cta: "RSVP", send: "Send RSVP", again: "Change my answer",
  childLabel: "Your child or children", childPlaceholder: "Name (or names)",
  parentLabel: "Your name", parentPlaceholder: "Parent / guardian",
  attendDefault: "Can they make it?", attendNamed: "Can {name} make it?",
  yes: "Yes, we'll be there!", no: "Can't make it",
  howMany: "How many kids are coming?",
  stayLegend: "Staying or dropping off?",
  dropoff: "We'll drop off {name} and pick them up at {end}", dropoffDefaultName: "our child",
  allergies: "(Optional) Any allergies or dietary restrictions?",
  notes: "Anything else?", optional: "Optional",
  foodOther: "Something else", foodNone: "No preference",
  emailLabel: "Your email (optional)", emailPlaceholder: "So we can reply to you",
  errorEmail: "That email address doesn't look right. You can leave it blank.",
  doneYesTitle: "See you there!", doneYesText: "You're on the list! We'll see {name} on {date} at {start}.",
  doneNoTitle: "Thanks for letting us know", doneNoText: "We'll miss {name}! Thanks for letting us know.",
  errorMissing: "Please add both names and pick yes or no.", errorGeneric: "Something went wrong. Please try again.",
  ctaGlyph: "",
};

const DEFAULT_VARS = {
  "--h1-size": "clamp(32px,10vw,48px)", "--h1-transform": "none", "--rendering": "auto", "--radius": "16px", "--bw": "3px",
  "--hero-shadow": "transparent", "--scrim": "transparent",
};

const isRealDate = (str) => {
  const [y, m, d] = str.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
};
const minutesOf = (t) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t));
  return m && +m[1] < 24 && +m[2] < 60 ? +m[1] * 60 + +m[2] : null;
};
const addDay = (str) => {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
};

function loadConfig(o) {
  // event.config.local.json (git-ignored) wins, so a real address never has to be committed.
  const localFile = path.join(root, "event.config.local.json");
  const rel = o.config || (fs.existsSync(localFile) ? "event.config.local.json" : "event.config.json");
  const file = path.resolve(root, rel);
  const name = path.basename(file);
  let c;
  try {
    c = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    throw new Error(`${name} couldn't be read: ${e.message}\n  JSON doesn't allow trailing commas, comments or single quotes. Check the line mentioned above.`);
  }
  if (!o.config && name === "event.config.local.json") console.log("Using event.config.local.json");
  Object.assign(c, o.overrides || {});
  const missing = ["honoree", "date", "start", "end", "timezone", "address"].filter((k) => !c[k]);
  if (missing.length) throw new Error(`${name} is missing: ${missing.join(", ")}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.date) || !isRealDate(c.date)) throw new Error(`"date" ("${c.date}") isn't a real date. Use the form 2027-03-14 (year-month-day).`);
  for (const k of ["start", "end"]) if (minutesOf(c[k]) === null) throw new Error(`"${k}" ("${c[k]}") must be a 24-hour time like 14:00 or 09:30.`);
  if (minutesOf(c.start) === minutesOf(c.end)) throw new Error('"start" and "end" are the same time.');
  if (minutesOf(c.end) < minutesOf(c.start) && minutesOf(c.end) + 1440 - minutesOf(c.start) > 720) {
    throw new Error(`"end" (${c.end}) is earlier than "start" (${c.start}), which would make the party last over 12 hours. Did you swap them? (A party that runs past midnight is fine, like 19:00 to 01:00.)`);
  }
  try { new Intl.DateTimeFormat("en-US", { timeZone: c.timezone }); } catch { throw new Error(`Unknown timezone "${c.timezone}" (use an IANA name like America/New_York)`); }
  if (c.age != null && !(Number.isInteger(c.age) && c.age > 0 && c.age < 120)) throw new Error(`"age" ("${c.age}") must be a whole number like 7, or left out.`);
  for (const [i, p] of (c.plan || []).entries()) {
    if (!p || minutesOf(p.time) === null || !p.text) throw new Error(`plan item ${i + 1} needs a "time" like 15:30 and some "text".`);
  }
  if (c.food && (!Array.isArray(c.food.options) || c.food.options.some((x) => typeof x !== "string" || !x.trim()))) {
    throw new Error('"food.options" must be a list of text choices, like ["Cheese", "Pepperoni"].');
  }
  if (c.askEmail != null && typeof c.askEmail !== "boolean") throw new Error('"askEmail" must be true or false.');
  if (c.credit != null && typeof c.credit !== "boolean") throw new Error('"credit" must be true or false.');
  if (c.food && c.food.multiple != null && typeof c.food.multiple !== "boolean") throw new Error('"food.multiple" must be true (tick any) or false (pick one).');
  if (c.food && c.food.other != null && typeof c.food.other !== "boolean" && (typeof c.food.other !== "string" || !c.food.other.trim())) {
    throw new Error('"food.other" must be true, false, or the text for the write-in choice, like "Something else".');
  }
  const comma = (c.food?.options || []).find((x) => x.includes(","));
  if (comma) {
    throw new Error(`"food.options" can't contain commas ("${comma}"), because commas separate the items a guest ticks and the admin totals would split it in two. Use a dash or "and" instead, like "Mac - extra cheesy".`);
  }
  if (o.theme) c.theme = o.theme;
  if (!THEMES.includes(c.theme)) throw new Error(`Unknown theme "${c.theme}". Available: ${THEMES.join(", ")}`);
  c.siteUrl = String(c.siteUrl || "").trim().replace(/\/+$/, "");
  if (c.siteUrl && !/^https?:\/\/[^/\s]+$/.test(c.siteUrl)) {
    throw new Error(`"siteUrl" ("${c.siteUrl}") should be just your site's address, starting with https://, like https://party.example.com (no path after it).`);
  }
  c._file = name;
  return c;
}

export async function build(opts = {}) {
  const o = { ...args, ...opts };
  const c = loadConfig(o);
  const theme = (await import(pathToFileURL(path.join(root, "themes", `${c.theme}.mjs`)).href)).default;
  const out = path.resolve(root, o.out || "dist");

  // ---- derived values ----
  const start = localToUtc(c.date, c.start, c.timezone);
  // a party that runs past midnight (end earlier than start) ends the next day
  const end = localToUtc(minutesOf(c.end) < minutesOf(c.start) ? addDay(c.date) : c.date, c.end, c.timezone);
  const dateLong = fmtDateLong(c.date), dateShort = fmtDateShort(c.date);
  const range = fmtRange(c.start, c.end);
  const endShort = fmtTimeShort(c.end);
  const copy = { ...DEFAULT_COPY, ...theme.copy, ...(c.copy || {}) };
  const maxKids = Math.max(1, Math.min(10, c.maxKids || 5));
  const hasAge = Number.isFinite(c.age) && c.age > 0;
  const partyType = c.partyType || "birthday party";
  const lines = hasAge ? [c.honoree, "is turning"] : [`${c.honoree}'s`, partyType];
  const bigText = hasAge ? String(c.age) : "";
  const title = c.ogTitle || (hasAge ? `${c.honoree} is turning ${c.age}! ${cap(partyType)} ${dateShort}` : `${c.honoree}'s ${partyType} ${dateShort}`);
  const description = c.ogDescription || `${dateLong} · ${range}${c.locationShort ? ` · ${c.locationShort}` : ""}. RSVP here.`;
  const emailBrand = hasAge ? `${c.honoree}'s ${ordinal(c.age)} birthday` : `${c.honoree}'s ${partyType}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`;
  const siteUrl = c.siteUrl;
  const abs = (p) => (siteUrl ? `${siteUrl}${p}` : p);
  if (!siteUrl && !o.demo && !o.config) console.warn('! "siteUrl" is empty in event.config.json: link previews need absolute URLs. Deploy once, set siteUrl to your live address, and deploy again before sharing.');
  if (!o.demo && !o.config && end < new Date()) console.warn(`! The party date (${c.date}) is in the past. Check "date" in ${c._file}.`);
  if (siteUrl.startsWith("http://") && !/localhost|127\.0\.0\.1/.test(siteUrl)) console.warn('! "siteUrl" uses http://. Use https:// so link previews work.');
  const notifyTo = c.notify?.to || [];
  if (notifyTo.length && !c.notify?.from) console.warn('! "notify.to" is set but "notify.from" is empty, so no emails will be sent. See the README section on email notifications.');
  if (notifyTo.length && !o.demo && !o.config && !/^\s*"send_email"/m.test(fs.readFileSync(path.join(root, "wrangler.jsonc"), "utf8"))) {
    console.warn('! "notify.to" is set but wrangler.jsonc has no "send_email" binding, so no emails will be sent. See the README section on email notifications.');
  }

  const hue = theme.hue || theme.confetti.filter((x) => !/^#f{3}(f{3})?$/i.test(x));
  const ogHash = crypto.createHash("sha256").update(JSON.stringify({
    v: 2, id: theme.id, vars: theme.vars, og: theme.og, fonts: theme.fonts, lines, bigText, partyType, dateLong, range,
    loc: c.locationShort || "", sprites: theme.sprites.slice(0, 3).map((s) => s.uri), letter: c.honoree[0],
  })).digest("hex").slice(0, 8);
  const ogFile = `og-${ogHash}.png`;

  // ---- html ----
  const food = c.food && c.food.options?.length ? c.food : null;
  const credit = c.credit !== false
    ? `Made with <a href="${REPO_URL}" target="_blank" rel="noopener">party-invitation</a>` : "";
  const footerText = [c.footer ? esc(c.footer) : "", credit].filter(Boolean).join(" · ");
  const footerHtml = footerText ? `  <footer>${footerText}</footer>\n` : "";
  // Ask guests for an (optional) email only when it's useful: notifications are on, so replies can go to them.
  const askEmail = c.askEmail != null ? c.askEmail : (c.notify?.to || []).length > 0;
  const emailField = askEmail ? `      <label>${esc(copy.emailLabel)}
        <input type="email" name="parent_email" maxlength="254" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" placeholder="${esc(copy.emailPlaceholder)}">
      </label>
` : "";
  const foodMultiple = food ? food.multiple !== false : true;           // default: tick any
  const foodOtherLabel = food && food.other ? (typeof food.other === "string" ? food.other : copy.foodOther) : null;
  const foodType = foodMultiple ? "checkbox" : "radio";
  const foodChoice = (value, text, extra = "") => `          <label class="choice"><input type="${foodType}" name="food" value="${esc(value)}"${extra}> <span>${esc(text)}</span></label>`;
  const foodHtml = !food ? "" : `        <fieldset>
          <legend>(${esc(copy.optional)}) ${esc(food.question || "Any food preferences?")}</legend>
${foodMultiple ? "" : foodChoice("", copy.foodNone, " checked") + "\n"}${food.options.map((o) => foodChoice(o, o)).join("\n")}
${foodOtherLabel ? `          <label class="choice choice-other"><input type="${foodType}" name="food" value="__other__"> <input class="other-text" type="text" name="food_other" maxlength="60" placeholder="${esc(foodOtherLabel)}" aria-label="${esc(foodOtherLabel)}" autocomplete="off"></label>\n` : ""}        </fieldset>
`;
  const foodLabel = food?.label || "Food";
  const planHtml = (c.plan || []).map((p) => `      <li><b>${esc(fmtClock(p.time))}</b> ${esc(p.text)}</li>`).join("\n");
  const kidOptions = Array.from({ length: maxKids }, (_, i) => `<option>${i + 1}</option>`).join("");
  const g = copy.ctaGlyph;
  const note = c.note ? fill(c.note, { end: endShort, start: fmtTimeShort(c.start) }) : "";
  const calText = `${emailBrand}`;
  const gcal = "https://calendar.google.com/calendar/render?" + new URLSearchParams({
    action: "TEMPLATE", text: calText, dates: `${icsStamp(start)}/${icsStamp(end)}`, location: c.address,
    details: `${cap(partyType)}.${siteUrl ? ` RSVP: ${siteUrl}` : ""}`,
  }).toString().replace(/\+/g, "%20");

  const partyConfig = {
    sprites: theme.sprites, spriteOpacity: theme.spriteOpacity ?? 0.5, confetti: theme.confetti,
    vals: { date: dateLong, start: fmtTime(c.start), end: endShort },
    copy: {
      ...Object.fromEntries(["doneYesTitle", "doneYesText", "doneNoTitle", "doneNoText", "attendDefault", "attendNamed", "dropoffDefaultName", "errorMissing", "errorGeneric", "errorEmail"].map((k) => [k, copy[k]])),
      dropoff: fill(copy.dropoff, { end: endShort }),
    },
  };

  const headline = lines.map((l, i) => esc(l) + (i < lines.length - 1 || bigText ? "<br>" : "")).join("");
  const layerHtml = theme.layers.map((l, i) => `  <div class="layer l${i}" data-speed="${l.speed}"></div>`).join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${siteUrl ? `<link rel="canonical" href="${esc(siteUrl)}/">\n` : ""}<meta name="robots" content="noindex">
<meta name="theme-color" content="${esc(theme.vars["--bg"])}">

<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(emailBrand)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${siteUrl ? `<meta property="og:url" content="${esc(siteUrl)}/">\n` : ""}<meta property="og:image" content="${esc(abs("/" + ogFile))}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(`${lines.join(" ")} ${bigText}`.trim() + `. ${cap(partyType)}, ${dateLong}, ${range}.`)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(abs("/" + ogFile))}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?${theme.fonts.url}&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
</head>
<body>
<div class="sky" aria-hidden="true">
${layerHtml}
  <div id="sprites"></div>
</div>

<main>
  <header class="hero">
    <p class="kicker">${esc(copy.kicker)}</p>
    <h1 aria-label="${esc((lines.join(" ") + " " + bigText).trim())}">${headline}${bigText ? `<span class="big" id="big" title="Tap me!">${esc(bigText)}</span>` : ""}</h1>
    <p class="sub">${esc(fill(copy.sub, { partyType }))}</p>
  </header>

  <section class="card">
    <h2>${esc(copy.whenWhere)}</h2>
    <dl>
      <dt>${esc(copy.when)}</dt>
      <dd>${esc(dateLong)}<br>${esc(range)}</dd>
      <dt>${esc(copy.where)}</dt>
      <dd>${c.venueName ? esc(c.venueName) + "<br>" : ""}<a href="${esc(mapsUrl)}" target="_blank" rel="noopener">${esc(c.address)}</a></dd>
    </dl>
    <p class="addcal">${esc(copy.addCal)}</p>
    <div class="cals">
      <a class="btn small" href="/party.ics">Apple</a>
      <a class="btn small" href="${esc(gcal)}" target="_blank" rel="noopener">Google</a>
    </div>
  </section>

  <button class="btn cta cta-block" type="button" id="rsvp-go">${esc(g + copy.cta)}</button>

  <section class="card">
    <h2>${esc(copy.plan)}</h2>
    <ol class="plan">
${planHtml}
    </ol>
${note ? `    <p>${esc(note)}</p>\n` : ""}  </section>

  <section class="card" id="rsvp">
    <h2>${esc(copy.rsvp)}</h2>
    <form id="rsvp-form" novalidate>
      <label>${esc(copy.childLabel)}
        <input name="child_name" required maxlength="80" autocapitalize="words" autocomplete="off" placeholder="${esc(copy.childPlaceholder)}">
      </label>
      <label>${esc(copy.parentLabel)}
        <input name="parent_name" required maxlength="80" autocapitalize="words" autocomplete="name" placeholder="${esc(copy.parentPlaceholder)}">
      </label>
${emailField}      <fieldset>
        <legend id="attend-legend">${esc(copy.attendDefault)}</legend>
        <label class="choice"><input type="radio" name="attending" value="yes" required> <span>${esc(copy.yes)}</span></label>
        <label class="choice"><input type="radio" name="attending" value="no"> <span>${esc(copy.no)}</span></label>
      </fieldset>
      <div id="yes-only" hidden>
        <label>${esc(copy.howMany)}
          <select name="num_kids">${kidOptions}</select>
        </label>
        <fieldset>
          <legend>${esc(copy.stayLegend)}</legend>
          <label class="choice check"><input type="checkbox" name="dropping_off"> <span id="dropoff-label">${esc(fill(copy.dropoff, { end: endShort, name: copy.dropoffDefaultName }))}</span></label>
        </fieldset>
${foodHtml}        <label>${esc(copy.allergies)}
          <input name="allergies" maxlength="200" placeholder="${esc(copy.optional)}">
        </label>
      </div>
      <label>${esc(copy.notes)}
        <textarea name="notes" maxlength="500" rows="2" placeholder="${esc(copy.optional)}"></textarea>
      </label>
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <p id="msg" role="status"></p>
      <button class="btn" type="submit">${esc(g + copy.send)}</button>
    </form>
    <div id="done" hidden>
      <h3 id="done-title"></h3>
      <p id="done-text"></p>
      <button class="btn small" id="again" type="button">${esc(copy.again)}</button>
    </div>
  </section>

${footerHtml}</main>
<script type="application/json" id="party-config">${inlineJson(partyConfig)}</script>
<script src="/app.js"></script>
</body>
</html>
`;

  // ---- css ----
  const fam = (name, fb) => `"${name}",${fb}`;
  const vars = {
    ...DEFAULT_VARS, ...theme.vars,
    "--display": fam(theme.fonts.display, theme.fonts.fallback || "system-ui,sans-serif"),
    "--body": 'Nunito,system-ui,sans-serif',
    "--glyph": JSON.stringify(copy.ctaGlyph || ""),
  };
  const layerCss = theme.layers.map((l, i) => {
    let s = `.l${i}{${l.css}}`;
    if (l.twinkle) s += `\n.l${i}{animation:twinkle ${Math.abs(l.twinkle)}s steps(2) infinite${l.twinkle < 0 ? " reverse" : ""}}`;
    return s;
  }).join("\n");
  const hueCss = `@keyframes hue{${hue.map((col, i) => `${Math.round((i / hue.length) * 100)}%{color:${col}}`).join("")}100%{color:${hue[0]}}}`;
  const css = `:root{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(";")}}\n`
    + fs.readFileSync(path.join(root, "src/template/base.css"), "utf8")
    + `\n/* theme: ${theme.id} */\n${layerCss}\n${hueCss}\n`;

  // ---- calendar file ----
  const icsEsc = (s) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//party-invitation//EN", "BEGIN:VEVENT",
    `UID:${ogHash}-${c.date}@party-invitation`, `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`, `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsEsc(calText)}`, `LOCATION:${icsEsc(c.address)}`,
    `DESCRIPTION:${icsEsc(`${cap(partyType)}.${siteUrl ? ` RSVP: ${siteUrl}` : ""}`)}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n") + "\r\n";

  // ---- admin ----
  const adminHtml = fs.readFileSync(path.join(root, "src/template/admin.html"), "utf8")
    .replaceAll("{{adminTitle}}", esc(`${c.honoree}'s guest list`))
    .replaceAll("{{foodLabel}}", esc(foodLabel))
    .replaceAll("{{foodOptions}}", inlineJson(food ? food.options : []))
    .replaceAll("{{emailCss}}", askEmail ? "" : ".col-email{display:none!important}")
    .replaceAll("{{maxKids}}", String(maxKids));

  // ---- favicon ----
  const letter = esc(c.honoree[0].toUpperCase());
  const iconSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}"><rect width="64" height="64" rx="14" fill="${esc(theme.vars["--accent"])}"/><text x="32" y="45" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-weight="800" font-size="40" fill="${esc(theme.vars["--accent-ink"])}">${letter}</text></svg>`;

  // ---- write ----
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, "admin"), { recursive: true });
  let pageHtml = html;
  if (o.demo) {
    // Demo build: relative URLs so it works under any base path (e.g. GitHub Pages), and the fake API shim.
    pageHtml = html
      .replace('href="/style.css"', 'href="style.css"').replace('src="/app.js"', 'src="app.js"')
      .replace('href="/party.ics"', 'href="party.ics"').replace('href="/favicon.svg"', 'href="favicon.svg"')
      .replace(/<link rel="apple-touch-icon"[^>]*>\n/, "")
      .replace(/<meta property="og:image[^>]*>\n/g, "").replace(/<meta name="twitter:image"[^>]*>\n/, "")
      .replace("<title>", "<title>Demo: ")
      .replace('<script src="app.js">', '<script src="../shim.js"></script>\n<script src="app.js">');
  }
  fs.writeFileSync(path.join(out, "index.html"), pageHtml);
  fs.writeFileSync(path.join(out, "style.css"), css);
  fs.copyFileSync(path.join(root, "src/template/app.js"), path.join(out, "app.js"));
  fs.writeFileSync(path.join(out, "party.ics"), ics);
  fs.writeFileSync(path.join(out, "admin/index.html"), adminHtml);
  fs.writeFileSync(path.join(out, "favicon.svg"), iconSvg(64));

  const workerConfig = {
    maxKids, foodLabel, emailBrand, emailDate: dateShort,
    notify: { to: c.notify?.to || [], from: c.notify?.from || "" },
    copy: { errorMissing: copy.errorMissing, errorEmail: copy.errorEmail },
  };
  if (!o.out) fs.writeFileSync(path.join(root, "src/config.generated.json"), JSON.stringify(workerConfig, null, 2) + "\n");

  // ---- preview image + touch icon (needs a local Chrome/Edge; see README) ----
  const cacheDir = path.join(root, ".cache", "og", ogHash);
  const wantOg = !o["skip-og"];
  if (wantOg && !fs.existsSync(path.join(cacheDir, "og.png"))) {
    const { renderImages } = await import("./og.mjs");
    await renderImages({ theme, lines, bigText, partyType, dateLong, range, locationShort: c.locationShort || "", iconSvg: iconSvg(180), outDir: cacheDir });
  }
  if (!o.demo && fs.existsSync(path.join(cacheDir, "og.png"))) {
    fs.copyFileSync(path.join(cacheDir, "og.png"), path.join(out, ogFile));
    fs.copyFileSync(path.join(cacheDir, "apple-touch-icon.png"), path.join(out, "apple-touch-icon.png"));
  } else if (wantOg) {
    throw new Error("Preview image was not generated.");
  } else if (!o.demo) {
    console.warn("! Skipped the preview image (--skip-og). Run `npm run build` before sharing the link.");
  }

  console.log(`Built "${theme.id}" theme -> ${path.relative(root, out) || "."}/  (${ogFile})`);
  return { out, theme, ogFile, ogHash };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  build().catch((e) => { console.error(`\nBuild failed: ${e.message}\n`); process.exit(1); });
}
