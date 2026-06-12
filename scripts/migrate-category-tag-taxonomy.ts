import { mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, extname, join, parse } from 'node:path'

type LegacyProductContent = {
  id: string
  status: 'draft' | 'published' | 'unpublished' | 'archived'
  name: string
  price_text: string
  price: {
    amount: number | null
    currency: 'TWD' | 'JPY' | 'USD' | null
    unit: 'each' | 'kilogram' | null
    label: string | null
  }
  summary: string
  description: string
  purchase_url: string
  image_url: string
  channel_id: string
  category_id: string
  tag_ids: string[]
  reference_url: string | null
  created_at: string
  updated_at: string
  published_at: string | null
  unpublished_at: string | null
  archived_at: string | null
  offers?: ProductOffer[]
}

type ProductOffer = {
  channel_id: string
  url: string
  price_text: string
  price: LegacyProductContent['price']
  checked_at: string
}

type MigratedProductContent = Omit<LegacyProductContent, 'price_text' | 'price' | 'description' | 'purchase_url' | 'channel_id' | 'offers'> & {
  english_name: string
  long_description: string
  llm_description: string
  search_aliases: string[]
  model_numbers: string[]
  offers: ProductOffer[]
}

type GuideContent = {
  id: string
  category_ids: string[]
  tag_ids: string[]
  related_product_ids?: string[]
  [key: string]: unknown
}

type LinkContent = {
  id: string
  category_ids: string[]
  tag_ids: string[]
  [key: string]: unknown
}

type TaxonomyDefinition = {
  id: string
  label: string
  description?: string
  aliases?: string[]
  short_label?: string
  nav_visible: boolean
  sort_order: number
}

type ProductMigrationMapping = {
  english_name: string
  category_id: string
  tag_ids: string[]
  brand_id: string | null
}

type RenamedId = {
  from: string
  to: string
}

type MigrationSummary = {
  migrated: number
  skipped: number
  unmapped: string[]
  by_category: Record<string, number>
  by_brand: Record<string, number>
  renamed_ids: RenamedId[]
}

type MigrationOptions = {
  products_dir?: string
  guides_dir?: string
  links_dir?: string
  taxonomies_dir?: string
  dry_run?: boolean
}

const DEFAULT_PRODUCTS_DIR = 'content/products'
const DEFAULT_GUIDES_DIR = 'content/guides'
const DEFAULT_LINKS_DIR = 'content/links'
const DEFAULT_TAXONOMIES_DIR = 'content/taxonomies'
const IMAGE_SOURCE_DIR = 'content/products/images'

const CATEGORIES: TaxonomyDefinition[] = [
  { id: 'computer-3c', label: '電腦3C', short_label: '電腦3C', nav_visible: true, sort_order: 10 },
  { id: 'network', label: '網路通訊', short_label: '網路通訊', nav_visible: true, sort_order: 20 },
  { id: 'av-theater', label: '影音劇院', short_label: '影音劇院', nav_visible: true, sort_order: 30 },
  { id: 'small-appliance', label: '小家電', short_label: '小家電', nav_visible: true, sort_order: 40 },
  { id: 'major-appliance', label: '大家電', short_label: '大家電', nav_visible: true, sort_order: 50 },
  { id: 'household', label: '生活百貨', short_label: '生活百貨', nav_visible: true, sort_order: 60 },
  { id: 'other', label: '其他', short_label: '其他', nav_visible: true, sort_order: 999 },
]

