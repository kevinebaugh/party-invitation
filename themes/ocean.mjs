import { svgSprite, uri, dots } from "../scripts/lib/svg.mjs";

export default {
  id: "ocean",
  name: "Ocean",
  blurb: "Bubbles, fish and rolling waves for an under-the-sea party.",
  example: { partyType: "ocean party" },
  fonts: { display: "Lilita One", url: "family=Lilita+One&family=Nunito:wght@600;800" },
  vars: {
    "--bg": "#0b4a73", "--sky": "linear-gradient(#0a3d62,#1478b5 55%,#35b6d6 100%)",
    "--ink": "#fff", "--hero-shadow": "#0a3d62", "--kicker": "#ffe27a", "--big": "#ffd166", "--big-shadow": "#b4571f",
    "--scrim": "rgba(10,61,98,.55)",
    "--card": "#ffffff", "--card-ink": "#0b3b5a", "--card-line": "#7dd3fc", "--card-shadow": "rgba(8,48,80,.45)",
    "--h2": "#0e7bb8", "--label": "#c2364a", "--link": "#0e6fa8",
    "--field-bg": "#eef8ff", "--field-ink": "#0b3b5a", "--field-line": "#7dd3fc", "--focus": "#ff8a3d", "--check": "#0e9fd8",
    "--accent": "#ffd166", "--accent-ink": "#0b3b5a", "--accent-shadow": "#c98d1a",
    "--accent2": "#ff8a3d", "--accent2-ink": "#2a1000", "--accent2-shadow": "#a14d12",
    "--warn": "#c21f3a", "--radius": "18px", "--bw": "3px", "--h1-transform": "none", "--h1-size": "clamp(40px,12vw,58px)", "--rendering": "auto",
  },
  confetti: ["#ffd166", "#ff8a3d", "#ffffff", "#7dd3fc", "#ff6b8a"],
  layers: [
    { speed: 0.06, css: dots([240, 200], [[30, 40, 5, "rgba(255,255,255,.28)"], [120, 150, 8, "rgba(255,255,255,.2)"], [200, 80, 4, "rgba(255,255,255,.3)"]]) },
    { speed: 0.14, css: dots([300, 260], [[60, 120, 10, "rgba(255,255,255,.16)"], [210, 40, 6, "rgba(255,255,255,.26)"], [260, 200, 7, "rgba(255,255,255,.2)"]]) },
    { speed: 0.3, css: `height:46vh;top:auto;bottom:0;background:${uri(`<svg xmlns='http://www.w3.org/2000/svg' width='400' height='120'><path d='M0 60q50-30 100 0t100 0 100 0 100 0V120H0z' fill='#1a8fc4'/></svg>`)} repeat-x bottom/400px 120px` },
    { speed: 0.45, css: `height:38vh;top:auto;bottom:0;background:${uri(`<svg xmlns='http://www.w3.org/2000/svg' width='320' height='100'><path d='M0 50q40-26 80 0t80 0 80 0 80 0V100H0z' fill='#0e6fa8'/></svg>`)} repeat-x bottom/320px 100px` },
    { speed: 0.6, css: `height:30vh;top:auto;bottom:0;background:${uri(`<svg xmlns='http://www.w3.org/2000/svg' width='360' height='90'><path d='M0 48q45-22 90 0t90 0 90 0 90 0V90H0z' fill='#0a5a8c'/><path d='M40 90V70M44 90V64M48 90V72M250 90V68M254 90V62' stroke='#2fbf71' stroke-width='3'/></svg>`)} repeat-x bottom/360px 90px` },
  ],
  sprites: [
    svgSprite(50, 30, `<path d="M4 15C14 2 34 2 42 15 34 28 14 28 4 15z" fill="#ff8a3d"/><path d="M40 15l10-9v18z" fill="#ff8a3d"/><circle cx="14" cy="13" r="2.5" fill="#fff"/><circle cx="14" cy="13" r="1" fill="#222"/>`, 50, 30),
    svgSprite(40, 40, `<path d="M20 2l5 13 14 1-11 9 4 14-12-8-12 8 4-14-11-9 14-1z" fill="#ff6b8a"/>`, 34, 34),
    svgSprite(40, 40, `<circle cx="20" cy="20" r="16" fill="#fff" fill-opacity=".18" stroke="#fff" stroke-width="2.5"/><circle cx="14" cy="14" r="3" fill="#fff" fill-opacity=".7"/>`, 34, 34),
    svgSprite(40, 50, `<path d="M4 24a16 20 0 0 1 32 0z" fill="#d78cff"/><path d="M8 24v18M16 24v24M24 24v20M32 24v16" stroke="#d78cff" stroke-width="3" stroke-linecap="round"/><circle cx="14" cy="16" r="2" fill="#fff" fill-opacity=".8"/>`, 34, 44),
  ],
  copy: { kicker: "DIVE IN!", yes: "Yes, we'll be there!", doneYesTitle: "SPLASH! WE'LL SEE YOU THERE", ctaGlyph: "" },
  og: { band: "#0e6fa8", bandEdge: "#7dd3fc" },
};
