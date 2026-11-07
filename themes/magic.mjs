import { svgSprite, uri } from "../scripts/lib/svg.mjs";

const sparkle = (x, y, s, c) => `<path d='M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}z' fill='${c}'/>`;

export default {
  id: "magic",
  name: "Magic",
  blurb: "Pastel skies, rainbows, sparkles and clouds. Dreamy and unicorn-friendly.",
  example: { partyType: "unicorn party" },
  fonts: { display: "Baloo 2", url: "family=Baloo+2:wght@700&family=Nunito:wght@600;800" },
  vars: {
    "--bg": "#d9c8ff", "--sky": "linear-gradient(#ffd6f6,#cdb8ff 50%,#a5e3ff 100%)",
    "--ink": "#3d2a6b", "--hero-shadow": "#ffffff", "--kicker": "#7c4dff", "--big": "#ff5fb3", "--big-shadow": "#ffffff",
    "--scrim": "rgba(255,255,255,.55)",
    "--card": "#ffffff", "--card-ink": "#3d2a6b", "--card-line": "#c4a7ff", "--card-shadow": "rgba(90,60,160,.3)",
    "--h2": "#7c4dff", "--label": "#d6336c", "--link": "#6a35e8",
    "--field-bg": "#f7f2ff", "--field-ink": "#3d2a6b", "--field-line": "#c4a7ff", "--focus": "#ff5fb3", "--check": "#7c4dff",
    "--accent": "#7c4dff", "--accent-ink": "#ffffff", "--accent-shadow": "#4a26b0",
    "--accent2": "#ff8fd8", "--accent2-ink": "#3d1030", "--accent2-shadow": "#c4509e",
    "--warn": "#c2185b", "--radius": "22px", "--bw": "3px", "--h1-transform": "none", "--h1-size": "clamp(42px,12.5vw,60px)", "--rendering": "auto",
  },
  confetti: ["#ff5fb3", "#7c4dff", "#58c4ff", "#ffd23f", "#ffffff"],
  layers: [
    { speed: 0.08, css: `background:${uri(`<svg xmlns='http://www.w3.org/2000/svg' width='260' height='240'>${sparkle(30, 40, 9, "#fff")}${sparkle(150, 110, 6, "#fff8c4")}${sparkle(220, 30, 7, "#fff")}${sparkle(90, 200, 8, "#fff8c4")}</svg>`)} repeat 0 0/260px 240px`, twinkle: 3 },
    { speed: 0.16, css: `background:${uri(`<svg xmlns='http://www.w3.org/2000/svg' width='340' height='300'>${sparkle(60, 80, 12, "#ffffff")}${sparkle(250, 190, 10, "#ffe6fb")}${sparkle(170, 270, 7, "#fff")}</svg>`)} repeat 0 0/340px 300px`, twinkle: -2.6 },
    { speed: 0.3, css: `height:60vh;top:auto;bottom:0;background:${uri(`<svg xmlns='http://www.w3.org/2000/svg' width='520' height='260'><g fill='none' stroke-width='16' opacity='.55'><path d='M20 260a240 240 0 0 1 480 0' stroke='#ff6b8a'/><path d='M36 260a224 224 0 0 1 448 0' stroke='#ffb347'/><path d='M52 260a208 208 0 0 1 416 0' stroke='#ffe066'/><path d='M68 260a192 192 0 0 1 384 0' stroke='#7be0a0'/><path d='M84 260a176 176 0 0 1 352 0' stroke='#58c4ff'/><path d='M100 260a160 160 0 0 1 320 0' stroke='#b69cff'/></g></svg>`)} repeat-x bottom/520px 260px` },
    { speed: 0.45, css: `height:34vh;top:auto;bottom:0;background:${uri(`<svg xmlns='http://www.w3.org/2000/svg' width='380' height='110'><path d='M0 110V70a28 28 0 0 1 36-24 36 36 0 0 1 66-6 30 30 0 0 1 52 8 34 34 0 0 1 60-8 30 30 0 0 1 58 8 28 28 0 0 1 56 6 30 30 0 0 1 50 16V110z' fill='#fff' fill-opacity='.9'/></svg>`)} repeat-x bottom/380px 110px` },
  ],
  sprites: [
    svgSprite(40, 40, `<path d="M20 2l5.5 12.5L39 16l-10 9 3 14-12-7-12 7 3-14-10-9 13.5-1.5z" fill="#ffd23f"/>`, 34, 34),
    svgSprite(40, 40, `<path d="M20 36C4 24 2 12 10 8c5-3 9 0 10 4 1-4 5-7 10-4 8 4 6 16-10 28z" fill="#ff7bbd"/>`, 32, 32),
    svgSprite(40, 36, `<path d="M8 2h24l8 12-20 22L0 14z" fill="#7ad7ff"/><path d="M0 14h40M14 2l-4 12 10 22 10-22-4-12" stroke="#fff" stroke-opacity=".7" fill="none"/>`, 34, 30),
    svgSprite(60, 36, `<path d="M4 34a26 26 0 0 1 52 0" stroke="#ff6b8a" stroke-width="5" fill="none"/><path d="M10 34a20 20 0 0 1 40 0" stroke="#ffd23f" stroke-width="5" fill="none"/><path d="M16 34a14 14 0 0 1 28 0" stroke="#58c4ff" stroke-width="5" fill="none"/>`, 54, 32),
  ],
  copy: { kicker: "A MAGICAL INVITATION", yes: "Yes, we'll be there!", doneYesTitle: "HOORAY! SEE YOU THERE", ctaGlyph: "" },
  og: { band: "#ffffff", bandEdge: "#c4a7ff", tagInk: "#3d2a6b" },
  hue: ["#ff5fb3", "#7c4dff", "#2aa7e0"],
};
