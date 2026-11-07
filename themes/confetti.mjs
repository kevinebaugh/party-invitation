import { svgSprite, uri } from "../scripts/lib/svg.mjs";

const piece = (x, y, w, h, c, r) => `<rect x='${x}' y='${y}' width='${w}' height='${h}' fill='${c}' transform='rotate(${r} ${x + w / 2} ${y + h / 2})'/>`;

export default {
  id: "confetti",
  name: "Confetti",
  blurb: "Bright, classic birthday: balloons, bunting, cake and falling confetti.",
  example: { partyType: "birthday party" },
  fonts: { display: "Fredoka", url: "family=Fredoka:wght@600&family=Nunito:wght@600;800" },
  vars: {
    "--bg": "#fff3dc", "--sky": "linear-gradient(#fff7e6,#ffe3ee 60%,#ffd2e6 100%)",
    "--ink": "#3b1f4a", "--hero-shadow": "#ffd23f", "--kicker": "#d6336c", "--big": "#ff4d8d", "--big-shadow": "#ffd23f",
    "--scrim": "rgba(255,247,230,.75)",
    "--card": "#ffffff", "--card-ink": "#3b1f4a", "--card-line": "#ff9ec7", "--card-shadow": "rgba(120,50,100,.28)",
    "--h2": "#d6336c", "--label": "#7b4fd0", "--link": "#7b2fd0",
    "--field-bg": "#fff7fb", "--field-ink": "#3b1f4a", "--field-line": "#ffb3d4", "--focus": "#7b4fd0", "--check": "#d6336c",
    "--accent": "#ffd23f", "--accent-ink": "#3b1f4a", "--accent-shadow": "#c99600",
    "--accent2": "#3ec6ff", "--accent2-ink": "#04283a", "--accent2-shadow": "#1b86b3",
    "--warn": "#c2185b", "--radius": "20px", "--bw": "3px", "--h1-transform": "none", "--h1-size": "clamp(42px,12.5vw,60px)", "--rendering": "auto",
  },
  confetti: ["#ff4d8d", "#ffd23f", "#3ec6ff", "#7b4fd0", "#52d689"],
  layers: [
    { speed: 0.1, css: `background:${uri(`<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'>${piece(20, 30, 10, 18, "#ff4d8d", 25)}${piece(120, 90, 8, 16, "#3ec6ff", -30)}${piece(220, 20, 10, 18, "#ffd23f", 60)}${piece(60, 200, 9, 17, "#7b4fd0", 10)}${piece(180, 160, 10, 18, "#52d689", -50)}${piece(260, 250, 8, 14, "#ff4d8d", 40)}</svg>`)} repeat 0 0/300px 300px`, drift: true },
    { speed: 0.22, css: `background:${uri(`<svg xmlns='http://www.w3.org/2000/svg' width='360' height='360'>${piece(50, 60, 14, 26, "#ffd23f", -20)}${piece(200, 40, 12, 22, "#7b4fd0", 35)}${piece(110, 230, 14, 24, "#3ec6ff", 70)}${piece(290, 180, 12, 22, "#ff4d8d", -60)}${piece(20, 300, 12, 20, "#52d689", 15)}</svg>`)} repeat 0 0/360px 360px`, drift: true },
    { speed: 0.35, css: `height:70px;top:0;bottom:auto;background:${uri(`<svg xmlns='http://www.w3.org/2000/svg' width='160' height='70'><path d='M0 6Q80 26 160 6' stroke='#7a5a3a' stroke-width='2' fill='none'/><path d='M10 9L34 12L22 38z' fill='#ff4d8d'/><path d='M44 13L68 15L56 41z' fill='#ffd23f'/><path d='M80 15L104 15L92 41z' fill='#3ec6ff'/><path d='M116 13L140 11L128 37z' fill='#7b4fd0'/></svg>`)} repeat-x 0 0/160px 70px` },
  ],
  sprites: [
    svgSprite(40, 60, `<ellipse cx="20" cy="20" rx="15" ry="18" fill="#ff4d8d"/><path d="M20 38l-4 6h8z" fill="#ff4d8d"/><path d="M20 44c-4 6 4 8 0 14" stroke="#777" fill="none"/><ellipse cx="14" cy="13" rx="4" ry="6" fill="#fff" opacity=".35"/>`, 30, 45),
    svgSprite(40, 40, `<rect x="4" y="16" width="32" height="22" fill="#3ec6ff"/><rect x="2" y="10" width="36" height="8" fill="#2a9fd6"/><rect x="18" y="10" width="4" height="28" fill="#ffd23f"/><path d="M20 10c-8-10-14 0-6 0M20 10c8-10 14 0 6 0" stroke="#ffd23f" stroke-width="3" fill="none"/>`, 36, 36),
    svgSprite(40, 44, `<rect x="4" y="24" width="32" height="16" rx="3" fill="#ff9ec7"/><rect x="8" y="14" width="24" height="12" rx="3" fill="#fff"/><path d="M4 26q4 6 8 0t8 0 8 0 8 0" fill="#ffd23f"/><rect x="19" y="4" width="3" height="10" fill="#3ec6ff"/><ellipse cx="20.5" cy="3" rx="2" ry="3" fill="#ff8a3d"/>`, 36, 40),
    svgSprite(40, 44, `<path d="M20 2L36 40H4z" fill="#8a5cff"/><path d="M12 24h16l3 8H9z" fill="#ffd23f"/><circle cx="20" cy="4" r="4" fill="#ff4d8d"/>`, 34, 38),
  ],
  copy: { kicker: "IT'S PARTY TIME", yes: "Yes, we'll be there!", doneYesTitle: "HOORAY! SEE YOU THERE", ctaGlyph: "" },
  og: { band: "#ffd2e6", bandEdge: "#ff4d8d", tagInk: "#3b1f4a" },
  hue: ["#ff4d8d", "#7b4fd0", "#2aa7e0", "#2fb872"],
};