const TAGS: TaxonomyDefinition[] = [
  { id: 'display', label: '顯示器', description: '螢幕、電視與影像顯示相關商品。', aliases: ['電視', '螢幕', '顯示器'], nav_visible: true, sort_order: 10 },
  { id: 'power-charging', label: '電源充電', description: '充電器、行動電源、電池與備援電力。', aliases: ['充電', '行動電源', '充電器', '電池', 'UPS'], nav_visible: true, sort_order: 20 },
  { id: 'cable-adapter', label: '線材轉接', description: '線材、轉接器與影音傳輸線。', aliases: ['線材', '轉接', 'HDMI'], nav_visible: true, sort_order: 30 },
  { id: 'storage-backup', label: '儲存備份', description: 'NAS、隨身碟與備份儲存設備。', aliases: ['儲存', 'NAS', '隨身碟'], nav_visible: true, sort_order: 40 },
  { id: 'desk-setup', label: '桌面周邊', description: '鍵盤、滑鼠、桌機與桌面工作周邊。', aliases: ['鍵盤', '滑鼠', '周邊'], nav_visible: true, sort_order: 50 },
  { id: 'network-gear', label: '網路設備', description: '路由器、交換器與家庭網路設備。', aliases: ['路由器', '交換器', '網通'], nav_visible: true, sort_order: 60 },
  { id: 'phone', label: '手機', description: '手機與行動裝置。', aliases: ['手機'], nav_visible: true, sort_order: 70 },
  { id: 'tablet', label: '平板', description: '平板與平板相關裝置。', aliases: ['平板'], nav_visible: true, sort_order: 80 },
  { id: 'comm-accessory', label: '通訊配件', description: '通訊與行動裝置配件。', aliases: ['配件'], nav_visible: true, sort_order: 90 },
  { id: 'av-source', label: '訊源', description: '串流盒與影音播放器。', aliases: ['串流', '播放器'], nav_visible: true, sort_order: 100 },
  { id: 'amplifier', label: '擴大機', description: '擴大機與影音放大設備。', aliases: ['擴大機'], nav_visible: true, sort_order: 110 },
  { id: 'speaker', label: '喇叭', description: '喇叭、Soundbar 與音響設備。', aliases: ['喇叭', '音響', 'Soundbar'], nav_visible: true, sort_order: 120 },
  { id: 'headphone', label: '耳機', description: '耳機與個人聆聽設備。', aliases: ['耳機'], nav_visible: true, sort_order: 130 },
  { id: 'kitchen', label: '廚房', description: '廚房用品、廚電與料理相關商品。', aliases: ['廚房', '廚電'], nav_visible: true, sort_order: 140 },
  { id: 'cleaning', label: '清潔', description: '清潔家電、洗劑與掃除用品。', aliases: ['清潔', '掃除'], nav_visible: true, sort_order: 150 },
  { id: 'air-care', label: '空氣調節', description: '空氣清淨、除濕、暖房與空氣相關小家電。', aliases: ['空氣清淨', '除濕', '電暖'], nav_visible: true, sort_order: 160 },
  { id: 'bathroom', label: '衛浴', description: '衛浴設備、浴室家電與浴室用品。', aliases: ['衛浴', '浴室'], nav_visible: true, sort_order: 170 },
  { id: 'countertop', label: '桌上型', description: '桌上型與可移動式設備。', aliases: ['桌上型'], nav_visible: true, sort_order: 180 },
  { id: 'lighting', label: '照明', description: '燈具、吸頂燈與居家照明。', aliases: ['燈', '吸頂燈', '照明'], nav_visible: true, sort_order: 190 },
  { id: 'refrigeration', label: '冷藏冷凍', description: '冰箱與冷凍櫃。', aliases: ['冰箱', '冷凍櫃'], nav_visible: true, sort_order: 200 },
  { id: 'laundry', label: '洗衣烘衣', description: '洗衣機、乾衣機與洗烘衣設備。', aliases: ['洗衣機', '烘衣機'], nav_visible: true, sort_order: 210 },
  { id: 'aircon', label: '空調', description: '冷氣與空調設備。', aliases: ['冷氣', '空調'], nav_visible: true, sort_order: 220 },
  { id: 'fixed-install', label: '固定安裝', description: '需固定安裝或施工的設備。', aliases: ['安裝'], nav_visible: true, sort_order: 230 },
  { id: 'food', label: '食材', description: '食材、食品與調味品。', aliases: ['食材', '食品'], nav_visible: true, sort_order: 240 },
  { id: 'daily-goods', label: '日用品', description: '日用品、補充包與消耗品。', aliases: ['日用品', '消耗品'], nav_visible: true, sort_order: 250 },
  { id: 'organizing', label: '收納整理', description: '收納箱與整理用品。', aliases: ['收納', '整理箱'], nav_visible: true, sort_order: 260 },
  { id: 'hardware-tools', label: '五金工具', description: '五金、工具與維修用品。', aliases: ['五金', '工具'], nav_visible: true, sort_order: 270 },
  { id: 'furniture-decor', label: '家具家飾', description: '家具、家飾與居家擺設。', aliases: ['家具', '家飾'], nav_visible: true, sort_order: 280 },
  { id: 'ergonomic', label: '人體工學', description: '人體工學、坐姿、工作站與長時間使用舒適度相關屬性。', aliases: ['人體工學', '電腦椅'], nav_visible: true, sort_order: 290 },
  { id: 'rice', label: '米食', description: '白米、糙米、米飯料理與米類研究相關屬性。', aliases: ['米'], nav_visible: true, sort_order: 300 },
]

