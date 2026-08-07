/* ─────────────────────────────────────────────────────────────
   justin.vc — background field

   Level sets of a slowly rotating wave field, drawn as thin glowing contours in
   the theme accent. Think a scope trace or a topographic plot rather than noise:
   lines read as drawn, speckle reads as dirt.

   Shape notes, because two earlier attempts got this wrong:

   * The field is full-bleed and carries no aperture of its own. A separable
     mask — some f(x) times some g(y) — can only ever produce a soft-edged
     rectangle, which is why every attempt to "soften the curtain" stayed a
     curtain. The hole in the middle is cut by #bgveil, a radial scrim painted
     over the canvas and under the content. A radial is a joint function of x
     and y and cannot be faked by multiplying two 1-D ramps.
   * The canvas keeps only a gentle horizontal lean, quiet in the middle and
     full at the edges. That is not the aperture; it just means the scrim never
     has to work hard where the text lives, including at the top and bottom of
     the viewport where the ellipse is naturally thin.

   Cost notes:

   * One backing-store pixel per CELL css pixels, upscaled by CSS. Unlike the
     dithered version this one wants the browser's smoothing — bilinear blowup
     of a coarse buffer is what makes the contours glow instead of stair-step.
   * Plane waves are evaluated by angle addition: sin(ax+by+wt) expands to
     sin(ax+wt)cos(by) + cos(ax+wt)sin(by), so an arbitrary direction still
     comes from per-column and per-row tables. A frame precomputes a few
     thousand trig calls and the inner loop is multiply-add.
   * Contours are normalized by the local gradient, so lines keep an even
     thickness instead of ballooning wherever the field goes flat.

   Honours prefers-reduced-motion by slowing to a drift rather than freezing,
   sleeps on a hidden tab or with the background setting off, and retints itself
   when the theme changes. CSS owns the width at which the whole thing switches
   off, via --field-on, so the breakpoint lives in exactly one file.
   ───────────────────────────────────────────────────────────── */
