// Renders the 1200x630 link-preview image (and the iOS home-screen icon) with a real browser.
// Uses an installed Chrome or Edge via playwright-core, so there is no browser download.
// No browser installed? Run:  npx playwright-core install chromium

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export async function launch() {
  const errors = [];
  for (const opts of [{ channel: "chrome" }, { channel: "msedge" }, {}]) {
    try { return await chromium.launch(opts); } catch (e) { errors.push(e.message.split("\n")[0]); }
  }
  throw new Error(
    "Couldn't start a browser to draw the link-preview image.\n" +
    "  Install Google Chrome or Microsoft Edge, or run:  npx playwright-core install chromium\n" +
    `  (${errors.join(" | ")})`,
  );
}

function ogHtml({ theme, lines, bigText, partyType, dateLong, range, locationShort }) {
  const v = theme.vars;
  const sky = v["--sky"], ink = v["--ink"];
  const hasBig = !!bigText;
  const sprites = theme.sprites.slice(0, 3);
  const spots = [{ right: 80, bottom: 150, h: 150 }, { right: 330, bottom: 24, h: 84 }, { right: 480, bottom: 24, h: 84 }];
  const info = [dateLong.replace(/^(\w+), (\w+) (\d+)$/, (m, w, mo, d) => `${w.slice(0, 3)}, ${mo.slice(0, 3)} ${d}`), range.replace(/ – /g, "–"), locationShort].filter(Boolean).join(" · ");
  return `<!doctype html><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?${theme.fonts.url}&display=block" rel="stylesheet">
<style>
:root{--display:"${theme.fonts.display}",${theme.fonts.fallback || "system-ui,sans-serif"}}
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{background:${sky};font-family:Nunito,system-ui,sans-serif;color:${ink};position:relative}
.band{position:absolute;left:0;right:0;bottom:0;height:130px;background:${theme.og.band};border-top:12px solid ${theme.og.bandEdge}}
h1{position:absolute;left:70px;top:56px;margin:0;white-space:nowrap;max-width:${hasBig ? 760 : 1060}px;font:700 82px/1.15 var(--display);text-transform:${v["--h1-transform"] || "none"};letter-spacing:1px;color:${ink};text-shadow:6px 6px 0 ${v["--hero-shadow"] || "transparent"}}
.big{position:absolute;right:${hasBig ? 90 : 0}px;top:30px;font:700 340px/1 var(--display);color:${v["--big"]};text-shadow:14px 14px 0 ${v["--big-shadow"]}}
.party{position:absolute;left:70px;top:350px;font:700 56px/1.2 var(--display);text-transform:${v["--h1-transform"] || "none"};color:${v["--kicker"]}}
.info{position:absolute;left:70px;top:430px;font:800 40px/1.3 Nunito,sans-serif;color:${ink}}
.tag{position:absolute;left:70px;bottom:36px;font:800 32px Nunito,sans-serif;letter-spacing:3px;text-transform:uppercase;color:${theme.og.tagInk || "#fff"}}
img{position:absolute}
</style>
${hasBig ? `<div class="big">${esc(bigText)}</div>` : ""}
<h1 id="h">${lines.map(esc).join("<br>")}</h1>
<div class="party">${esc(partyType)}</div>
<div class="info">${esc(info)}</div>
<div class="band"></div>
${sprites.map((s, i) => { const p = spots[i]; const w = Math.round(p.h * (s.w / s.h)); return `<img src="${s.uri}" style="width:${w}px;height:${p.h}px;${p.right != null ? `right:${p.right}px` : `left:${p.left}px`};bottom:${p.bottom}px;image-rendering:${v["--rendering"] || "auto"}">`; }).join("")}
<div class="tag">RSVP inside</div>`;
}

export async function renderImages({ theme, lines, bigText, partyType, dateLong, range, locationShort, iconSvg, outDir }) {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await page.setContent(ogHtml({ theme, lines, bigText, partyType, dateLong, range, locationShort }), { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    // shrink the headline until it fits beside the big number, so long names don't collide with it
    await page.evaluate(() => {
      const h = document.getElementById("h");
      let size = 82;
      while ((h.scrollWidth > h.clientWidth + 1 || h.getBoundingClientRect().height > 260) && size > 26) h.style.fontSize = `${--size}px`;
    });
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(outDir, "og.png"), clip: { x: 0, y: 0, width: 1200, height: 630 } });

    const icon = await browser.newPage({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 });
    await icon.setContent(`<!doctype html><style>html,body{margin:0}svg{display:block}</style>${iconSvg}`);
    await icon.screenshot({ path: path.join(outDir, "apple-touch-icon.png"), clip: { x: 0, y: 0, width: 180, height: 180 } });
  } finally {
    await browser.close();
  }
}