const BRANDS: TaxonomyDefinition[] = [
  brand('adata', 'ADATA', ['威剛'], 10),
  brand('aibo', 'aibo', [], 20),
  brand('aplus', 'APlus', [], 30),
  brand('apple', 'Apple', ['蘋果', 'HomePod'], 40),
  brand('arnest', 'Arnest', ['アーネスト'], 50),
  brand('avier', 'Avier', [], 60),
  brand('belkin', 'Belkin', [], 70),
  brand('benq', 'BenQ', ['明基'], 80),
  brand('blueair', 'Blueair', [], 90),
  brand('bose', 'Bose', [], 100),
  brand('brita', 'BRITA', ['Brita'], 110),
  brand('ducky', 'Ducky', ['創傑'], 120),
  brand('elac', 'ELAC', [], 130),
  brand('electrolux', 'Electrolux', ['伊萊克斯'], 140),
  brand('fibbr', 'FIBBR', [], 150),
  brand('fisher-paykel', 'Fisher & Paykel', ['Fisher&Paykel'], 160),
  brand('fuli', '富里', ['富里鄉農會'], 170),
  brand('hitachi', 'Hitachi', ['日立'], 180),
  brand('ikea', 'IKEA', ['宜家'], 190),
  brand('irobot', 'iRobot', ['Roomba'], 200),
  brand('iris-ohyama', 'IRIS OHYAMA', ['Iris', 'アイリスオーヤマ'], 210),
  brand('j5create', 'j5create', ['凱捷'], 220),
  brand('kao', 'Kao', ['花王'], 230),
  brand('kioxia', 'Kioxia', ['鎧俠'], 240),
  brand('kohler', 'Kohler', ['科勒'], 250),
  brand('kolin', 'Kolin', ['歌林'], 260),
  brand('lg', 'LG', [], 270),
  brand('lion', 'Lion', ['獅王'], 280),
  brand('lixil', 'LIXIL', ['Lixil'], 290),
  brand('mitsubishi-electric', 'Mitsubishi Electric', ['三菱電機', 'Mitsubishi'], 300),
  brand('mitsubishi-heavy-industries', 'Mitsubishi Heavy Industries', ['三菱重工'], 310),
  brand('msi', 'MSI', ['微星'], 320),
  brand('ohashi', '大橋牌', ['Ohashi'], 330),
  brand('panasonic', 'Panasonic', ['國際牌'], 340),
  brand('philips', 'Philips', ['飛利浦'], 350),
  brand('samsung', 'Samsung', ['三星'], 360),
  brand('sennheiser', 'Sennheiser', ['森海塞爾'], 370),
  brand('sharp', 'Sharp', ['夏普'], 380),
  brand('synology', 'Synology', ['群暉'], 390),
  brand('toshiba', 'Toshiba', ['東芝'], 400),
  brand('toto', 'TOTO', [], 410),
  brand('trusco', 'TRUSCO', ['Trusco'], 420),
  brand('ubiquiti', 'Ubiquiti', ['UniFi', 'Unifi'], 430),
  brand('vibo', 'Vibo', ['威寶'], 440),
  brand('yamada-seiyu', '山田製油', ['Yamada Seiyu'], 450),
  brand('asahi-ponzu', '旭ポンズ', ['Asahi Ponzu'], 460),
  brand('zojirushi', 'Zojirushi', ['象印'], 470),
  brand('zyxel', 'Zyxel', ['合勤'], 480),
]