(function () {
  const canvas = document.getElementById('bgfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const CELL = 5;               // css px per field cell
  const FPS = 24;               // ambient, not a game — 60 would be waste
  const FRAME_MS = 1000 / FPS;
  const REDUCED_SPEED = 0.15;   // reduced motion drifts, it does not stop
  // Cell budget, not a pixel budget: past this the cell grows so a 4K display
  // costs the same as a laptop. The contours are a soft bilinear blowup anyway,
  // so a coarser buffer is nearly invisible and the cost scales with area fast.
  const MAX_CELLS = 70000;
  const LEVELS = 6;             // isolines across the field's range
  const HALF = 0.85;            // contour half-width, in cells

  // Four plane waves. The first three are the detail; the fourth is a slow,
  // long-wavelength swell at high amplitude, which is what makes the whole
  // pattern migrate and breathe rather than just wobble in place.
  const WAVES = [
    { ax: 0.055, by: 0.031, w: 0.31, amp: 1.00 },
    { ax: -0.037, by: 0.049, w: -0.23, amp: 0.85 },
    { ax: 0.024, by: -0.028, w: 0.17, amp: 0.70 },
    { ax: 0.011, by: 0.009, w: 0.09, amp: 1.30 },
  ];
  const AMP_SUM = WAVES.reduce((s, k) => s + k.amp, 0);

  // Palette cycling, the Earthbound trick: the colours never move, the *indices*
  // do. The table is built once per theme; each frame only offsets where the
  // field reads into it, so hue appears to flow along the contours.
  //
  // Hue span is deliberately tight and lightness carries most of the banding.
  // A wide hue sweep looks great on phosphor, whose green sits in a broad
  // perceptual band, but amber's accent is near 33 degrees, so anything past
  // about 25 swings the lines red and reads as an alarm rather than a theme.
  // Lightness cannot go off-brand no matter the accent, so it does the work.
  const PAL = 24;
  const HUE_SPAN = 18;          // degrees either side of the accent hue
  const LIGHT_SPAN = 0.12;      // and either side of its lightness
  const CYCLE = 1.1;            // palette indices per second
  const palette = new Uint8Array(PAL * 3);

  const motionQuery = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  let cols = 0;
  let rows = 0;
  let image = null;
  let data = null;       // Uint8ClampedArray view of the ImageData
  let field = null;      // Float32Array(cols * rows), the raw wave field
  let lean = null;       // Float32Array(cols), gentle horizontal weighting
  let sx = [];           // per-wave sin/cos over x, phase-shifted by time
  let cx = [];
  let sy = [];           // per-wave sin/cos over y
  let cy = [];
  let raf = 0;
  let lastFrame = 0;
  let lastClock = 0;
  let clock = 0;         // accumulated, so speed changes never jump the field

  function hueToRgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  function buildPalette() {
    const raw = getComputedStyle(document.body).getPropertyValue('--accent').trim();
    const hex = /^#([0-9a-f]{6})$/i.exec(raw);
    // Themes all declare --accent as 6-digit hex; fall back to phosphor green.
    const n = hex ? parseInt(hex[1], 16) : 0x5ecc80;
    const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    let h = 0;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
      if (h < 0) h += 1;
    }

    // Keep the accent's saturation; sweep hue and lightness in quadrature so a
    // band's tint and its brightness peak at different indices, which reads as
    // richer banding than either sweep alone.
    for (let i = 0; i < PAL; i++) {
      const th = (i / PAL) * Math.PI * 2;
      const hh = h + (HUE_SPAN / 360) * Math.sin(th);
      const ll = Math.min(0.92, Math.max(0.08, l + LIGHT_SPAN * Math.sin(th + Math.PI / 2)));
      const q = ll < 0.5 ? ll * (1 + s) : ll + s - ll * s;
      const p = 2 * ll - q;
      palette[i * 3] = hueToRgb(p, q, hh + 1 / 3) * 255;
      palette[i * 3 + 1] = hueToRgb(p, q, hh) * 255;
      palette[i * 3 + 2] = hueToRgb(p, q, hh - 1 / 3) * 255;
    }
  }

  function enabled() {
    return getComputedStyle(document.body).getPropertyValue('--field-on').trim() !== '0';
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (!w || !h) return;

    let cell = CELL;
    while (Math.ceil(w / cell) * Math.ceil(h / cell) > MAX_CELLS) cell += 1;
    cols = Math.max(8, Math.ceil(w / cell));
    rows = Math.max(8, Math.ceil(h / cell));

    canvas.width = cols;
    canvas.height = rows;
    image = ctx.createImageData(cols, rows);
    data = image.data;
    field = new Float32Array(cols * rows);

    sx = WAVES.map(() => new Float32Array(cols));
    cx = WAVES.map(() => new Float32Array(cols));
    sy = WAVES.map(() => new Float32Array(rows));
    cy = WAVES.map(() => new Float32Array(rows));
    for (let k = 0; k < WAVES.length; k++) {
      const by = WAVES[k].by;
      for (let y = 0; y < rows; y++) {
        sy[k][y] = Math.sin(by * y);
        cy[k][y] = Math.cos(by * y);
      }
    }

    // A lean, not an aperture: the scrim cuts the actual hole. This only keeps
    // the middle quiet enough that the scrim's thin top and bottom still have an
    // easy job over text.
    const cxp = cols / 2;
    lean = new Float32Array(cols);
    for (let x = 0; x < cols; x++) {
      const t = Math.min(1, Math.abs(x - cxp) / cxp);
      lean[x] = 0.22 + 0.78 * t * t;
    }
  }

  function draw() {
    const phase = clock * CYCLE;
    for (let k = 0; k < WAVES.length; k++) {
      const { ax, w } = WAVES[k];
      const sxk = sx[k], cxk = cx[k];
      for (let x = 0; x < cols; x++) {
        const p = ax * x + w * clock;
        sxk[x] = Math.sin(p);
        cxk[x] = Math.cos(p);
      }
    }

    // Pass one: the scalar field, normalized into roughly [0, 1]. The waves are
    // unrolled and their row terms hoisted out of the x loop — with a generic
    // inner loop this is four array-of-object property lookups and four double
    // index chains per cell, which dominates at 2560 wide.
    const inv = 0.5 / AMP_SUM;
    const sx0 = sx[0], cx0 = cx[0], sy0 = sy[0], cy0 = cy[0], a0 = WAVES[0].amp;
    const sx1 = sx[1], cx1 = cx[1], sy1 = sy[1], cy1 = cy[1], a1 = WAVES[1].amp;
    const sx2 = sx[2], cx2 = cx[2], sy2 = sy[2], cy2 = cy[2], a2 = WAVES[2].amp;
    const sx3 = sx[3], cx3 = cx[3], sy3 = sy[3], cy3 = cy[3], a3 = WAVES[3].amp;
    for (let y = 0; y < rows; y++) {
      const row = y * cols;
      const sy0y = sy0[y], cy0y = cy0[y];
      const sy1y = sy1[y], cy1y = cy1[y];
      const sy2y = sy2[y], cy2y = cy2[y];
      const sy3y = sy3[y], cy3y = cy3[y];
      for (let x = 0; x < cols; x++) {
        // sin(ax + by + wt) by angle addition — no per-cell trig call
        const v = a0 * (sx0[x] * cy0y + cx0[x] * sy0y)
                + a1 * (sx1[x] * cy1y + cx1[x] * sy1y)
                + a2 * (sx2[x] * cy2y + cx2[x] * sy2y)
                + a3 * (sx3[x] * cy3y + cx3[x] * sy3y);
        field[row + x] = v * inv + 0.5;
      }
    }

    // Pass two: contours, with the isoline distance divided by the local
    // gradient so a flat region yields a thin line rather than a fat blob.
    for (let y = 0; y < rows; y++) {
      const row = y * cols;
      const up = y > 0 ? row - cols : row;
      const dn = y < rows - 1 ? row + cols : row;
      for (let x = 0; x < cols; x++) {
        const i = row + x;
        const xl = x > 0 ? i - 1 : i;
        const xr = x < cols - 1 ? i + 1 : i;
        const v = field[i];

        const s = v * LEVELS;
        const dv = Math.abs(s - Math.floor(s) - 0.5) / LEVELS;
        const gx = (field[xr] - field[xl]) * 0.5;
        const gy = (field[dn] - field[up]) * 0.5;
        const g = Math.sqrt(gx * gx + gy * gy) + 1e-5;

        let a = 1 - dv / (g * HALF);
        const o = i << 2;
        if (a <= 0) { data[o + 3] = 0; continue; }
        if (a > 1) a = 1;
        // Read the palette at the field value plus the running phase. Because
        // the index moves and the table does not, hue flows along the contours.
        let pi = (v * PAL + phase) | 0;
        pi %= PAL;
        if (pi < 0) pi += PAL;
        pi *= 3;
        data[o] = palette[pi];
        data[o + 1] = palette[pi + 1];
        data[o + 2] = palette[pi + 2];
        data[o + 3] = a * a * lean[x] * 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - lastFrame < FRAME_MS) return;
    lastFrame = now;

    const reduced = motionQuery ? motionQuery.matches : false;
    // Accumulate rather than read the wall clock, so a speed change or a pause
    // resumes where the field left off instead of snapping to a new phase.
    const dt = lastClock ? Math.min(0.25, (now - lastClock) / 1000) : 0;
    lastClock = now;
    clock += dt * (reduced ? REDUCED_SPEED : 1);

    draw();
    canvas.classList.add('ready');
  }

  function sync() {
    const run = enabled() && document.body.dataset.bg !== 'off' && !document.hidden;
    if (run) {
      if (!raf) { lastClock = 0; raf = requestAnimationFrame(frame); }
    } else if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    // A resize can cross the --field-on breakpoint in either direction, so the
    // loop may need starting or stopping; a running loop repaints on its own.
    resizeTimer = setTimeout(() => { resize(); sync(); }, 150);
  });

  document.addEventListener('visibilitychange', sync);
  if (motionQuery && motionQuery.addEventListener) {
    motionQuery.addEventListener('change', () => { lastClock = 0; });
  }
  // Theme and background-toggle both land as data-* on <body>.
  new MutationObserver(() => { buildPalette(); sync(); })
    .observe(document.body, { attributes: true, attributeFilter: ['data-theme', 'data-bg'] });

  buildPalette();
  resize();
  sync();
})();
