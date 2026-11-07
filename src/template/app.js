(() => {
  const P = JSON.parse(document.getElementById("party-config").textContent);
  const fill = (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Lock zoom. iOS Safari ignores user-scalable, so block its gesture events too.
  ["gesturestart", "gesturechange", "gestureend"].forEach((ev) => document.addEventListener(ev, (e) => e.preventDefault()));
  document.addEventListener("touchmove", (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener("dblclick", (e) => e.preventDefault());

  // ---- floating sprites ----
  const host = document.getElementById("sprites");
  const items = [];
  const order = P.sprites.length ? Array.from({ length: 10 }, (_, i) => P.sprites[i % P.sprites.length]) : [];
  order.forEach((s, i) => {
    const k = [1, 1.5, 2][i % 3];
    const el = document.createElement("div");
    el.className = "sprite";
    Object.assign(el.style, {
      width: s.w * k + "px", height: s.h * k + "px", backgroundImage: `url("${s.uri}")`, backgroundSize: "100% 100%",
      left: (i % 2 ? 2 + (i * 3) % 8 : 84 + (i * 3) % 8) + "%", top: ((i * 23 + 5) % 85) + "vh", opacity: P.spriteOpacity,
    });
    host.appendChild(el);
    items.push({ el, speed: 0.15 + (i % 4) * 0.12, phase: i });
  });

  // ---- parallax ----
  const layers = [...document.querySelectorAll(".layer")].map((el) => ({ el, speed: +el.dataset.speed }));
  const render = () => {
    const y = window.scrollY, t = performance.now() / 1000;
    layers.forEach((l) => (l.el.style.transform = `translate3d(0,${-y * l.speed}px,0)`));
    items.forEach((s) => (s.el.style.transform =
      `translate3d(${Math.sin(t * 0.6 + s.phase) * 14}px,${-y * s.speed + Math.sin(t * 1.5 + s.phase) * 8}px,0) rotate(${Math.sin(t + s.phase) * 8}deg)`));
  };
  if (!reduce) (function loop() { render(); requestAnimationFrame(loop); })();

  // ---- confetti ----
  const confetti = (x, y, n = 36) => {
    if (reduce) return;
    for (let i = 0; i < n; i++) {
      const el = document.createElement("div");
      el.className = "confetti";
      el.style.background = P.confetti[i % P.confetti.length];
      el.style.left = x + "px"; el.style.top = y + "px";
      document.body.appendChild(el);
      const ang = Math.random() * Math.PI * 2, d = 80 + Math.random() * 160;
      el.animate([
        { transform: "translate(0,0) rotate(0)", opacity: 1 },
        { transform: `translate(${Math.cos(ang) * d}px,${Math.sin(ang) * d + 120}px) rotate(${Math.random() * 720}deg)`, opacity: 0 },
      ], { duration: 900 + Math.random() * 500, easing: "cubic-bezier(.2,.7,.4,1)" }).onfinish = () => el.remove();
    }
  };
  const big = document.getElementById("big");
  if (big) big.addEventListener("click", (e) => confetti(e.clientX, e.clientY));

  // ---- headline wave + card reveal ----
  document.querySelector("h1").childNodes.forEach((n) => {
    if (n.nodeType !== 3) return;
    const f = document.createDocumentFragment();
    [...n.textContent].forEach((ch, i) => {
      const s = document.createElement("span");
      s.className = "ch"; s.setAttribute("aria-hidden", "true");
      s.style.animationDelay = i * 0.08 + "s";
      s.textContent = ch === " " ? " " : ch;
      f.appendChild(s);
    });
    n.replaceWith(f);
  });
  if (!reduce && "IntersectionObserver" in window) {
    document.documentElement.classList.add("js");
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { threshold: 0.12 });
    document.querySelectorAll(".card").forEach((c) => io.observe(c));
  }

  // ---- RSVP ----
  const form = document.getElementById("rsvp-form");
  const yesOnly = document.getElementById("yes-only");
  const msg = document.getElementById("msg");
  const done = document.getElementById("done");
  const dropLabel = document.getElementById("dropoff-label");
  const legend = document.getElementById("attend-legend");

  // A real <button> (not a #link), so sharing the URL afterwards doesn't jump anyone down the page.
  document.getElementById("rsvp-go").addEventListener("click", () => {
    const card = document.getElementById("rsvp");
    // focus synchronously inside the tap so iOS opens the keyboard
    form.child_name.focus({ preventScroll: true });
    // Scroll so the card's heading sits near the top and the first fields stay above the keyboard.
    // Use layout offsets: the card's reveal animation transforms getBoundingClientRect().
    let top = 0;
    for (let n = card; n; n = n.offsetParent) top += n.offsetTop;
    window.scrollTo({ top: top - 16, behavior: reduce ? "auto" : "smooth" });
  });

  const names = () => form.child_name.value.trim();
  const refreshLabels = () => {
    const n = names();
    dropLabel.textContent = fill(P.copy.dropoff, { name: n || P.copy.dropoffDefaultName });
    legend.textContent = n ? fill(P.copy.attendNamed, { name: n }) : P.copy.attendDefault;
  };
  form.child_name.addEventListener("input", refreshLabels);

  // Title Case on blur: capitalize each word's first letter, leave the rest as typed (McDonald, Mary-Jane)
  const titleCase = (s) => s.replace(/(^|[\s\-'’])(\p{L})/gu, (m, p, c) => p + c.toUpperCase());
  [form.child_name, form.parent_name].forEach((el) =>
    el.addEventListener("blur", () => { el.value = titleCase(el.value.trim()); refreshLabels(); }));

  form.addEventListener("change", () => { yesOnly.hidden = form.attending.value !== "yes"; });
  document.getElementById("again").addEventListener("click", () => { done.hidden = true; form.hidden = false; });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";
    const f = new FormData(form);
    const attending = f.get("attending");
    if (!f.get("child_name").trim() || !f.get("parent_name").trim() || !attending) {
      msg.textContent = P.copy.errorMissing;
      return;
    }
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          child_name: titleCase(f.get("child_name")), parent_name: titleCase(f.get("parent_name")),
          attending: attending === "yes", parents_staying: !f.get("dropping_off"),
          num_kids: +f.get("num_kids") || 1,
          food_preference: f.getAll("food").join(", "), allergies: f.get("allergies"),
          notes: f.get("notes"), website: f.get("website"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || P.copy.errorGeneric);
      const name = f.get("child_name").trim();
      const v = { name, ...P.vals };
      document.getElementById("done-title").textContent = data.attending ? P.copy.doneYesTitle : P.copy.doneNoTitle;
      document.getElementById("done-text").textContent = fill(data.attending ? P.copy.doneYesText : P.copy.doneNoText, v);
      form.hidden = true; done.hidden = false;
      if (data.attending) { const r = done.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top + 40, 60); }
    } catch (err) {
      msg.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });
})();