const PRODUCT_MAPPINGS: Record<string, ProductMigrationMapping> = {
  '2026-06-02-adata-行動電源': product('ADATA Power Bank', 'computer-3c', ['power-charging'], 'adata'),
  '2026-06-02-aibo-qi行動電源': product('aibo Qi Power Bank', 'computer-3c', ['power-charging'], 'aibo'),
  '2026-06-02-aplus-ups': product('APlus UPS', 'computer-3c', ['power-charging'], 'aplus'),
  '2026-06-02-apple-tv-4k': product('Apple TV 4K', 'av-theater', ['av-source'], 'apple'),
  '2026-06-02-arnest-永切れ王': product('Arnest Nagikire Ou', 'household', ['kitchen'], 'arnest'),
  '2026-06-02-avier行動電源': product('Avier Power Bank', 'computer-3c', ['power-charging'], 'avier'),
  '2026-06-02-belkin-三孔type-c充電器': product('Belkin Three Port Type C Charger', 'computer-3c', ['power-charging'], 'belkin'),
  '2026-06-02-benq-e43-735': product('BenQ E43 735', 'av-theater', ['display'], 'benq'),
  '2026-06-02-benq-e55-735': product('BenQ E55 735', 'av-theater', ['display'], 'benq'),
  '2026-06-02-benq-rd280u': product('BenQ RD280U', 'computer-3c', ['display'], 'benq'),
  '2026-06-02-blueair-3250空氣清淨機': product('Blueair 3250 Air Purifier', 'small-appliance', ['air-care'], 'blueair'),
  '2026-06-02-bose-qc45': product('Bose QC45', 'av-theater', ['headphone'], 'bose'),
  '2026-06-02-brita': product('BRITA Water Filter Pitcher', 'household', ['kitchen'], 'brita'),
  '2026-06-02-ducky-one-2': product('Ducky One 2', 'computer-3c', ['desk-setup'], 'ducky'),
  '2026-06-02-elac-connex-dcb41': product('ELAC ConneX DCB41', 'av-theater', ['speaker', 'cable-adapter'], 'elac'),
  '2026-06-02-electrolux吸塵器': product('Electrolux Vacuum Cleaner', 'small-appliance', ['cleaning'], 'electrolux'),
  '2026-06-02-fibbr光纖hdmi線': product('FIBBR Fiber HDMI Cable', 'av-theater', ['cable-adapter'], 'fibbr'),
  '2026-06-02-fisher-paykel-抽屜式洗碗機': product('Fisher Paykel DishDrawer', 'major-appliance', ['kitchen'], 'fisher-paykel'),
  '2026-06-02-hitachi-rd-14fr': product('Hitachi RD 14FR', 'small-appliance', ['air-care'], 'hitachi'),
  '2026-06-02-homepod-大': product('Apple HomePod Large', 'av-theater', ['speaker'], 'apple'),
  '2026-06-02-ikea充電線': product('IKEA Charging Cable', 'computer-3c', ['cable-adapter'], 'ikea'),
  '2026-06-02-ikea充電電池': product('IKEA Rechargeable Battery', 'computer-3c', ['power-charging'], 'ikea'),
  '2026-06-02-iris吸頂燈-並': product('IRIS OHYAMA Ceiling Light Standard', 'small-appliance', ['lighting'], 'iris-ohyama'),
  '2026-06-02-iris高階吸頂燈': product('IRIS OHYAMA Premium Ceiling Light', 'small-appliance', ['lighting'], 'iris-ohyama'),
  '2026-06-02-j5create豆腐頭': product('j5create USB C Charger', 'computer-3c', ['power-charging'], 'j5create'),
  '2026-06-02-kioxia-1tb隨身碟': product('Kioxia 1TB USB Flash Drive', 'computer-3c', ['storage-backup'], 'kioxia'),
  '2026-06-02-kohler-familycare浴櫃': product('Kohler FamilyCare Bathroom Vanity', 'household', ['bathroom', 'fixed-install'], 'kohler'),
  '2026-06-02-kohler暖風機': product('Kohler Bathroom Heater', 'small-appliance', ['bathroom', 'air-care', 'fixed-install'], 'kohler'),
  '2026-06-02-kolin-電暖器': product('Kolin Ceramic Heater', 'small-appliance', ['air-care'], 'kolin'),
  '2026-06-02-lg-c4-65吋-oled': product('LG C4 65 Inch OLED', 'av-theater', ['display'], 'lg'),
  '2026-06-02-lion-nanox洗衣精': product('Lion Nanox Detergent', 'household', ['daily-goods', 'cleaning'], 'lion'),
  '2026-06-02-lixil免治馬桶座': product('LIXIL Bidet Seat', 'small-appliance', ['bathroom'], 'lixil'),
  '2026-06-02-mitsubishi-冷凍櫃': product('Mitsubishi Electric Freezer', 'major-appliance', ['refrigeration', 'kitchen'], 'mitsubishi-electric'),
  '2026-06-02-msi桌上型': product('MSI Desktop PC', 'computer-3c', ['desk-setup'], 'msi'),
  '2026-06-02-panasonic-nn-bs607': product('Panasonic NN BS607', 'small-appliance', ['kitchen', 'countertop'], 'panasonic'),
  '2026-06-02-panasonic-np-th4': product('Panasonic NP TH4', 'small-appliance', ['kitchen', 'countertop'], 'panasonic'),
  '2026-06-02-panasonic-sr-kt069': product('Panasonic SR KT069', 'small-appliance', ['kitchen', 'countertop'], 'panasonic'),
  '2026-06-02-panasonic-v150mdh': product('Panasonic V150MDH', 'major-appliance', ['laundry'], 'panasonic'),
  '2026-06-02-panasonic-冷凍櫃': product('Panasonic Freezer', 'major-appliance', ['refrigeration', 'kitchen'], 'panasonic'),
  '2026-06-02-panasonic-日規冰箱': product('Panasonic Japan Refrigerator', 'major-appliance', ['refrigeration', 'kitchen'], 'panasonic'),
  '2026-06-02-philips-40b1u5600': product('Philips 40B1U5600', 'computer-3c', ['display'], 'philips'),
  '2026-06-02-roomba-j7': product('iRobot Roomba j7', 'small-appliance', ['cleaning'], 'irobot'),
  '2026-06-02-samsung-m7-32吋': product('Samsung M7 32 Inch', 'computer-3c', ['display'], 'samsung'),
  '2026-06-02-sennheiser-ambeo-max': product('Sennheiser Ambeo Max', 'av-theater', ['speaker'], 'sennheiser'),
  '2026-06-02-sharp-65吋-xled': product('Sharp 65 Inch XLED', 'av-theater', ['display'], 'sharp'),
  '2026-06-02-sharp-xp10t': product('Sharp XP10T', 'small-appliance', ['kitchen', 'countertop'], 'sharp'),
  '2026-06-02-synology-ds723': product('Synology DS723 Plus', 'computer-3c', ['storage-backup'], 'synology'),
  '2026-06-02-toshiba-yd5000': product('Toshiba YD5000', 'major-appliance', ['kitchen'], 'toshiba'),
  '2026-06-02-toshiba高階吸頂燈': product('Toshiba Premium Ceiling Light', 'small-appliance', ['lighting'], 'toshiba'),
  '2026-06-02-toto恆溫水龍頭': product('TOTO Thermostatic Faucet', 'household', ['bathroom', 'fixed-install'], 'toto'),
  '2026-06-02-trusco-物流箱': product('TRUSCO Trunk Cargo', 'household', ['organizing'], 'trusco'),
  '2026-06-02-unifi-express': product('UniFi Express', 'network', ['network-gear'], 'ubiquiti'),
  '2026-06-02-zyxel-xgs1250-12': product('Zyxel XGS1250 12', 'network', ['network-gear'], 'zyxel'),
  '2026-06-02-三菱重工冷氣': product('Mitsubishi Heavy Industries Air Conditioner', 'major-appliance', ['aircon', 'fixed-install'], 'mitsubishi-heavy-industries'),
  '2026-06-02-大橋牌越光米': product('Ohashi Koshihikari Rice', 'household', ['food', 'rice'], 'ohashi'),
  '2026-06-02-威寶40l烤箱': product('Vibo 40L Oven', 'small-appliance', ['kitchen', 'countertop'], 'vibo'),
  '2026-06-02-富里牛奶皇后': product('Fuli Milk Queen Rice', 'household', ['food', 'rice'], 'fuli'),
  '2026-06-02-山田製油-胡麻辣油': product('Yamada Seiyu Sesame Chili Oil', 'household', ['food', 'kitchen'], 'yamada-seiyu'),
  '2026-06-02-旭ポンズ': product('Asahi Ponzu', 'household', ['food', 'kitchen'], 'asahi-ponzu'),
  '2026-06-02-花王-attack-zero': product('Kao Attack Zero', 'household', ['daily-goods', 'cleaning'], 'kao'),
  '2026-06-02-象印nw-jw10': product('Zojirushi NW JW10', 'small-appliance', ['kitchen', 'countertop'], 'zojirushi'),
  '2026-06-02-電池充電器': product('Battery Charger', 'computer-3c', ['power-charging'], null),
}

