// DW嚴選 — Direction C, responsive + theme-aware. Exports window.DWCApp.
// mode: 'phone' | 'tablet' | 'desktop'.  Tabs: 首頁 / 指南 / 搜尋 / 連結.
function DWCApp({ mode = 'phone', initialTheme = 'dark' }) {
  const { products, cats, tags } = window.DW;
  const [themeMode, setThemeMode] = React.useState(initialTheme);
  const T = DWThemes[themeMode];
  const ctrl = useDWDetail('c-' + mode);
  const [tab, setTab] = React.useState('home');
  const [cat, setCat] = React.useState('all');
  const [sel, setSel] = React.useState([]);
  const [q, setQ] = React.useState('');
  const query = q.trim();

  const isPhone = mode === 'phone';
  const cols = mode === 'desktop' ? 4 : mode === 'tablet' ? 3 : 2;
  const toggleTag = (t) => setSel(s => s.includes(t) ? s.filter(x => x !== t) : [...s, t]);

  const homeItems = cat === 'all' ? products : products.filter(p => p.cat === cat);
  const guideItems = products.filter(p => sel.every(t => p.tags.includes(t)));
  const searchItems = query ? products.filter(p => p.name.includes(query) || p.tags.some(t => t.includes(query)) || p.review.includes(query)) : [];

  const NAV = [
    { id: 'home', name: '首頁', icon: 'home' },
    { id: 'guide', name: '指南', icon: 'compass' },
    { id: 'search', name: '搜尋', icon: 'search' },
    { id: 'link', name: '連結', icon: 'link' },
  ];
  const sectionTitle = { home: '首頁', guide: '選購指南', search: '搜尋', link: '連結' }[tab];

  // ── product card ──
  const Card = ({ p }) => (
    <button onClick={() => ctrl.show(p)} style={{
      textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer',
      display: 'flex', flexDirection: 'column', gap: 9, width: '100%',
    }}>
      <DWThumb p={p} radius={14} vtName={ctrl.cardVt(p)} style={{ aspectRatio: '1/1', border: `1px solid ${T.line}` }}>
        <span style={{ position: 'absolute', left: 9, top: 9, display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', borderRadius: 99, background: 'rgba(20,18,12,0.62)', backdropFilter: 'blur(6px)',
          fontFamily: T.sans, fontSize: 11, fontWeight: 700, color: '#fff' }}>
          <span style={{ width: 5, height: 5, borderRadius: 99, background: window.DW.channels[p.channel].tint }} />
          {window.DW.channels[p.channel].name}
        </span>
        <span style={{ position: 'absolute', right: 9, bottom: 9, padding: '4px 11px', borderRadius: 99,
          background: T.orange, color: '#231405', fontFamily: T.sans, fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap' }}>
          {dwMoney(p).replace('NT$ ', '$')}
        </span>
      </DWThumb>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h3 style={{ margin: 0, fontFamily: T.sans, fontWeight: 700, fontSize: 14.5, color: T.ink, lineHeight: 1.3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</h3>
        <p style={{ margin: 0, fontFamily: T.sans, fontSize: 12.5, lineHeight: 1.5, color: T.sub,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.review}</p>
      </div>
    </button>
  );
  const Grid = ({ items }) => (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: mode === 'desktop' ? '28px 22px' : '20px 16px' }}>
      {items.map(p => <Card key={p.id} p={p} />)}
    </div>
  );

  const chip = (label, on, onClick, extra) => (
    <button key={label} onClick={onClick} style={{
      flexShrink: 0, padding: '8px 15px', borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap',
      fontFamily: T.sans, fontSize: 13.5, fontWeight: 700, border: 'none',
      background: on ? T.orange : T.chipBg, color: on ? '#231405' : T.sub,
    }}>{label}{extra}</button>
  );
  const tagChip = (tag, n) => {
    const on = sel.includes(tag);
    return (
      <button key={tag} onClick={() => toggleTag(tag)} style={{
        fontFamily: T.sans, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
        padding: '7px 13px', borderRadius: 99, border: `1px solid ${on ? 'transparent' : 'rgba(236,122,43,0.32)'}`,
        background: on ? T.orange : 'transparent', color: on ? '#231405' : T.orangeDeep,
      }}>#{tag}{n != null && <span style={{ opacity: 0.55, fontSize: 11, marginLeft: 4 }}>{n}</span>}</button>
    );
  };
  const searchField = (autoFocus) => (
    <div style={{ height: 48, borderRadius: 13, background: T.bg2, border: `1px solid ${T.line}`,
      display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10, color: T.faint }}>
      <DWIcon name="search" size={19} />
      <input autoFocus={autoFocus} value={q} onChange={e => setQ(e.target.value)} placeholder="在找什麼嗎？™"
        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: T.sans, fontSize: 15.5, color: T.ink }} />
      {query && <button onClick={() => setQ('')} style={{ background: 'none', border: 'none', color: T.faint, cursor: 'pointer', display: 'flex' }}><DWIcon name="x" size={18} /></button>}
    </div>
  );

  // ── panels ──
  const pad = isPhone ? 18 : mode === 'tablet' ? 28 : 40;
  const Panels = (
    <>
      {tab === 'home' && (
        <div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: `2px 0 ${isPhone ? 14 : 20}px`, scrollbarWidth: 'none' }}>
            {[{ id: 'all', name: '全部' }, ...cats].map(c => chip(c.name, cat === c.id, () => setCat(c.id)))}
          </div>
          <Grid items={homeItems} />
        </div>
      )}
      {tab === 'guide' && (
        <div>
          <p style={{ fontFamily: T.sans, fontSize: 13.5, color: T.sub, margin: '0 0 14px' }}>
            跟著標籤逛 — 選幾個標籤，越疊越精準{sel.length > 0 && <> · <span onClick={() => setSel([])} style={{ color: T.orange, cursor: 'pointer', fontWeight: 700 }}>清除 {sel.length}</span></>}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
            {tags.map(({ tag, n }) => tagChip(tag, n))}
          </div>
          <Grid items={guideItems} />
        </div>
      )}
      {tab === 'search' && (
        <div>
          <div style={{ marginBottom: 20, maxWidth: 560 }}>{searchField(!isPhone)}</div>
          {!query ? (
            <div>
              <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 800, letterSpacing: 1.2, color: T.faint, margin: '0 0 12px' }}>熱門關鍵字</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
                {tags.slice(0, 8).map(({ tag }) => (
                  <button key={tag} onClick={() => setQ(tag)} style={{ fontFamily: T.sans, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                    padding: '8px 15px', borderRadius: 99, border: `1px solid ${T.line}`, background: 'transparent', color: T.sub, whiteSpace: 'nowrap' }}>{tag}</button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <p style={{ fontFamily: T.sans, fontSize: 13.5, color: T.sub, margin: '0 0 16px' }}>找到 <b style={{ color: T.orange }}>{searchItems.length}</b> 個</p>
              {searchItems.length ? <Grid items={searchItems} /> :
                <p style={{ fontFamily: T.display, fontSize: 16, color: T.sub, textAlign: 'center', padding: '40px 0' }}>沒這個坑，去許願吧 👀</p>}
            </>
          )}
        </div>
      )}
      {tab === 'link' && (
        <div style={{ maxWidth: 560 }}>
          <p style={{ fontFamily: T.sans, fontSize: 14, lineHeight: 1.7, color: T.sub, margin: '0 0 20px' }}>
            這裡只放真心推、自己也會買的東西。沒看到想要的？到下面的地方敲一下，DW 看到對味的就嚴選進來。
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { icon: 'spark', t: '推坑串 · 許願去', s: '看大家在敲什麼，順便許願' },
              { icon: 'home', t: 'DW 的 FB 粉專', s: '追蹤每週嚴選更新' },
              { icon: 'tag', t: '分類總覽', s: '影音 · 居家 · 廚房 · 3C · 生活' },
            ].map(r => (
              <a key={r.t} href="#" onClick={e => e.preventDefault()} style={{ textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: 14, padding: '15px 16px', borderRadius: 16,
                background: T.card, border: `1px solid ${T.line}` }}>
                <span style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: 'rgba(236,122,43,0.14)', color: T.orange, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DWIcon name={r.icon} size={22} stroke={1.9} />
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontFamily: T.sans, fontWeight: 700, fontSize: 15.5, color: T.ink }}>{r.t}</span>
                  <span style={{ display: 'block', fontFamily: T.sans, fontSize: 12.5, color: T.sub, marginTop: 2 }}>{r.s}</span>
                </span>
                <DWIcon name="chevR" size={18} stroke={2.2} style={{ color: T.faint }} />
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );

  // ── PHONE layout ──
  if (isPhone) {
    return (
      <DWThemeCtx.Provider value={T}>
        <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', background: T.bg, fontFamily: T.sans }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 20, background: T.glass, backdropFilter: 'blur(12px)',
            padding: '52px 18px 12px', borderBottom: `1px solid ${T.line}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 style={{ margin: 0, fontFamily: T.display, fontWeight: 900, fontSize: 21, color: T.ink, letterSpacing: 0.5 }}>
              DW<span style={{ color: T.orange }}>嚴選</span>
            </h1>
            <DWThemeToggle mode={themeMode} onToggle={() => setThemeMode(m => m === 'dark' ? 'light' : 'dark')} />
          </div>
          <div style={{ flex: 1, padding: '16px 18px 96px' }}>{Panels}</div>
          <div style={{ position: 'sticky', bottom: 0, zIndex: 30, display: 'flex', background: T.glass,
            backdropFilter: 'blur(16px)', borderTop: `1px solid ${T.line}`, padding: '9px 8px 26px' }}>
            {NAV.map(t => {
              const on = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: on ? T.orange : T.faint }}>
                  <DWIcon name={t.icon} size={23} stroke={on ? 2.3 : 1.9} />
                  <span style={{ fontFamily: T.sans, fontSize: 10.5, fontWeight: on ? 800 : 600 }}>{t.name}</span>
                </button>
              );
            })}
          </div>
          <DWDetail ctrl={ctrl} variant="sheet" />
        </div>
      </DWThemeCtx.Provider>
    );
  }

  // ── TABLET / DESKTOP layout (left nav + main) ──
  const wide = mode === 'desktop';
  const railW = wide ? 232 : 96;
  return (
    <DWThemeCtx.Provider value={T}>
      <div style={{ position: 'relative', height: '100%', display: 'flex', background: T.bg, fontFamily: T.sans, overflow: 'hidden' }}>
        {/* left nav */}
        <nav style={{ width: railW, flexShrink: 0, background: T.railBg, borderRight: `1px solid ${T.line}`,
          display: 'flex', flexDirection: 'column', padding: wide ? '26px 16px' : '24px 10px' }}>
          <h1 style={{ margin: wide ? '0 8px 28px' : '0 0 26px', textAlign: wide ? 'left' : 'center',
            fontFamily: T.display, fontWeight: 900, fontSize: wide ? 23 : 16, color: T.ink, letterSpacing: 0.5, lineHeight: 1.2 }}>
            DW<span style={{ color: T.orange }}>嚴選</span>
          </h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {NAV.map(t => {
              const on = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{ cursor: 'pointer', border: 'none',
                  display: 'flex', alignItems: 'center', gap: wide ? 12 : 0, justifyContent: wide ? 'flex-start' : 'center',
                  flexDirection: wide ? 'row' : 'column', padding: wide ? '11px 13px' : '10px 0', borderRadius: 12,
                  background: on ? 'rgba(236,122,43,0.14)' : 'transparent', color: on ? T.orange : T.sub }}>
                  <DWIcon name={t.icon} size={wide ? 21 : 22} stroke={on ? 2.3 : 2} />
                  <span style={{ fontFamily: T.sans, fontSize: wide ? 15 : 10.5, fontWeight: on ? 800 : 600, marginTop: wide ? 0 : 4 }}>{t.name}</span>
                </button>
              );
            })}
          </div>
          <div style={{ flex: 1 }} />
          <a href="#" onClick={e => e.preventDefault()} style={{ textDecoration: 'none', textAlign: 'center', fontFamily: T.sans, fontSize: 11, color: T.faint, padding: 8 }}>
            {wide ? '一個人的推坑精選' : ''}
          </a>
        </nav>

        {/* main */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ flexShrink: 0, position: 'sticky', top: 0, zIndex: 10, background: T.glass, backdropFilter: 'blur(12px)',
            borderBottom: `1px solid ${T.line}`, padding: wide ? '22px 40px' : '20px 28px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontFamily: T.display, fontWeight: 800, fontSize: wide ? 26 : 22, color: T.ink, letterSpacing: 0.5 }}>{sectionTitle}</h2>
            <DWThemeToggle mode={themeMode} onToggle={() => setThemeMode(m => m === 'dark' ? 'light' : 'dark')} size={wide ? 42 : 38} />
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: `${wide ? 28 : 22}px ${pad}px ${pad}px` }}>{Panels}</div>
        </div>

        <DWDetail ctrl={ctrl} variant="modal" />
      </div>
    </DWThemeCtx.Provider>
  );
}
window.DWCApp = DWCApp;
