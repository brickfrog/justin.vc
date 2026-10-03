/* -------------------------------------------------------------------------
   justin.vc — margin traces

   A logic-analyser capture scrolling down the gutters either side of the
   reading column. Three channels, drawn as a staircase: the pens hold a
   level for a run of rows and then step, so everything is axis-aligned.

   Two rules the earlier attempts broke.

   1. It stays out of the text, structurally. Those were full-bleed canvases
      masked by a radial scrim. Measured at 1568px, the fully opaque part of
      that scrim covered 43.7% of the column, and it was position:fixed while
      the content scrolled — so the field sat behind the prose the whole time.
      A fixed mask cannot track a scrolling column. There is no mask here: the
      canvases are the outer tracks of a grid whose middle track is the
      column, so layout makes overlap impossible at any width or offset.

   2. It is on the page's grid. The site is monospace cells, box rules and
      ASCII; smooth organic curves read as something imported from another
      website. The x steps are one character advance (0.6em) and the rows are
      half a line, both derived from the live computed font size — so when the
      wide-display rules bump the root from 15px to 17px, the trace rescales
      with the type instead of drifting off it.

   The whole capture is a function of (row + feed), so it travels downward as
   one strip of paper rather than wobbling in place.
   ------------------------------------------------------------------------- */
(function () {
  const rails = document.getElementById('rails');
  if (!rails) return;
  const canvases = rails.querySelectorAll('canvas');
  if (canvases.length !== 2) return;

  // A 110px gutter holds a chart, but it reads as clutter pressed against the
  // window edge rather than as a margin. Below this the rails stay blank.
  const MIN_RAIL = 160;
  // ...and past this a wider gutter stops making the chart bigger. On a 2560
  // display the rails are ~800px each; letting the strip grow into all of it
  // turns the page into a canyon. It stays a strip, anchored outboard.
  const MAX_CHART = 340;
  const FPS = 24;                // a recorder, not a game
  const REDUCED_FPS = 4;         // barely moving, so barely painted
  const FEED = 9;                // px/s the capture travels downward
  const REDUCED_FEED = 1.2;      // reduced motion still creeps, barely
  const MAX_DPR = 2;
  const MAJOR_EVERY = 8;         // rows between long ruler ticks

  // Three channels sharing one strip. `amp` is a fraction of the half-width,
  // so each fills whatever gutter it is handed rather than being clipped to
  // fit — the failure mode of every previous background. `hold` is how many
  // rows a level survives before the pen is allowed to step again, which is
  // what separates a nervous channel from a slow one.
  const CHANNELS = [
    { amp: 0.94, f1: 0.021, f2: 0.047, phase: 0.0, hold: 5, alpha: 0.26, width: 1, glow: false },
    { amp: 0.52, f1: 0.038, f2: 0.091, phase: 2.4, hold: 2, alpha: 0.80, width: 1, glow: true },
    { amp: 0.22, f1: 0.115, f2: 0.263, phase: 4.1, hold: 1, alpha: 0.40, width: 1, glow: false },
  ];

  const motionQuery = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  let ink = [94, 204, 128];      // --accent
  let tickInk = [86, 105, 94];   // --fg-dim
  let glowing = true;            // the paper theme declares --glow: none
  let cell = 9;                  // one character advance
  let row = 12;                  // half a line
  let cells = [];
  let raf = 0;
  let lastFrame = 0;
  let lastClock = 0;
  let clock = 0;                 // accumulated feed px, never jumps

  function hexTriplet(value, fallback) {
    const m = /^#([0-9a-f]{6})$/i.exec((value || '').trim());
    if (!m) return fallback;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  const rgba = (c, a) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

  // Ink falls off as the rail approaches the column, so the capture is
  // densest against the outer edge of the window and has thinned to almost
  // nothing by the time it reaches the gap beside the text. This is a fade
  // *within the gutter* — unlike the scrim it replaces, it is never asked to
  // clear a region that has words in it, so it cannot fail at the job.
  function falloff(ctx, c, colour, alpha) {
    const outer = c.mirror ? c.w : 0;
    const inner = c.mirror ? c.w - c.chart : c.chart;
    const g = ctx.createLinearGradient(outer, 0, inner, 0);
    g.addColorStop(0, rgba(colour, alpha));
    g.addColorStop(0.5, rgba(colour, alpha * 0.5));
    g.addColorStop(1, rgba(colour, alpha * 0.08));
    return g;
  }

  // Colours and the grid both come from the live computed style, so a theme
  // switch and a root font-size change are the same event as far as this is
  // concerned.
  function readStyle() {
    const cs = getComputedStyle(document.body);
    ink = hexTriplet(cs.getPropertyValue('--accent'), ink);
    tickInk = hexTriplet(cs.getPropertyValue('--fg-dim'), tickInk);
    glowing = cs.getPropertyValue('--glow').trim() !== 'none';
    const fs = parseFloat(cs.fontSize) || 15;
    cell = Math.max(6, Math.round(fs * 0.6));   // JetBrains Mono advance
    row = Math.max(8, Math.round(fs * 0.78));   // half a 1.55 line
  }

  // Size each canvas to the box layout gave it. If the grid collapsed the
  // gutters — narrow viewport, or the margins switched off — the cell is
  // dropped rather than drawn small.
  function measure() {
    cells = [];
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvases.forEach((canvas, i) => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      if (w < MIN_RAIL || h < 80) {
        canvas.width = 0;
        canvas.height = 0;
        return;
      }
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      cells.push({
        ctx: canvas.getContext('2d'),
        w: w,
        h: h,
        // How much of the gutter the strip is allowed to use.
        chart: Math.min(w, MAX_CHART),
        dpr: dpr,
        // The right rail is the left one mirrored, so the two read as a frame
        // around the column rather than two unrelated captures.
        mirror: i === 1,
      });
    });
    rails.dataset.on = cells.length ? '1' : '0';
  }

  // Quantised level for a channel at an absolute paper row. Held for
  // `hold` rows so the staircase has runs in it instead of stepping on
  // every single row like noise.
  function level(ch, paperRow, steps) {
    const r = Math.floor(paperRow / ch.hold) * ch.hold;
    const wave =
      Math.sin(r * ch.f1 + ch.phase) * 0.62 +
      Math.sin(r * ch.f2 + ch.phase * 1.7) * 0.38;
    return Math.round(wave * steps * ch.amp);
  }

  function drawCell(c, feed) {
    const ctx = c.ctx;
    const w = c.w;
    const h = c.h;
    ctx.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const dir = c.mirror ? -1 : 1;
    // Anchor the grid to the outer edge so the steps line up between the two
    // rails and stay put when the gutter width changes by a fraction.
    const origin = c.mirror ? w - cell : cell;
    const steps = Math.floor((c.chart - 2 * cell) / cell / 2);
    if (steps < 2) return;

    const paper = Math.floor(feed / row);        // whole rows fed so far
    const slide = Math.round(feed - paper * row); // sub-row offset, integral
    const count = Math.ceil(h / row) + 2;

    // Ruler ticks, growing inward from the outer edge: the busiest part of
    // the rail is the part furthest from the words.
    const tickX = c.mirror ? w : 0;
    ctx.strokeStyle = falloff(ctx, c, tickInk, 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = -1; k < count; k++) {
      const pr = paper + k;
      if (pr % 2) continue;
      const y = Math.round(k * row - slide) + 0.5;
      if (y < -1 || y > h + 1) continue;
      const major = pr % MAJOR_EVERY === 0;
      ctx.moveTo(tickX, y);
      ctx.lineTo(tickX + dir * (major ? cell * 1.6 : cell * 0.7), y);
    }
    ctx.stroke();

    for (let i = 0; i < CHANNELS.length; i++) {
      const ch = CHANNELS[i];
      ctx.beginPath();
      let prevX = null;
      for (let k = -1; k < count; k++) {
        const x = origin + dir * (steps + level(ch, paper + k, steps)) * cell;
        const y0 = Math.round(k * row - slide) + 0.5;
        const y1 = Math.round((k + 1) * row - slide) + 0.5;
        if (prevX === null) ctx.moveTo(x, y0);
        else ctx.lineTo(x, y0);   // the step: horizontal transition
        ctx.lineTo(x, y1);        // the run: level held down the strip
        prevX = x;
      }
      if (ch.glow && glowing) {
        ctx.lineWidth = ch.width + 2.5;
        ctx.strokeStyle = falloff(ctx, c, ink, ch.alpha * 0.14);
        ctx.stroke();
      }
      ctx.lineWidth = ch.width;
      ctx.strokeStyle = falloff(ctx, c, ink, ch.alpha);
      ctx.stroke();
    }
  }

  function paintAll(feed) {
    for (let i = 0; i < cells.length; i++) drawCell(cells[i], feed);
  }

  const reducedMotion = () => !!(motionQuery && motionQuery.matches);

  function frame(now) {
    raf = 0;
    if (!cells.length) return;
    const slow = reducedMotion();
    // A 1.2px/s creep does not need 24 repaints a second to look continuous.
    if (now - lastFrame < 1000 / (slow ? REDUCED_FPS : FPS)) {
      raf = requestAnimationFrame(frame);
      return;
    }
    // Accumulate rather than deriving the feed from absolute time: a tab that
    // slept for an hour resumes where it stopped instead of teleporting.
    const dt = Math.min(now - lastClock, 250) / 1000;
    lastClock = now;
    lastFrame = now;
    clock += dt * (slow ? REDUCED_FEED : FEED);
    paintAll(clock);
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function sync() {
    stop();
    readStyle();
    measure();
    if (!cells.length) return;
    if (document.hidden) {
      paintAll(clock);
      return;
    }
    lastClock = performance.now();
    lastFrame = 0;
    raf = requestAnimationFrame(frame);
  }

  let resizeTimer = 0;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(sync, 150);
  }

  sync();

  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', sync);
  if (motionQuery && motionQuery.addEventListener) {
    motionQuery.addEventListener('change', sync);
  }
  // Theme and the margins toggle both land as data-* on <body>.
  new MutationObserver(sync).observe(document.body, {
    attributes: true,
    attributeFilter: ['data-theme', 'data-bg'],
  });

  // A late webfont reflows the column; re-measure once it lands.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(sync);
})();
