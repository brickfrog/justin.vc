/* ─────────────────────────────────────────────────────────────
   justin.vc — background field

   A screen full of text, just out of focus, with a refresh beam sweeping down
   it. The page is monospace cells, box rules and scanlines all the way down, so
   the background is built from the same material: a character grid, not a
   picture. Two earlier attempts (a photo under a veil, then smooth contour
   lines) failed on geometry — curves behind a page made entirely of rectangles
   read as decoration stuck on from somewhere else.

   Shape notes:

   * Full-bleed, no aperture of its own. The hole over the reading column is cut
     by #bgveil, a radial scrim painted over this canvas and under the content.
     A mask baked in here could only ever be f(x)·g(y) — a soft rectangle — and
     no amount of tuning turns that into a radial.
   * A gentle horizontal lean keeps the middle quieter than the edges, so the
     scrim never has to work hard where the text actually sits.

   Cost notes, which are the whole reason this shape was chosen:

   * The field is static apart from the beam. Steady-state cost is three rows
     repainted per step — O(cols), not O(cols·rows) — so a 4K display costs
     about what a laptop does. Only resize and theme change repaint everything.
   * Glyphs churn when the beam passes, so the text changes without a separate
     animation and without ever touching a cell the beam isn't already on.
   * The beam is the only motion. Random twinkle everywhere reads as noise;
     one coherent sweep reads as a machine.

   Honours prefers-reduced-motion by slowing the sweep rather than freezing,
   sleeps on a hidden tab or with the background setting off, and retints when
   the theme changes. CSS owns the width at which the whole thing switches off,
   via --field-on, so the breakpoint lives in exactly one file.
   ───────────────────────────────────────────────────────────── */
