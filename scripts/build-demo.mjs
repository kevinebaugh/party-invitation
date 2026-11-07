// Builds demo/: every theme as its own page with a theme switcher, plus a working admin page.
// It's fully static and uses a fake in-browser backend (src/demo/shim.template.js), so it can be hosted
// anywhere (GitHub Pages, Cloudflare, Netlify...). It always uses scripts/demo.config.json, never your
// event.config.json, so your real party details can't end up in a public demo.
//
//   npm run build:demo
//   DEMO_URL=https://example.github.io/party-invitation npm run build:demo   # adds absolute link-preview tags

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build, THEMES } from "./build.mjs";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "demo");
const demoUrl = (process.env.DEMO_URL || "").replace(/\/+$/, "");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const meta = [];
for (const id of THEMES) {
  const theme = (await import(pathToFileURL(path.join(root, "themes", `${id}.mjs`)).href)).default;
  await build({
    config: "scripts/demo.config.json", theme: id, out: path.join(out, id), "skip-og": true, demo: true,
    overrides: { ...(theme.example || {}), notify: { to: [], from: "" } },
  });
  meta.push({ id, name: theme.name, accent: theme.vars["--accent"] });
}

// one shared admin page (it's the same for every theme)
const cfg = JSON.parse(fs.readFileSync(path.join(root, "scripts/demo.config.json"), "utf8"));
const adminSrc = path.join(out, THEMES[0], "admin", "index.html");
fs.mkdirSync(path.join(out, "admin"), { recursive: true });
fs.writeFileSync(
  path.join(out, "admin", "index.html"),
  fs.readFileSync(adminSrc, "utf8").replace("</head>", '<script src="../shim.js"></script>\n</head>').replace("<title>", "<title>Demo: "),
);
for (const id of THEMES) fs.rmSync(path.join(out, id, "admin"), { recursive: true, force: true });

fs.writeFileSync(
  path.join(out, "shim.js"),
  fs.readFileSync(path.join(root, "src/demo/shim.template.js"), "utf8")
    .replace("__THEMES__", JSON.stringify(meta)).replace("__MAXKIDS__", String(cfg.maxKids || 5)),
);

// link-preview images for the demo's own address (reuses the committed gallery images)
fs.mkdirSync(path.join(out, "previews"), { recursive: true });
for (const id of THEMES) {
  const f = path.join(root, "docs", "previews", `${id}.png`);
  if (fs.existsSync(f)) fs.copyFileSync(f, path.join(out, "previews", `${id}.png`));
}
const title = "party-invitation: live demo";
const desc = "Flip between six party themes, send a test RSVP, and try the admin page. Nothing is saved to a server.";
fs.writeFileSync(path.join(out, "index.html"), `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
${demoUrl ? `<meta property="og:url" content="${esc(demoUrl)}/"><meta property="og:image" content="${esc(demoUrl)}/previews/arcade.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(demoUrl)}/previews/arcade.png">` : ""}
<meta http-equiv="refresh" content="0;url=arcade/">
</head><body><p>Opening the <a href="arcade/">demo</a>…</p><script>location.replace("arcade/" + location.hash)</script></body></html>
`);
fs.writeFileSync(path.join(out, ".nojekyll"), "");

console.log(`Built demo -> demo/  (${THEMES.length} themes + admin)`);
