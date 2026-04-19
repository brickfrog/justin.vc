/* ─────────────────────────────────────────────────────────────
   justin.vc — shared chrome behavior
   themes · scanlines · bg · density · cmd palette · tweaks
   Exposes: window.jvc = { state, applyState, openCmd, closeCmd, on(cmd, fn) }
   ───────────────────────────────────────────────────────────── */
(function () {
  const TWEAK_KEYS = ['theme', 'scan', 'bg', 'density', 'banner-idx'];
  const STORAGE_KEY = 'justinvc.tweaks';

  const DEFAULTS = (window.TWEAK_DEFAULTS || {
    theme: 'phosphor',
    scan: 'subtle',
    bg: 'on',
    density: 'comfy',
    'banner-idx': 'random'
  });

  let state = { ...DEFAULTS };
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    state = { ...state, ...stored };
  } catch (e) {}

  // ── apply to DOM ──
  // `banner` is false on initial boot (the inline script in the page already
  // picked one synchronously to avoid FOUC). `set()` passes true so user
  // changes actually swap the art.
  function applyState(banner) {
    document.body.dataset.theme = state.theme;
    document.body.dataset.scan = state.scan;
    document.body.dataset.bg = state.bg;
    document.body.dataset.density = state.density || 'comfy';
    if (banner && window.__setBanner) window.__setBanner(state['banner-idx']);
    // sync UI
    document.querySelectorAll('.tweak-opts').forEach(grp => {
      const key = grp.dataset.key;
      grp.querySelectorAll('.tweak-opt').forEach(btn => {
        btn.classList.toggle('on', String(state[key]) === btn.dataset.val);
      });
    });
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function postEdit() {
    try {
      const edits = {};
      TWEAK_KEYS.forEach(k => edits[k] = state[k]);
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits }, '*');
    } catch (e) {}
  }

  function set(key, val) {
    state[key] = val;
    applyState(key === 'banner-idx');
    persist();
    postEdit();
  }

  // ── tweaks panel wiring ──
  function wireTweaks() {
    const panel = document.getElementById('tweaks');
    if (!panel) return;
    panel.querySelectorAll('.tweak-opts').forEach(grp => {
      grp.addEventListener('click', e => {
        const btn = e.target.closest('.tweak-opt');
        if (!btn) return;
        set(grp.dataset.key, btn.dataset.val);
      });
    });
    const x = document.getElementById('tweaks-close');
    if (x) x.addEventListener('click', () => panel.classList.remove('on'));
    const toggle = document.getElementById('tweaks-toggle');
    if (toggle) toggle.addEventListener('click', () => panel.classList.toggle('on'));
    // `,` keybind — outside inputs, mirrors the `/` handler
    document.addEventListener('keydown', e => {
      if (e.key !== ',') return;
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      panel.classList.toggle('on');
    });
  }

  // ── host edit-mode wiring ──
  window.addEventListener('message', e => {
    if (!e.data) return;
    const panel = document.getElementById('tweaks');
    if (e.data.type === '__activate_edit_mode' && panel) panel.classList.add('on');
    else if (e.data.type === '__deactivate_edit_mode' && panel) panel.classList.remove('on');
  });
  try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (e) {}

  // ── cmd palette ──
  const extraCommands = {};
  function on(name, fn) { extraCommands[name] = fn; }

  function wireCmd() {
    const cmd = document.getElementById('cmd');
    const input = document.getElementById('cmd-input');
    const log = document.getElementById('cmd-log');
    if (!cmd || !input || !log) return;

    function openCmd() { cmd.classList.add('on'); input.focus(); }
    function closeCmd() { cmd.classList.remove('on'); input.value = ''; }
    function logLine(html, cls = '') {
      const el = document.createElement('div');
      el.className = 'line ' + cls;
      el.innerHTML = html;
      log.appendChild(el);
      log.scrollTop = log.scrollHeight;
    }

    window.jvc.openCmd = openCmd;
    window.jvc.closeCmd = closeCmd;
    window.jvc.logCmd = logLine;

    document.addEventListener('keydown', e => {
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (e.key === '/' && !cmd.classList.contains('on') && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        openCmd();
      } else if (e.key === 'Escape' && cmd.classList.contains('on')) {
        closeCmd();
      }
    });

    input.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const raw = input.value.trim();
      if (!raw) return;
      input.value = '';
      logLine(`<b>$</b> ${raw.replace(/</g, '&lt;')}`);
      const [c, ...rest] = raw.toLowerCase().split(/\s+/);
      const arg = rest.join(' ');

      // built-ins
      switch (c) {
        case 'help':
          logLine('commands: help, theme &lt;phosphor|amber|ice|paper&gt;, scan &lt;off|subtle|heavy&gt;, bg &lt;on|off&gt;, density &lt;comfy|compact&gt;, banner &lt;0-3|random&gt;, clear, close, home' + (Object.keys(extraCommands).length ? ', ' + Object.keys(extraCommands).join(', ') : ''));
          return;
        case 'theme':
          if (['phosphor','amber','ice','paper'].includes(arg)) { set('theme', arg); logLine(`theme → ${arg}`); }
          else logLine('theme: phosphor | amber | ice | paper', 'err');
          return;
        case 'scan':
          if (['off','subtle','heavy'].includes(arg)) { set('scan', arg); logLine(`scan → ${arg}`); }
          else logLine('scan: off | subtle | heavy', 'err');
          return;
        case 'bg':
          if (['on','off'].includes(arg)) { set('bg', arg); logLine(`bg → ${arg}`); }
          else logLine('bg: on | off', 'err');
          return;
        case 'density':
          if (['comfy','compact'].includes(arg)) { set('density', arg); logLine(`density → ${arg}`); }
          else logLine('density: comfy | compact', 'err');
          return;
        case 'banner':
          if (arg === 'random' || /^[0-3]$/.test(arg)) { set('banner-idx', arg); logLine(`banner → ${arg}`); }
          else logLine('banner: 0 | 1 | 2 | 3 | random', 'err');
          return;
        case 'clear':
          log.innerHTML = ''; return;
        case 'close': case 'exit': case 'q':
          closeCmd(); return;
        case 'home':
          window.location.href = window.jvc.rootPath + 'index.html'; return;
      }

      // page-local extras
      if (extraCommands[c]) {
        const res = extraCommands[c](arg);
        if (typeof res === 'string') logLine(res);
        return;
      }

      logLine(`${c}: command not found. try 'help'.`, 'err');
    });
  }

  // ── expose ──
  window.jvc = {
    get state() { return { ...state }; },
    set,
    applyState,
    on,
    rootPath: document.currentScript && document.currentScript.dataset.root || './'
  };

  // ── boot ──
  function boot() {
    wireTweaks();
    wireCmd();
    applyState();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
