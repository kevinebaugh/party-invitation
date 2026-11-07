import { svgSprite, uri, dots } from "../scripts/lib/svg.mjs";

export default {
  id: "dino",
  name: "Dino",
  blurb: "A sunny prehistoric jungle with dinosaurs, eggs and a volcano.",
  example: {
    partyType: "dino party",
    plan: [
      { time: "14:00", text: "Fossil dig and dinosaur games." },
      { time: "15:30", text: "Pizza and cake." },
      { time: "16:00", text: "Time to head home. Thanks for stomping by!" },
    ],
    note: "Feel free to drop off your explorer and pick them up at {end}.",
  },
  fonts: { display: "Chewy", url: "family=Chewy&family=Nunito:wght@600;800" },
  vars: {
    "--bg": "#e9d98a", "--sky": "linear-gradient(#fde68a,#d9e79a 45%,#8cc56b 100%)",
    "--ink": "#26421a", "--hero-shadow": "#fff7d6", "--kicker": "#a1480f", "--big": "#e4572e", "--big-shadow": "#fff0c2",
    "--scrim": "rgba(255,247,214,.7)",
    "--card": "#fffaf0", "--card-ink": "#2b3a1c", "--card-line": "#5a8f3a", "--card-shadow": "rgba(60,80,30,.35)",
    "--h2": "#a1480f", "--label": "#2f7d32", "--link": "#1b6aa5",
    "--field-bg": "#f4f0dc", "--field-ink": "#2b3a1c", "--field-line": "#7fae5d", "--focus": "#e4572e", "--check": "#2f7d32",
    "--accent": "#c2410c", "--accent-ink": "#ffffff", "--accent-shadow": "#7a2706",
    "--accent2": "#58a83b", "--accent2-ink": "#102208", "--accent2-shadow": "#35701f",
    "--warn": "#b3261e", "--radius": "16px", "--bw": "4px", "--h1-transform": "none", "--h1-size": "clamp(44px,13vw,62px)", "--rendering": "auto",
  },
  confetti: ["#e4572e", "#58a83b", "#f4b942", "#ffffff", "#7a4a21"],
  layers: [
    { speed: 0.05, css: `background:${uri(`<svg xmlns='http://www.w3.org/2000/svg' width='420' height='300'><circle cx='320' cy='90' r='54' fill='#ffd45a' fill-opacity='.65'/><circle cx='320' cy='90' r='80' fill='#ffd45a' fill-opacity='.2'/></svg>`)} repeat-x 0 20vh/420px 300px` },
    { speed: 0.12, css: dots([260, 200], [[40, 60, 3, "rgba(60,100,40,.25)"], [150, 140, 4, "rgba(60,100,40,.2)"], [220, 40, 3, "rgba(60,100,40,.25)"]]) },
    { speed: 0.25, css: `height:55vh;top:auto;bottom:0;background:${uri(`<svg xmlns='http://www.w3.org/2000/svg' width='520' height='200'><path d='M0 200V150L90 150L130 70L150 50L170 70L210 150L330 150Q380 120 430 150L520 150V200z' fill='#a97c50' fill-opacity='.55'/><path d='M130 70L150 50L170 70L160 78L150 66L140 78z' fill='#e4572e' fill-opacity='.7'/></svg>`)} repeat-x bottom/520px 200px` },
    { speed: 0.4, css: `height:42vh;top:auto;bottom:0;background:${uri(`<svg xmlns='http://www.w3.org/2000/svg' width='360' height='120'><path d='M0 120V70Q60 30 120 70T240 70 360 70V120z' fill='#6fb04a'/></svg>`)} repeat-x bottom/360px 120px` },
    { speed: 0.55, css: `height:32vh;top:auto;bottom:0;background:${uri(`<svg xmlns='http://www.w3.org/2000/svg' width='300' height='100'><path d='M0 100V60Q50 28 100 60T200 60 300 60V100z' fill='#4d9a37'/><path d='M60 60V30M60 36Q40 22 28 30M60 36Q80 22 92 30M60 30Q50 14 36 14M60 30Q70 14 84 14' stroke='#2f6f22' stroke-width='3' fill='none'/></svg>`)} repeat-x bottom/300px 100px` },
  ],
  sprites: [
    svgSprite(70, 50, `<path d="M8 40c0-14 8-18 18-18 2-10 6-18 14-18 5 0 7 3 5 6-4 0-6 4-6 12 14 0 24 6 24 18z" fill="#58a83b"/><rect x="14" y="38" width="8" height="10" rx="2" fill="#3e7d28"/><rect x="42" y="38" width="8" height="10" rx="2" fill="#3e7d28"/><circle cx="48" cy="9" r="1.8" fill="#1f3a14"/>`, 64, 46),
    svgSprite(30, 40, `<path d="M15 2C6 2 2 20 2 26a13 13 0 0 0 26 0C28 20 24 2 15 2z" fill="#fff3c4" stroke="#caa45a" stroke-width="2"/><circle cx="11" cy="22" r="3" fill="#8ac26a"/><circle cx="20" cy="29" r="3.5" fill="#8ac26a"/><circle cx="16" cy="13" r="2" fill="#8ac26a"/>`, 28, 38),
    svgSprite(40, 40, `<ellipse cx="20" cy="28" rx="8" ry="9" fill="#7a4a21"/><ellipse cx="8" cy="14" rx="4" ry="6" fill="#7a4a21"/><ellipse cx="20" cy="9" rx="4" ry="6" fill="#7a4a21"/><ellipse cx="32" cy="14" rx="4" ry="6" fill="#7a4a21"/>`, 32, 32),
    svgSprite(40, 40, `<path d="M4 36C4 14 20 4 36 4c0 18-8 32-32 32z" fill="#58a83b"/><path d="M6 34C14 24 22 16 32 8" stroke="#2f6f22" stroke-width="2" fill="none"/>`, 34, 34),
  ],
  copy: { kicker: "ROAR! YOU'RE INVITED", yes: "Yes, we'll be there!", doneYesTitle: "ROAR! SEE YOU THERE", ctaGlyph: "" },
  og: { band: "#4d9a37", bandEdge: "#2f6f22" },
  hue: ["#e4572e", "#d9822b", "#58a83b"],
};
