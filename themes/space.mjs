import { svgSprite, uri, dots } from "../scripts/lib/svg.mjs";

export default {
  id: "space",
  name: "Space",
  blurb: "Rockets, ringed planets and a moonlit horizon for little astronauts.",
  example: { partyType: "space party" },
  fonts: { display: "Orbitron", url: "family=Orbitron:wght@700;900&family=Nunito:wght@600;800" },
  vars: {
    "--bg": "#070722", "--sky": "linear-gradient(#04041a,#14104a 55%,#3a1a6e 100%)",
    "--ink": "#fff", "--hero-shadow": "#7c5cff", "--kicker": "#ffb703", "--big": "#ffd166", "--big-shadow": "#7a3d00",
    "--scrim": "rgba(4,4,26,.7)",
    "--card": "#16164f", "--card-ink": "#f2f4ff", "--card-line": "#5a63e8", "--card-shadow": "#03031a",
    "--h2": "#ffd166", "--label": "#8fb2ff", "--link": "#6fe3ff",
    "--field-bg": "#0b0b34", "--field-ink": "#fff", "--field-line": "#5a63e8", "--focus": "#ffd166", "--check": "#6fe3ff",
    "--accent": "#ffb703", "--accent-ink": "#1a1030", "--accent-shadow": "#8a5a00",
    "--accent2": "#6fe3ff", "--accent2-ink": "#06202a", "--accent2-shadow": "#1a7c93",
    "--warn": "#ff8fa3", "--radius": "14px", "--bw": "3px", "--h1-transform": "uppercase", "--h1-size": "clamp(26px,8.5vw,40px)", "--rendering": "auto",
  },
  confetti: ["#ffd166", "#6fe3ff", "#ff8fa3", "#b69cff", "#ffffff"],
  layers: [
    { speed: 0.05, css: dots([220, 180], [[20, 30, 1.5, "#fff"], [100, 130, 1.5, "#fff"], [170, 60, 2, "#ffd166"], [60, 160, 1.5, "#cfe3ff"]]), twinkle: 3 },
    { speed: 0.1, css: dots([280, 240], [[50, 90, 2.5, "#6fe3ff"], [150, 20, 2.5, "#fff"], [230, 190, 2, "#ff8fa3"]]), twinkle: -2.4 },
    { speed: 0.2, css: `background:${uri(`<svg xmlns='http://www.w3.org/2000/svg' width='900' height='520'><circle cx='640' cy='170' r='90' fill='#7c5cff' fill-opacity='.22'/><ellipse cx='640' cy='170' rx='150' ry='28' fill='none' stroke='#ffd166' stroke-opacity='.25' stroke-width='6' transform='rotate(-18 640 170)'/><circle cx='150' cy='400' r='38' fill='#ff8fa3' fill-opacity='.18'/></svg>`)} repeat-x 0 20vh/900px 520px` },
    { speed: 0.4, css: `height:50vh;top:auto;bottom:0;background:${uri(`<svg xmlns='http://www.w3.org/2000/svg' width='420' height='140'><path d='M0 90q70-50 140 0t140 0 140 0V140H0z' fill='#1e1b5e'/><circle cx='70' cy='108' r='9' fill='#15124a'/><circle cx='250' cy='112' r='13' fill='#15124a'/><circle cx='360' cy='102' r='7' fill='#15124a'/></svg>`)} repeat-x bottom/420px 140px` },
    { speed: 0.55, css: `height:50vh;top:auto;bottom:0;background:${uri(`<svg xmlns='http://www.w3.org/2000/svg' width='360' height='100'><path d='M0 70q60-40 120 0t120 0 120 0V100H0z' fill='#2c2a7a'/><circle cx='60' cy='86' r='7' fill='#221f66'/><circle cx='200' cy='84' r='10' fill='#221f66'/></svg>`)} repeat-x bottom/360px 100px` },
  ],
  sprites: [
    svgSprite(30, 60, `<path d="M15 2c8 8 9 22 7 34H8C6 24 7 10 15 2z" fill="#e8ecff"/><circle cx="15" cy="20" r="5" fill="#41b9ff"/><path d="M8 30l-6 12 8-4zM22 30l6 12-8-4z" fill="#ff5d73"/><path d="M11 38h8l-4 14z" fill="#ffb703"/>`, 28, 56),
    svgSprite(60, 40, `<circle cx="30" cy="20" r="13" fill="#7c5cff"/><ellipse cx="30" cy="20" rx="28" ry="7" fill="none" stroke="#ffd166" stroke-width="3"/>`, 56, 38),
    svgSprite(40, 40, `<path d="M20 2l5.5 12.5L39 16l-10 9 3 14-12-7-12 7 3-14-10-9 13.5-1.5z" fill="#ffd166"/>`, 34, 34),
    svgSprite(60, 36, `<ellipse cx="30" cy="22" rx="28" ry="9" fill="#9aa6ff"/><path d="M16 20a14 14 0 0 1 28 0z" fill="#b8fff0" opacity=".85"/><circle cx="14" cy="24" r="2" fill="#ffd166"/><circle cx="30" cy="27" r="2" fill="#ffd166"/><circle cx="46" cy="24" r="2" fill="#ffd166"/>`, 56, 34),
  ],
  copy: { kicker: "MISSION: BIRTHDAY", yes: "Yes, we'll be there!", doneYesTitle: "LIFTOFF!", ctaGlyph: "🚀 " },
  og: { band: "#2c2a7a", bandEdge: "#6fe3ff" },
};
