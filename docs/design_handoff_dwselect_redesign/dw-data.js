// DW嚴選 — content model (plain JS, sets window.DW)
// Prices are numbers; priceLabel overrides display when present (e.g. "低於 60000").
window.DW = {
  channels: {
    pchome:   { name: 'PChome',    tint: '#e6332a' },
    momo:     { name: 'momo',      tint: '#e4007f' },
    amazonjp: { name: 'Amazon JP', tint: '#ff9900' },
    shopee:   { name: '蝦皮',       tint: '#ee4d2d' },
    official: { name: '官網',       tint: '#6b8f4e' },
  },
  cats: [
    { id: 'av',      name: '影音', icon: 'tv' },
    { id: 'home',    name: '居家', icon: 'sofa' },
    { id: 'kitchen', name: '廚房', icon: 'pot' },
    { id: '3c',      name: '3C',  icon: 'monitor' },
    { id: 'life',    name: '生活', icon: 'lamp' },
  ],
  products: [
    { id: 'sharp-xled', name: 'Sharp 65吋 XLED', price: 43000, cat: 'av', icon: 'tv',
      channel: 'pchome', hot: true, tags: ['電視', '影音', '4K'],
      review: '不想買 OLED 的話，現在 Sharp XLED 大概是最香的選擇。' },
    { id: 'lg-c4', name: 'LG C4 65吋 OLED', price: 59900, priceLabel: '低於 60000', cat: 'av', icon: 'tv',
      channel: 'pchome', hot: true, tags: ['電視', '影音', 'OLED'],
      review: 'OLED 入門就它，黑得很有誠意，預算夠就閉眼買。' },
    { id: 'benq-e55', name: 'BenQ E55-735', price: 13999, cat: 'av', icon: 'tv',
      channel: 'pchome', tags: ['電視', '護眼'],
      review: '便宜大碗護眼牌，長輩房、第二台首選。' },
    { id: 'benq-e43', name: 'BenQ E43-735', price: 10999, cat: 'av', icon: 'tv',
      channel: 'pchome', tags: ['電視', '護眼'],
      review: '小房間剛剛好，價格甜到有點不真實。' },
    { id: 'elac-dbr62', name: 'ELAC DBR62 書架喇叭', price: 18900, cat: 'av', icon: 'speaker',
      channel: 'official', tags: ['喇叭', '影音', 'Hi-Fi'],
      review: '一對抵十對，聽過這個就回不去了，慎入。' },
    { id: 'pana-soundbar', name: '國際牌 Soundbar', price: 8990, cat: 'av', icon: 'soundbar',
      channel: 'momo', tags: ['喇叭', '影音'],
      review: '懶人升級音場，插上去就有感，CP 值很高。' },

    { id: 'nordic-table', name: '北歐風茶几組', price: 4580, cat: 'home', icon: 'table',
      channel: 'shopee', tags: ['家具', '客廳'],
      review: '租屋族的客廳救星，組裝五分鐘搞定。' },
    { id: 'muji-drawer', name: '無印風五斗櫃', price: 3290, cat: 'home', icon: 'drawer',
      channel: 'momo', tags: ['收納', '臥室'],
      review: '看起來貴三倍的那種收納櫃，質感詐欺。' },
    { id: 'cat-sofa', name: '防潑水貓抓沙發', price: 12800, cat: 'home', icon: 'sofa',
      channel: 'official', hot: true, tags: ['家具', '客廳'],
      review: '貓抓也不怕，躺上去就不想起來的那種。' },

    { id: 'lodge-pot', name: 'Lodge 鑄鐵鍋', price: 1680, cat: 'kitchen', icon: 'pot',
      channel: 'amazonjp', tags: ['廚具', '露營'],
      review: '一輩子只要買這一個，傳家等級。' },
    { id: 'espresso', name: '義式半自動咖啡機', price: 8900, cat: 'kitchen', icon: 'coffee',
      channel: 'pchome', hot: true, tags: ['咖啡', '廚房'],
      review: '在家當咖啡師，跟外帶比回本超快。' },
    { id: 'airfryer', name: '大容量氣炸鍋', price: 2490, cat: 'kitchen', icon: 'airfryer',
      channel: 'momo', tags: ['廚具', '宿舍'],
      review: '宿舍神器，炸什麼都香，沒它過不了。' },

    { id: 'mech-kb', name: '無線機械鍵盤', price: 2990, cat: '3c', icon: 'keyboard',
      channel: 'shopee', tags: ['鍵盤', '3C'],
      review: '敲起來像在打鼓，打字會上癮，爽。' },
    { id: 'mon-4k', name: '27吋 4K 螢幕', price: 9900, cat: '3c', icon: 'monitor',
      channel: 'pchome', tags: ['螢幕', '3C'],
      review: '看過 4K 就回不去 1080p，工作爽度滿分。' },
    { id: 'anc-hp', name: 'ANC 降噪耳機', price: 7990, cat: '3c', icon: 'headphones',
      channel: 'amazonjp', hot: true, tags: ['耳機', '3C', '通勤'],
      review: '通勤戴上，整個世界瞬間靜音。' },

    { id: 'mood-lamp', name: '氛圍感立燈', price: 1890, cat: 'life', icon: 'lamp',
      channel: 'shopee', tags: ['燈具', '臥室'],
      review: '房間質感 +100 的便宜小物，先買先享受。' },
  ],
};

// All tags, ranked by frequency (for the tag-explorer direction)
window.DW.tags = (() => {
  const count = {};
  window.DW.products.forEach(p => p.tags.forEach(t => { count[t] = (count[t] || 0) + 1; }));
  return Object.entries(count).sort((a, b) => b[1] - a[1]).map(([t, n]) => ({ tag: t, n }));
})();
