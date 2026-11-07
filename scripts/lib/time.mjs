// Date/time helpers. Everything is derived from a local date + "HH:MM" + IANA timezone,
// so calendar links stay correct across daylight-saving changes.

const pad = (n) => String(n).padStart(2, "0");

/** Convert a local wall-clock time in `tz` to a UTC Date. */
export function localToUtc(dateStr, timeStr, tz) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const target = Date.UTC(y, m - 1, d, hh, mm);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", second: "numeric",
  });
  const offsetAt = (ms) => {
    const parts = fmt.formatToParts(new Date(ms));
    const g = (t) => Number(parts.find((p) => p.type === t).value);
    return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - ms;
  };
  let guess = target - offsetAt(target);
  guess = target - offsetAt(guess); // second pass settles DST edges
  return new Date(guess);
}

/** 20270314T190000Z */
export const icsStamp = (d) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

const utcNoon = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
};
export const fmtDateLong = (dateStr) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" }).format(utcNoon(dateStr));
export const fmtDateShort = (dateStr) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(utcNoon(dateStr));
export const fmtWeekdayShort = (dateStr) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" }).format(utcNoon(dateStr));

const parts = (t) => {
  const [h, m] = t.split(":").map(Number);
  return { h12: h % 12 || 12, m, pm: h >= 12 };
};
/** "2:00" (no am/pm), for the plan list */
export const fmtClock = (t) => { const p = parts(t); return `${p.h12}:${pad(p.m)}`; };
/** "2:00 pm" */
export const fmtTime = (t) => { const p = parts(t); return `${p.h12}:${pad(p.m)} ${p.pm ? "pm" : "am"}`; };
/** "4pm" or "5:30pm" */
export const fmtTimeShort = (t) => { const p = parts(t); return `${p.h12}${p.m ? ":" + pad(p.m) : ""}${p.pm ? "pm" : "am"}`; };
/** "2:00 – 4:00 pm" or "11:30 am – 1:00 pm" */
export function fmtRange(a, b) {
  const pa = parts(a), pb = parts(b);
  return pa.pm === pb.pm
    ? `${pa.h12}:${pad(pa.m)} – ${pb.h12}:${pad(pb.m)} ${pb.pm ? "pm" : "am"}`
    : `${fmtTime(a)} – ${fmtTime(b)}`;
}

export function ordinal(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" })[n % 10] || "th"}`;
}
