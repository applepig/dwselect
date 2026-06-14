// DW嚴選 — shared tokens, icons, thumb, channel badge, detail, theme system, view-transition helper
// Exports to window: DWT, DWThemes, DWThemeCtx, useDWT, DWThemeToggle,
//                    DWIcon, DWThumb, DWChannel, DWPrice, DWDetail, dwMoney, useDWDetail

// ── Base (dark) tokens — kept as DWT for the original 3-up comparison file ──
const DWT = {
  bg:    '#16140e', bg2: '#1e1b13', card: '#23201a',
  line:  'rgba(255,255,255,0.09)',
  ink:   '#f6efe3', sub: 'rgba(246,239,227,0.56)', faint: 'rgba(246,239,227,0.34)',
  orange:'#ff8a3d', orangeDeep:'#f0922e', peach: '#f9c193',
  thumbBg: 'linear-gradient(150deg,#fbf7f1 0%,#f0e7da 100%)', thumbInk: '#b9a98f',
  display: '"Noto Serif TC", "Songti TC", serif',
  sans: '"Noto Sans TC", -apple-system, system-ui, sans-serif',
};

// ── Theme sets for the C route (light/dark toggle) ──
const DWThemes = {
  dark: {
    ...DWT, mode: 'dark',
    tile: DWT.thumbBg, tileInk: DWT.thumbInk,
    glass: 'rgba(22,20,14,0.86)', chipBg: '#221e16',
    scrim: 'rgba(8,7,4,0.62)', closeBg: 'rgba(20,18,12,0.55)',
    railBg: '#1a1810', shadow: '0 24px 60px rgba(0,0,0,0.5)',
  },
  light: {
    mode: 'light',
    bg: '#f7f1e7', bg2: '#fffdf8', card: '#ffffff',
    line: 'rgba(45,32,15,0.12)',
    ink: '#2a2017', sub: 'rgba(42,32,23,0.58)', faint: 'rgba(42,32,23,0.42)',
    orange: '#ec7a2b', orangeDeep: '#dd6915', peach: '#f4a559',
    tile: 'linear-gradient(150deg,#f4efe5 0%,#e8dece 100%)', tileInk: '#bfae93',
    glass: 'rgba(250,245,237,0.84)', chipBg: '#efe7d9',
    scrim: 'rgba(60,44,24,0.34)', closeBg: 'rgba(40,30,15,0.5)',
    railBg: '#fbf6ee', shadow: '0 24px 60px rgba(80,55,20,0.16)',
    display: DWT.display, sans: DWT.sans,
  },
};
const DWThemeCtx = React.createContext(DWThemes.dark);
const useDWT = () => React.useContext(DWThemeCtx);

function dwMoney(p) {
  if (p.priceLabel) return p.priceLabel;
  return 'NT$ ' + p.price.toLocaleString('en-US');
}