const GUIDE_LINK_CATEGORY_MAPPINGS: Record<string, string> = {
  computer: 'computer-3c',
  food: 'household',
  home: 'household',
  kitchen: 'household',
  av: 'av-theater',
  'three-c': 'computer-3c',
  other: 'other',
}

export async function migrateCategoryTagTaxonomy(options: MigrationOptions = {}): Promise<MigrationSummary> {
  const products_dir = options.products_dir ?? DEFAULT_PRODUCTS_DIR
  const guides_dir = options.guides_dir ?? DEFAULT_GUIDES_DIR
  const links_dir = options.links_dir ?? DEFAULT_LINKS_DIR
  const taxonomies_dir = options.taxonomies_dir ?? DEFAULT_TAXONOMIES_DIR
  const summary = createSummary()
  const product_file_names = await getJsonFileNames(products_dir)
  const product_renames = new Map<string, string>()
  const planned_products: Array<{
    source_path: string
    target_path: string
    old_id: string
    new_id: string
    old_image_path: string | null
    new_image_path: string | null
    content: MigratedProductContent
  }> = []

  for (const file_name of product_file_names) {
    const source_path = join(products_dir, file_name)
    const product_content = JSON.parse(await readFile(source_path, 'utf8')) as LegacyProductContent
    const content_id = product_content.id || parse(file_name).name

    if (Array.isArray(product_content.offers)) {
      summary.skipped += 1
      continue
    }

    const mapping = PRODUCT_MAPPINGS[content_id]

    if (mapping === undefined) {
      summary.unmapped.push(content_id)
      continue
    }

    const new_id = `${product_content.created_at.slice(0, 10)}-${slugifyEnglishName(mapping.english_name)}`
    const image_extension = extname(product_content.image_url)
    const new_image_url = image_extension === '' ? product_content.image_url : `/images/products/${new_id}${image_extension}`
    const old_image_path = image_extension === '' ? null : join(IMAGE_SOURCE_DIR, `${content_id}${image_extension}`)
    const new_image_path = image_extension === '' ? null : join(IMAGE_SOURCE_DIR, `${new_id}${image_extension}`)
    const target_path = join(products_dir, `${new_id}.json`)
    const migrated_product = mapProduct(product_content, new_id, mapping, new_image_url)

    planned_products.push({
      source_path,
      target_path,
      old_id: content_id,
      new_id,
      old_image_path,
      new_image_path,
      content: migrated_product,
    })
    product_renames.set(content_id, new_id)
    summary.migrated += 1
    increment(summary.by_category, mapping.category_id)
    increment(summary.by_brand, mapping.brand_id ?? 'other')

    if (content_id !== new_id) {
      summary.renamed_ids.push({ from: content_id, to: new_id })
    }
  }

  summary.unmapped.sort((left_id, right_id) => left_id.localeCompare(right_id))
  summary.renamed_ids.sort((left_id, right_id) => left_id.from.localeCompare(right_id.from))

  if (summary.unmapped.length > 0) {
    throw new Error(`Unmapped product ids: ${summary.unmapped.join(', ')}`)
  }

  if (options.dry_run === true) {
    return summary
  }

  await mkdir(taxonomies_dir, { recursive: true })
  await writeJson(join(taxonomies_dir, 'categories.json'), { items: CATEGORIES })
  await writeJson(join(taxonomies_dir, 'tags.json'), { items: TAGS })
  await writeJson(join(taxonomies_dir, 'brands.json'), { items: BRANDS })

  for (const planned_product of planned_products) {
    await writeJson(planned_product.target_path, planned_product.content)

    if (planned_product.source_path !== planned_product.target_path) {
      await unlink(planned_product.source_path)
    }

    if (planned_product.old_image_path !== null && planned_product.new_image_path !== null && planned_product.old_image_path !== planned_product.new_image_path) {
      await renameIfExists(planned_product.old_image_path, planned_product.new_image_path)
    }
  }

  await migrateGuides(guides_dir, product_renames)
  await migrateLinks(links_dir)

  return summary
}