(function () {
  const canvas = document.getElementById('bgfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const CELL = 15;              // css px per character cell
  const FPS = 20;               // ambient, not a game
  const FRAME_MS = 1000 / FPS;
  const ROWS_PER_SEC = 7;       // beam speed; a full sweep runs ~8-10s
  const REDUCED_SPEED = 0.2;    // reduced motion drifts, it does not stop
  // Cell budget, not a pixel budget. Past this the cell grows, so the initial
  // full paint stays bounded no matter how large the display is.
  const MAX_CELLS = 24000;
  const MUTATE = 0.3;           // fraction of a row's glyphs re-rolled per pass
  const DPR_CAP = 2;

  // Weighted toward blank: a dense wall of characters is noise, a sparse one
  // reads as a screen with something on it. Roughly a third of the field is
  // empty.
  const GLYPHS = (
    '        ' +
    '0123456789abcdef' +
    '/\\|-_=+<>[]{}()' +
    '.,:;·×÷^~*#%$&@?!'
  );

  const motionQuery = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  let cols = 0;
  let rows = 0;
  let cell = CELL;              // css px, after the budget has had its say
  let dpr = 1;
  let glyph = null;             // Uint8Array(cols * rows), index into GLYPHS
  let jitter = null;            // Float32Array(cols * rows), per-cell alpha wobble
  let lean = null;              // Float32Array(cols), quiet middle, full edges
  let rgb = '94,204,128';       // accent, as an rgb triplet for rgba()
  let raf = 0;
  let lastFrame = 0;
  let lastClock = 0;
  let beam = 0;                 // fractional row position of the refresh beam
  let painted = -1;             // integer row the beam was last drawn at
  // Base ink, the beam itself, and the one row of afterglow behind it. Base has
  // to survive being multiplied by the per-cell jitter, the lean, and the
  // canvas opacity, so it starts high.
  const A_BASE = 0.42;
  const A_TRAIL = 0.72;
  const A_BEAM = 1;

  function readAccent() {
    const raw = getComputedStyle(document.body).getPropertyValue('--accent').trim();
    const hex = /^#([0-9a-f]{6})$/i.exec(raw);
    // Themes all declare --accent as 6-digit hex; fall back to phosphor green.
    const n = hex ? parseInt(hex[1], 16) : 0x5ecc80;
    rgb = ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
  }

  function enabled() {
    return getComputedStyle(document.body).getPropertyValue('--field-on').trim() !== '0';
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (!w || !h) return;

    cell = CELL;
    while (Math.ceil(w / cell) * Math.ceil(h / cell) > MAX_CELLS) cell += 1;
    cols = Math.max(8, Math.ceil(w / cell));
    rows = Math.max(8, Math.ceil(h / cell));

    dpr = Math.min(DPR_CAP, window.devicePixelRatio || 1);
    canvas.width = Math.round(cols * cell * dpr);
    canvas.height = Math.round(rows * cell * dpr);

    const n = cols * rows;
    glyph = new Uint8Array(n);
    jitter = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      glyph[i] = (Math.random() * GLYPHS.length) | 0;
      // Uneven ink per cell, so the field has texture standing still.
      jitter[i] = 0.45 + Math.random() * 0.55;
    }

    // A lean, not an aperture: the scrim cuts the actual hole. This only keeps
    // the middle quiet enough that the scrim's thin top and bottom still have
    // an easy job over text.
    const mid = cols / 2;
    lean = new Float32Array(cols);
    for (let x = 0; x < cols; x++) {
      const t = Math.min(1, Math.abs(x - mid) / mid);
      lean[x] = 0.38 + 0.62 * t * t;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.textBaseline = 'top';
    ctx.font = Math.round(cell * 0.82) + 'px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
    painted = -1;
    paintAll();
  }

  // Rows are painted whole: one clearRect and then a run of fillText, which is
  // cheaper than clearing and stroking each cell on its own.
  function paintRow(y, level) {
    if (y < 0 || y >= rows) return;
    const top = y * cell;
    ctx.clearRect(0, top, cols * cell, cell);
    const row = y * cols;
    for (let x = 0; x < cols; x++) {
      const i = row + x;
      const g = GLYPHS[glyph[i]];
      if (g === ' ') continue;
      ctx.fillStyle = 'rgba(' + rgb + ',' + (jitter[i] * lean[x] * level).toFixed(3) + ')';
      ctx.fillText(g, x * cell, top);
    }
  }

  function paintAll() {
    ctx.clearRect(0, 0, cols * cell, rows * cell);
    for (let y = 0; y < rows; y++) paintRow(y, A_BASE);
  }

  function step(y) {
    // Churn the row the beam is arriving at, so the text changes only where
    // something is already being repainted.
    const row = y * cols;
    const nMutate = (cols * MUTATE) | 0;
    for (let k = 0; k < nMutate; k++) {
      const i = row + ((Math.random() * cols) | 0);
      glyph[i] = (Math.random() * GLYPHS.length) | 0;
      jitter[i] = 0.45 + Math.random() * 0.55;
    }
    // Settle what the beam has left behind, then draw the beam and its glow.
    paintRow(y - 2, A_BASE);
    paintRow(y - 1, A_TRAIL);
    paintRow(y, A_BEAM);
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - lastFrame < FRAME_MS) return;
    lastFrame = now;

    const reduced = motionQuery ? motionQuery.matches : false;
    // Accumulate rather than read the wall clock, so a speed change or a pause
    // resumes where the beam left off instead of snapping to a new position.
    const dt = lastClock ? Math.min(0.25, (now - lastClock) / 1000) : 0;
    lastClock = now;
    beam += dt * ROWS_PER_SEC * (reduced ? REDUCED_SPEED : 1);

    // Wrap two rows past the bottom so the trailing glow is cleaned up before
    // the beam reappears at the top.
    if (beam >= rows + 2) beam -= rows + 2;

    const y = beam | 0;
    if (y !== painted) {
      painted = y;
      step(y);
    }
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
    // loop may need starting or stopping; resize() repaints on its own.
    resizeTimer = setTimeout(() => { resize(); sync(); }, 150);
  });

  document.addEventListener('visibilitychange', sync);
  if (motionQuery && motionQuery.addEventListener) {
    motionQuery.addEventListener('change', () => { lastClock = 0; });
  }
  // Theme and background-toggle both land as data-* on <body>. A theme change
  // only alters the ink, but every cell already on screen carries the old
  // colour, so the whole field has to be laid down again.
  new MutationObserver(() => { readAccent(); paintAll(); sync(); })
    .observe(document.body, { attributes: true, attributeFilter: ['data-theme', 'data-bg'] });

  readAccent();
  resize();
  sync();
  // The first paint above may have used a fallback face; redo it once the real
  // monospace is in, otherwise the cell grid and the glyph advances disagree.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { resize(); });
  }
})();