// ── Minimal line-icon set ──
const DW_PATHS = {
  tv:'M3 5h18v11H3z M8 20h8 M12 16v4',
  speaker:'M7 3h10v18H7z M12 9.5a3 3 0 100 6 3 3 0 000-6z M12 6.5h.01',
  soundbar:'M3 10h18v5H3z M7 12.5h.01 M11 12.5h2 M17 12.5h.01',
  table:'M3 8h18 M4 8l-1 11 M20 8l1 11 M7 8v5h10V8',
  drawer:'M4 4h16v16H4z M4 10h16 M4 15h16 M10 7h4 M10 12.5h4 M10 17.5h4',
  sofa:'M4 11V8a2 2 0 012-2h12a2 2 0 012 2v3 M3 11a2 2 0 012 2v3h14v-3a2 2 0 012-2 M5 19v-2 M19 19v-2',
  pot:'M5 9h14l-1 9a2 2 0 01-2 2H8a2 2 0 01-2-2L5 9z M3 9h18 M8 9V6a4 4 0 018 0v3',
  coffee:'M5 8h12v6a4 4 0 01-4 4H9a4 4 0 01-4-4V8z M17 9h2a2 2 0 010 4h-2 M8 3v2 M11 3v2 M14 3v2',
  airfryer:'M5 4h14v13a3 3 0 01-3 3H8a3 3 0 01-3-3V4z M9 8h6 M9 12h6 M10 20v1 M14 20v1',
  keyboard:'M3 7h18v10H3z M6 10h.01 M9 10h.01 M12 10h.01 M15 10h.01 M18 10h.01 M8 13.5h8',
  monitor:'M3 4h18v12H3z M8 20h8 M12 16v4',
  headphones:'M4 13v-1a8 8 0 0116 0v1 M4 13a2 2 0 012 2v2a2 2 0 01-4 0v-2 M20 13a2 2 0 00-2 2v2a2 2 0 004 0v-2',
  lamp:'M9 3h6l3 8H6l3-8z M12 11v7 M8 21h8',
  search:'M11 4a7 7 0 100 14 7 7 0 000-14z M20 20l-4-4',
  x:'M5 5l14 14 M19 5L5 19',
  link:'M9 15l6-6 M10 6l1-1a4 4 0 015 5l-1 1 M14 18l-1 1a4 4 0 01-5-5l1-1',
  fire:'M12 3c1 3-1 4-2 6s0 4 2 4 3-2 2-4c2 1 3 3 3 5a5 5 0 01-10 0c0-4 4-5 5-11z',
  tag:'M3 3h8l9 9-8 8-9-9V3z M7.5 7.5h.01',
  home:'M4 11l8-7 8 7 M6 10v9h12v-9',
  compass:'M12 3a9 9 0 100 18 9 9 0 000-18z M15.5 8.5l-2 5-5 2 2-5 5-2z',
  grid:'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  chevR:'M9 5l7 7-7 7', chevL:'M15 5l-7 7 7 7',
  spark:'M12 3v6 M12 15v6 M3 12h6 M15 12h6 M6.5 6.5l3 3 M14.5 14.5l3 3 M17.5 6.5l-3 3 M9.5 14.5l-3 3',
  sun:'M12 5a7 7 0 100 14 7 7 0 000-14z M12 1v2 M12 21v2 M4.2 4.2l1.4 1.4 M18.4 18.4l1.4 1.4 M1 12h2 M21 12h2 M4.2 19.8l1.4-1.4 M18.4 5.6l1.4-1.4',
  moon:'M20 14a8 8 0 01-10-10 8 8 0 1010 10z',
};
function DWIcon({ name, size = 22, stroke = 2, fill = 'none', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} style={{ flexShrink: 0, ...style }}
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {(DW_PATHS[name] || '').split(' M').map((seg, i) => <path key={i} d={(i ? 'M' : '') + seg} />)}
    </svg>
  );
}

// ── Light/dark toggle pill ──
function DWThemeToggle({ mode, onToggle, size = 38 }) {
  const T = useDWT();
  const dark = mode === 'dark';
  return (
    <button onClick={onToggle} aria-label="切換深淺色" style={{
      width: size, height: size, borderRadius: 99, cursor: 'pointer',
      border: `1px solid ${T.line}`, background: T.chipBg, color: T.orange,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <DWIcon name={dark ? 'moon' : 'sun'} size={size * 0.5} stroke={2} />
    </button>
  );
}

// ── Product thumbnail (light placeholder tile, mirrors real white product shots) ──
function DWThumb({ p, radius = 16, vtName, children, style = {} }) {
  const T = useDWT();
  return (
    <div style={{
      position: 'relative', width: '100%', background: T.tile,
      borderRadius: radius, overflow: 'hidden',
      viewTransitionName: vtName || undefined, contain: vtName ? 'paint' : undefined,
      ...style,
    }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.tileInk }}>
        <DWIcon name={p.icon} size={64} stroke={1.4} />
      </div>
      {children}
    </div>
  );
}

function DWChannel({ p, size = 'sm' }) {
  const T = useDWT();
  const ch = window.DW.channels[p.channel];
  const small = size === 'sm';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: T.sans,
      fontSize: small ? 11 : 12.5, fontWeight: 600, color: T.sub, letterSpacing: 0.2, whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: ch.tint, flexShrink: 0 }} />
      {ch.name}
    </span>
  );
}

function DWPrice({ p, size = 16, color }) {
  const T = useDWT();
  return (
    <span style={{ fontFamily: T.sans, fontWeight: 800, fontSize: size, color: color || T.orange, letterSpacing: 0.2, whiteSpace: 'nowrap' }}>
      {dwMoney(p)}
    </span>
  );
}