function brand(id: string, label: string, aliases: string[], sort_order: number): TaxonomyDefinition {
  return {
    id,
    label,
    description: `${label} 品牌商品`,
    aliases,
    nav_visible: true,
    sort_order,
  }
}

function product(english_name: string, category_id: string, tag_ids: string[], brand_id: string | null): ProductMigrationMapping {
  return {
    english_name,
    category_id,
    tag_ids,
    brand_id,
  }
}

function createSummary(): MigrationSummary {
  return {
    migrated: 0,
    skipped: 0,
    unmapped: [],
    by_category: {},
    by_brand: {},
    renamed_ids: [],
  }
}

function mapProduct(product_content: LegacyProductContent, new_id: string, mapping: ProductMigrationMapping, image_url: string): MigratedProductContent {
  const tag_ids = new Set([...mapping.tag_ids, ...(mapping.brand_id === null ? [] : [mapping.brand_id])])

  return {
    id: new_id,
    status: product_content.status,
    name: product_content.name,
    english_name: mapping.english_name,
    summary: product_content.summary,
    long_description: product_content.description,
    llm_description: '',
    search_aliases: [],
    model_numbers: [],
    offers: [
      {
        channel_id: product_content.channel_id,
        url: product_content.purchase_url,
        price_text: product_content.price_text,
        price: product_content.price,
        checked_at: product_content.updated_at,
      },
    ],
    image_url,
    category_id: mapping.category_id,
    tag_ids: [...tag_ids].sort((left_tag_id, right_tag_id) => left_tag_id.localeCompare(right_tag_id)),
    reference_url: product_content.reference_url,
    created_at: product_content.created_at,
    updated_at: product_content.updated_at,
    published_at: product_content.published_at,
    unpublished_at: product_content.unpublished_at,
    archived_at: product_content.archived_at,
  }
}

