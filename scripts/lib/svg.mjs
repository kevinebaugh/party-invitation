// Small helpers for building the decorative art (all procedural, no image files).

export const uri = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
export const dataUri = (svg) => `data:image/svg+xml,${encodeURIComponent(svg)}`;

/** A pixel-art sprite from rows of characters; "." is transparent. Base scale: 4px per pixel. */
export function pixelSprite({ pal, rows }) {
  let r = "";
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== ".") r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${pal[ch]}"/>`;
  }));
  const w = rows[0].length, h = rows.length;
  return {
    w: w * 4, h: h * 4,
    uri: dataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${r}</svg>`),
  };
}

/** A smooth SVG sprite. `inner` is the markup inside the <svg>; w/h is the base display size. */
export function svgSprite(viewW, viewH, inner, w, h) {
  return {
    w, h,
    uri: dataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewW} ${viewH}">${inner}</svg>`),
  };
}

/** Scattered dots as a tiling radial-gradient background. dots: [[x, y, r, color], ...] */
export function dots(tile, dotList) {
  const g = dotList.map(([x, y, r, c]) => `radial-gradient(${r}px ${r}px at ${x}px ${y}px,${c},transparent)`).join(",");
  return `background-image:${g};background-size:${tile[0]}px ${tile[1]}px`;
}

/** A tiling SVG band pinned to the bottom (or top) of a layer. */
export function band(svg, w, h, { at = "bottom", repeat = "repeat-x" } = {}) {
  const pos = at === "bottom" ? "bottom" : "0 20vh"; // layers start 20vh above the viewport
  return `background-image:${uri(svg)};background-size:${w}px ${h}px;background-repeat:${repeat};background-position:${pos}`;
}