// ── View-transition helper: morph the tapped thumb ↔ the detail hero ──
function useDWDetail(vtKey) {
  const [open, setOpen] = React.useState(null);
  const [src, setSrc] = React.useState(null);
  const name = `dwhero-${vtKey}`;
  const run = (cb, after) => {
    if (document.startViewTransition) { const t = document.startViewTransition(cb); if (after) t.finished.finally(after); }
    else { cb(); if (after) after(); }
  };
  return {
    open, key: vtKey, heroVt: name,
    cardVt: (p) => (src === p.id && !open) ? name : undefined,
    show: (p) => { if (ReactDOM.flushSync) ReactDOM.flushSync(() => setSrc(p.id)); else setSrc(p.id); run(() => setOpen(p)); },
    hide: () => run(() => setOpen(null), () => setSrc(null)),
  };
}

// ── Detail panel — variant 'sheet' (full screen) or 'modal' (centered card) ──
function DWDetail({ ctrl, variant = 'sheet' }) {
  const T = useDWT();
  const p = ctrl.open;
  if (!p) return null;
  const inModal = variant === 'modal';
  const closeTop = inModal ? 14 : 'max(52px, env(safe-area-inset-top))';

  const Body = (
    <>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <DWThumb p={p} radius={0} vtName={ctrl.heroVt} style={{ height: inModal ? 280 : 320 }} />
        <button onClick={ctrl.hide} style={{
          position: 'absolute', top: closeTop, right: 16, width: 40, height: 40, borderRadius: 99,
          border: 'none', cursor: 'pointer', background: T.closeBg, backdropFilter: 'blur(8px)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><DWIcon name="x" size={20} /></button>
        {p.hot && (
          <span style={{ position: 'absolute', left: 16, top: closeTop, display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '6px 11px', borderRadius: 99, background: T.orange, color: '#231405', fontFamily: T.sans, fontSize: 12.5, fontWeight: 800 }}>
            <DWIcon name="fire" size={14} stroke={2} fill="#231405" /> 嚴選熱推
          </span>
        )}
      </div>
      <div style={{ padding: '22px 24px 36px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <DWChannel p={p} size="lg" />
          <h2 style={{ margin: 0, fontFamily: T.display, fontWeight: 700, fontSize: 27, color: T.ink, lineHeight: 1.25, letterSpacing: 0.3 }}>{p.name}</h2>
          <DWPrice p={p} size={26} />
        </div>
        <div style={{ position: 'relative', background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 16, padding: '16px 18px 16px 20px' }}>
          <span style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: 3, background: T.orange }} />
          <div style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: T.orange, marginBottom: 6 }}>DW 怎麼說</div>
          <p style={{ margin: 0, fontFamily: T.display, fontSize: 18, lineHeight: 1.6, color: T.ink, textWrap: 'pretty' }}>{p.review}</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {p.tags.map(t => (
            <span key={t} style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.orangeDeep,
              padding: '6px 13px', borderRadius: 99, whiteSpace: 'nowrap',
              background: 'rgba(236,122,43,0.12)', border: `1px solid rgba(236,122,43,0.28)` }}>#{t}</span>
          ))}
        </div>
        <a href="#" onClick={(e) => e.preventDefault()} style={{
          marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, height: 54, borderRadius: 16,
          textDecoration: 'none', background: `linear-gradient(180deg, ${T.peach}, ${T.orange})`, color: '#2a1605',
          fontFamily: T.sans, fontWeight: 800, fontSize: 17, boxShadow: '0 8px 22px rgba(236,122,43,0.3)' }}>
          <DWIcon name="link" size={19} stroke={2.2} /> 到 {window.DW.channels[p.channel].name} 購買
        </a>
        <p style={{ margin: '2px 0 0', textAlign: 'center', fontFamily: T.sans, fontSize: 12, color: T.faint }}>外連到通路，DW 不經手金流，安心逛</p>
      </div>
    </>
  );

  if (inModal) {
    return (
      <div onClick={ctrl.hide} style={{
        position: 'absolute', inset: 0, zIndex: 60, background: T.scrim, backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28,
      }}>
        <div onClick={(e) => e.stopPropagation()} style={{
          width: 'min(540px, 94%)', maxHeight: '90%', overflow: 'auto', background: T.bg,
          borderRadius: 26, boxShadow: T.shadow, display: 'flex', flexDirection: 'column',
        }}>{Body}</div>
      </div>
    );
  }
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 40, background: T.bg, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      {Body}
    </div>
  );
}

Object.assign(window, {
  DWT, DWThemes, DWThemeCtx, useDWT, DWThemeToggle,
  DWIcon, DWThumb, DWChannel, DWPrice, DWDetail, dwMoney, useDWDetail,
});