async function migrateGuides(guides_dir: string, product_renames: ReadonlyMap<string, string>) {
  for (const file_name of await getJsonFileNames(guides_dir)) {
    const file_path = join(guides_dir, file_name)
    const guide = JSON.parse(await readFile(file_path, 'utf8')) as GuideContent

    await writeJson(file_path, {
      ...guide,
      category_ids: guide.category_ids.map(mapGuideLinkCategoryId),
      related_product_ids: (guide.related_product_ids ?? []).map((product_id) => product_renames.get(product_id) ?? product_id),
    })
  }
}

async function migrateLinks(links_dir: string) {
  for (const file_name of await getJsonFileNames(links_dir)) {
    const file_path = join(links_dir, file_name)
    const link = JSON.parse(await readFile(file_path, 'utf8')) as LinkContent

    await writeJson(file_path, {
      ...link,
      category_ids: link.category_ids.map(mapGuideLinkCategoryId),
    })
  }
}

function mapGuideLinkCategoryId(category_id: string) {
  return GUIDE_LINK_CATEGORY_MAPPINGS[category_id] ?? category_id
}

async function renameIfExists(old_path: string, new_path: string) {
  try {
    await mkdir(dirname(new_path), { recursive: true })
    await rename(old_path, new_path)
  }
  catch (error) {
    if (isMissingFileError(error)) {
      return
    }

    throw error
  }
}

async function getJsonFileNames(content_dir: string) {
  const entries = await readdir(content_dir, { withFileTypes: true })

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .toSorted((left_name, right_name) => left_name.localeCompare(right_name))
}

async function writeJson(path: string, content: unknown) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(content, null, 2)}\n`)
}

function slugifyEnglishName(english_name: string) {
  const slug = english_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  if (slug === '') {
    throw new Error(`English name cannot be slugified: ${english_name}`)
  }

  return slug
}

function increment(counts: Record<string, number>, key: string) {
  counts[key] = (counts[key] ?? 0) + 1
}

function isMissingFileError(error: unknown) {
  return error instanceof Error && (error as { code?: unknown }).code === 'ENOENT'
}

async function runCli() {
  const args = process.argv.slice(2)
  const products_dir = getOptionValue(args, '--products-dir') ?? DEFAULT_PRODUCTS_DIR
  const guides_dir = getOptionValue(args, '--guides-dir') ?? DEFAULT_GUIDES_DIR
  const links_dir = getOptionValue(args, '--links-dir') ?? DEFAULT_LINKS_DIR
  const taxonomies_dir = getOptionValue(args, '--taxonomies-dir') ?? DEFAULT_TAXONOMIES_DIR
  const summary = await migrateCategoryTagTaxonomy({
    products_dir,
    guides_dir,
    links_dir,
    taxonomies_dir,
    dry_run: args.includes('--dry-run'),
  })

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
}

function getOptionValue(args: string[], option: string) {
  const option_index = args.indexOf(option)

  if (option_index === -1) {
    return undefined
  }

  return args[option_index + 1]
}

if (process.argv[1]?.endsWith('migrate-category-tag-taxonomy.ts')) {
  runCli().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
