import { pixelSprite, uri, dots } from "../scripts/lib/svg.mjs";

export default {
  id: "arcade",
  name: "Arcade",
  blurb: "8-bit video game night: pixel fonts, coins, aliens and controllers.",
  example: { partyType: "video game party" },
  fonts: { display: "Pixelify Sans", url: "family=Pixelify+Sans:wght@700&family=Nunito:wght@600;800" },
  vars: {
    "--bg": "#12123a", "--sky": "linear-gradient(#0b0b2b,#2a1b6e 55%,#6b2a8f 100%)",
    "--ink": "#fff", "--hero-shadow": "#ff4fa3", "--kicker": "#ffd23f", "--big": "#39ff88", "--big-shadow": "#0a5a2f",
    "--scrim": "rgba(11,11,43,.75)",
    "--card": "#1d1d5c", "--card-ink": "#fff", "--card-line": "#4b4bd6", "--card-shadow": "#0a0a2a",
    "--h2": "#ffd23f", "--label": "#ff7bbd", "--link": "#41e0ff",
    "--field-bg": "#0f0f36", "--field-ink": "#fff", "--field-line": "#4b4bd6", "--focus": "#ffd23f", "--check": "#39ff88",
    "--accent": "#39ff88", "--accent-ink": "#10102e", "--accent-shadow": "#0a5a2f",
    "--accent2": "#ffd23f", "--accent2-ink": "#10102e", "--accent2-shadow": "#8a6b00",
    "--warn": "#ff7bbd", "--radius": "0px", "--bw": "4px", "--h1-transform": "uppercase", "--rendering": "pixelated",
  },
  confetti: ["#39ff88", "#41e0ff", "#ff4fa3", "#ffd23f", "#ffffff"],
  layers: [
    { speed: 0.05, css: dots([200, 160], [[20, 30, 2, "#fff"], [90, 120, 2, "#fff"], [160, 70, 2, "#ffd23f"]]), twinkle: 3 },
    { speed: 0.1, css: dots([260, 220], [[50, 90, 3, "#41e0ff"], [130, 20, 3, "#fff"]]), twinkle: -2.3 },
    { speed: 0.18, css: `background:${uri(`<svg xmlns='http://www.w3.org/2000/svg' width='360' height='400' shape-rendering='crispEdges' fill='#fff' fill-opacity='.07'><path d='M40 100h80v-20h60v20h60v20h-200z M220 260h60v-20h40v20h40v20h-140z'/></svg>`)} repeat-x 0 20vh/360px 400px` },
    { speed: 0.3, css: `height:60vh;top:auto;bottom:0;background:${uri(`<svg xmlns='http://www.w3.org/2000/svg' width='480' height='160' shape-rendering='crispEdges'><path fill='#251a68' d='M0 160V100h40V80h60V60h80V80h60V100h60V120h60V90h80V110h40v50z'/></svg>`)} repeat-x bottom/480px 160px` },
    { speed: 0.5, css: `height:60vh;top:auto;bottom:0;background:${uri(`<svg xmlns='http://www.w3.org/2000/svg' width='320' height='120' shape-rendering='crispEdges'><path fill='#123d5a' d='M0 120V90h40V70h80V50h60V70h60V90h80v30z'/><path fill='#39ff88' d='M0 120V100h40V80h80V60h60V80h60V100h80v20z' opacity='.25'/></svg>`)} repeat-x bottom/320px 120px` },
  ],
  sprites: [
    pixelSprite({ pal: { a: "#ffd23f", b: "#c98a00", c: "#fff3a8" }, rows: ["..aaaa..", ".abccba.", "abcaabba", "abcaabba", "abcaabba", "abcaabba", ".abbbba.", "..aaaa.."] }),
    pixelSprite({ pal: { a: "#39ff88" }, rows: ["..a....a..", "...a..a...", "..aaaaaa..", ".aa.aa.aa.", "aaaaaaaaaa", "a.aaaaaa.a", "a.a....a.a", "...aa.aa.."] }),
    pixelSprite({ pal: { a: "#ff4fa3", b: "#fff" }, rows: [".aa..aa.", "aabaaaaa", "aaaaaaaa", "aaaaaaaa", ".aaaaaa.", "..aaaa..", "...aa..."] }),
    pixelSprite({ pal: { a: "#41e0ff", b: "#10102e", c: "#ff4fa3" }, rows: [".aaaaaaaaaaaa.", "aaaaaaaaaaaaaa", "aabaaaaaaacaaa", "abbbaaaaaaaaca", "aabaaaaaacaaaa", "aaaaaaaaaaaaaa", ".aaa......aaa."] }),
  ],
  copy: {
    kicker: "BIRTHDAY QUEST UNLOCKED",
    yes: "Yes, game on!",
    doneYesTitle: "GAME ON!",
    ctaGlyph: "▶ ",
  },
  og: { band: "#123d5a", bandEdge: "#39ff88" },
};
