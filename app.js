/* Trash zoo
   ------------------------------------------------------------------
   評価も、名前も、自由記述もない。ここにあるのは他人の生活の証拠だけ。 */

const CONFIG = {
  // 判定を行うサーバー側エンドポイント（api/judge.js）。
  // API キーはサーバーにだけ置く。届かなければ暫定の飼育員が答える。
  judgeEndpoint: (() => {
    try { return localStorage.getItem('trashzoo.judge') || '/api/judge'; }
    catch(e){ return '/api/judge'; }
  })(),
  lifespanHours: 72,     // 工場に運ばれるまで
  ticketHours: 24,       // 入場券の有効時間
  peekLimit: 5,          // 初回だけ、支払う前に見られる数
  penMax: 9              // 1つの放飼場に入れる上限（タップしやすさから決めた）
};

const NS = 'http://www.w3.org/2000/svg';
const HOUR = 3600e3;

/* ------------------------------------------------------------------ *
 * 小道具
 * ------------------------------------------------------------------ */
function rng(seed){
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const rand = rng(20260903);
const pick = (a, r=rand) => a[Math.floor(r()*a.length)];
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));

function el(tag, attrs = {}, parent){
  const n = document.createElementNS(NS, tag);
  for(const k in attrs) n.setAttribute(k, attrs[k]);
  if(parent) parent.appendChild(n);
  return n;
}

/* 手描きのゆらぎ。数式のままの曲線は正確すぎて機械に見える。 */
function smooth(points, closed = true){
  const p = points, n = p.length;
  let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
  const at = i => p[(i + n) % n];
  const last = closed ? n : n - 1;
  for(let i = 0; i < last; i++){
    const p0 = closed ? at(i-1) : p[Math.max(0,i-1)];
    const p1 = at(i), p2 = at(i+1);
    const p3 = closed ? at(i+2) : p[Math.min(n-1, i+2)];
    const c1 = [p1[0] + (p2[0]-p0[0])/6, p1[1] + (p2[1]-p0[1])/6];
    const c2 = [p2[0] - (p3[0]-p1[0])/6, p2[1] - (p3[1]-p1[1])/6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + (closed ? 'Z' : '');
}

function wobblyBlob(cx, cy, rx, ry, amp, steps, r){
  const pts = [];
  for(let i = 0; i < steps; i++){
    const t = i / steps * Math.PI * 2;
    const k = 1 + (r() - .5) * amp;
    pts.push([cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k]);
  }
  return pts;
}
const wobblyCircle = (cx, cy, rr, amp, steps, r) => wobblyBlob(cx, cy, rr, rr, amp, steps, r);

function jitterLine(points, amp, r){
  return points.map(([x,y]) => [x + (r()-.5)*amp, y + (r()-.5)*amp]);
}

/* ------------------------------------------------------------------ *
 * 島の地形
 * ------------------------------------------------------------------ */
const ISLAND = { cx: 450, cy: 650, rx: 400, ry: 545 };

const PENS = [
  { key:'eastasia', x:215, y:315, r:92 },
  { key:'seasia',   x:600, y:265, r:84 },
  { key:'westeu',   x:740, y:545, r:82 },
  { key:'northeu',  x:150, y:745, r:72 },
  { key:'namerica', x:665, y:880, r:94 },
  { key:'latam',    x:245, y:975, r:84 },
  { key:'africa',   x:330, y:585, r:66, empty:true }   // 管理棟のすぐ隣。まだ誰もいない。
];

const ROAD = [[440,1190],[470,1080],[365,1005],[300,905],[330,800],[430,745],[560,762],[645,690],[620,578],[520,520],[400,470],[300,412],[280,300],[350,225],[440,196]];
const RIVER = [[830,175],[762,320],[690,430],[625,560],[586,712],[548,880],[524,1015],[560,1150]];
const LODGE = { x: 470, y: 648 };

/* 画面は縦に長い。島も縦に伸ばして、海の余りを減らす。 */
const VB_H = 1460, YS = 1.18;
ISLAND.cy *= YS; ISLAND.ry *= YS;
PENS.forEach(p => p.y *= YS);
for(const line of [ROAD, RIVER]) line.forEach(p => p[1] *= YS);
LODGE.y *= YS;

/* ------------------------------------------------------------------ *
 * 保管（端末単位の匿名。IDも名前も持たない。）
 * ------------------------------------------------------------------ */
const KEY = 'trashzoo.v1';
let store = load();

function load(){
  try{
    const s = JSON.parse(localStorage.getItem(KEY));
    if(s && s.items) return s;
  }catch(e){}
  return { ticketUntil:0, peeked:false, mine:null, items:[], shipped:{}, day:'' };
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(store)); }catch(e){} }

const now = () => Date.now();
const hasTicket = () => store.ticketUntil > now();

function newId(){ return Math.random().toString(36).slice(2, 10); }

/* 初期個体を撒く。島が無人に見えないためだけの最小限。 */
function seedItems(){
  const r = rng(Math.floor(now() / 864e5) * 7919 + 13);
  const items = [];
  for(const key in SEED){
    const list = SEED[key].slice();
    const count = 5 + Math.floor(r() * 4);
    for(let i = 0; i < count && list.length; i++){
      const [name, category, weight, flag, note] = list.splice(Math.floor(r()*list.length), 1)[0];
      items.push({
        id:newId(), region:key, name, category, weight, flag, note,
        createdAt: now() - Math.floor(r() * CONFIG.lifespanHours * .95) * HOUR - Math.floor(r()*HOUR),
        mine:false
      });
    }
  }
  return items;
}

/* 工場。72時間で運ばれ、二度と戻らない。 */
function runFactory(){
  const today = new Date().toDateString();
  if(store.day !== today){ store.day = today; store.shipped = {}; }
  const alive = [], dead = [];
  for(const it of store.items){
    (now() - it.createdAt < CONFIG.lifespanHours * HOUR ? alive : dead).push(it);
  }
  for(const it of dead){
    store.shipped[it.region] = (store.shipped[it.region] || 0) + 1;
    if(it.mine) pendingFactoryNotice = true;
  }
  store.items = alive;
  if(store.mine && !alive.some(i => i.id === store.mine)) store.mine = null;
}
let pendingFactoryNotice = false;

function itemsOf(key){ return store.items.filter(i => i.region === key); }
function shippedOf(key){ return store.shipped[key] || 0; }

if(!store.items.length) store.items = seedItems();
runFactory();
/* 密度が落ちたら、その地域に誰かが放されている。 */
for(const key in SEED){
  while(itemsOf(key).length < 4){
    const [name, category, weight, flag, note] = pick(SEED[key]);
    if(itemsOf(key).some(i => i.name === name)) break;
    store.items.push({ id:newId(), region:key, name, category, weight, flag, note,
      createdAt: now() - Math.floor(rand()*40)*HOUR, mine:false });
  }
}
save();

/* ------------------------------------------------------------------ *
 * 生き物（切り抜かれたゴミ）の姿
 * ------------------------------------------------------------------ */
const SKIN = {
  '袋':    ['#E9E2D2','#CFC5AE'],
  '容器':  ['#F2EDE4','#D6CCBB'],
  '缶':    ['#DCE2E6','#B9C3CA'],
  '箱':    ['#E4CFA8','#C7AE81'],
  '瓶':    ['#CDE6DA','#A6C7B7'],
  'その他':['#E7DCC8','#C9BCA2']
};

function critterSVG(item, size){
  const [lit, dark] = SKIN[item.category] || SKIN['その他'];
  const s = size / 100;
  const g = document.createElementNS(NS, 'svg');
  g.setAttribute('viewBox', '0 0 100 100');
  g.setAttribute('width', size); g.setAttribute('height', size);
  g.setAttribute('class', 'body');
  const r = rng(item.id.split('').reduce((a,c) => a + c.charCodeAt(0), 7));

  if(item.photo){                       // 投稿された切り抜き
    const im = el('image', { href:item.photo, x:2, y:2, width:96, height:96,
      preserveAspectRatio:'xMidYMax meet' }, g);
    im.setAttributeNS('http://www.w3.org/1999/xlink','href', item.photo);
    return g;
  }
  const shape = { '袋':bag, '容器':cup, '缶':can, '箱':box, '瓶':bottle }[item.category] || bag;
  shape(g, lit, dark, r);
  return g;

  function bag(g, lit, dark, r){
    const pts = wobblyBlob(50, 58, 34, 30, .34, 11, r);
    el('path', { d:smooth(pts), fill:lit }, g);
    el('path', { d:smooth(pts), fill:dark, opacity:.55,
      transform:'translate(6,5) scale(.92)', 'transform-origin':'50 58' }, g);
    el('path', { d:smooth(pts), fill:lit }, g);
    el('path', { d:'M30,40 q12,-10 26,-4', stroke:'#fff', 'stroke-width':5,
      'stroke-linecap':'round', fill:'none', opacity:.6 }, g);
  }
  function cup(g, lit, dark){
    el('path', { d:'M28,34 L72,34 L64,86 Q50,92 36,86 Z', fill:lit }, g);
    el('path', { d:'M56,34 L72,34 L64,86 Q58,89 54,89 Z', fill:dark, opacity:.6 }, g);
    el('ellipse', { cx:50, cy:34, rx:22, ry:6.5, fill:'#fff', opacity:.9 }, g);
    el('path', { d:'M34,42 L38,78', stroke:'#fff', 'stroke-width':4,
      'stroke-linecap':'round', opacity:.55 }, g);
  }
  function can(g, lit, dark){
    el('rect', { x:32, y:26, width:36, height:60, rx:9, fill:lit }, g);
    el('rect', { x:54, y:26, width:14, height:60, rx:7, fill:dark, opacity:.6 }, g);
    el('rect', { x:36, y:32, width:6, height:48, rx:3, fill:'#fff', opacity:.7 }, g);
    el('ellipse', { cx:50, cy:27, rx:18, ry:5, fill:'#EDF1F4' }, g);
  }
  function box(g, lit, dark){
    el('path', { d:'M26,36 L58,26 L76,36 L74,80 L40,90 L26,78 Z', fill:lit }, g);
    el('path', { d:'M58,44 L76,36 L74,80 L58,86 Z', fill:dark, opacity:.65 }, g);
    el('path', { d:'M26,36 L58,26 L76,36 L58,44 Z', fill:'#fff', opacity:.55 }, g);
  }
  function bottle(g, lit, dark){
    el('path', { d:'M43,20 L57,20 L57,38 Q70,46 70,60 L70,80 Q70,88 62,88 L38,88 Q30,88 30,80 L30,60 Q30,46 43,38 Z', fill:lit }, g);
    el('path', { d:'M57,38 Q70,46 70,60 L70,80 Q70,88 62,88 L54,88 L54,26 Z', fill:dark, opacity:.55 }, g);
    el('rect', { x:36, y:48, width:6, height:32, rx:3, fill:'#fff', opacity:.65 }, g);
    el('rect', { x:42, y:14, width:16, height:8, rx:3, fill:'#B7654A' }, g);
  }
}

/* 現地時刻。国名より雄弁な情報。 */
function localTime(item){
  const off = REGIONS[item.region].utc;
  const d = new Date(now() + off * HOUR);
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}
function remainHours(item){
  return Math.max(0, Math.ceil((item.createdAt + CONFIG.lifespanHours*HOUR - now()) / HOUR));
}

/* ------------------------------------------------------------------ *
 * マップの描画
 * ------------------------------------------------------------------ */
const svg = document.getElementById('map');

function buildMap(){
  svg.innerHTML = '';
  const r = rng(4242);
  const defs = el('defs', {}, svg);

  const blur = el('filter', { id:'soft', x:'-40%', y:'-40%', width:'180%', height:'180%' }, defs);
  el('feGaussianBlur', { stdDeviation:9 }, blur);
  const blur2 = el('filter', { id:'cloudblur', x:'-40%', y:'-40%', width:'180%', height:'180%' }, defs);
  el('feGaussianBlur', { stdDeviation:26 }, blur2);
  const clipG = el('clipPath', { id:'islandclip' }, defs);

  /* 島 —— 砂浜のフチ → 芝 */
  const sandPts  = wobblyBlob(ISLAND.cx, ISLAND.cy, ISLAND.rx, ISLAND.ry, .055, 30, r);
  const sandPath = smooth(sandPts);
  const grassPts = sandPts.map(([x,y]) => [
    ISLAND.cx + (x - ISLAND.cx) * .945 + (r()-.5)*7,
    ISLAND.cy + (y - ISLAND.cy) * .945 + (r()-.5)*7 ]);
  const grassPath = smooth(grassPts);

  el('path', { d:sandPath, fill:'var(--sea-shade)', opacity:.55, filter:'url(#soft)',
    transform:'translate(10,16)' }, svg);          // 島の影
  el('path', { d:sandPath, fill:'var(--sand)' }, svg);
  el('path', { d:sandPath, fill:'none', stroke:'var(--sand-edge)', 'stroke-width':5 }, svg);
  el('path', { d:grassPath, fill:'var(--grass-shade)', transform:'translate(0,7)' }, svg);
  el('path', { d:grassPath, fill:'var(--grass)' }, svg);
  el('path', { d:grassPath, fill:'none', stroke:'var(--grass-light)', 'stroke-width':4,
    opacity:.55, transform:'translate(-3,-4)' }, svg);
  el('path', { d:grassPath }, clipG);

  const island = el('g', { 'clip-path':'url(#islandclip)' }, svg);

  /* 芝の明部（左上が明るい） */
  for(let i = 0; i < 9; i++){
    const cx = 180 + r()*560, cy = 200 + r()*(VB_H-420);
    el('path', { d:smooth(wobblyBlob(cx, cy, 40+r()*70, 26+r()*40, .35, 9, r)),
      fill:'var(--grass-light)', opacity:.35 }, island);
  }

  /* 川。機能はないが、画面を分けて迷子を防ぐ。 */
  const riverPts = jitterLine(RIVER, 10, r);
  const riverD = smooth(riverPts, false);
  el('path', { d:riverD, stroke:'var(--river-bank)', 'stroke-width':44,
    'stroke-linecap':'round', fill:'none' }, island);
  el('path', { d:riverD, stroke:'var(--river)', 'stroke-width':34,
    'stroke-linecap':'round', fill:'none' }, island);
  el('path', { d:riverD, stroke:'#9BD6F4', 'stroke-width':7, 'stroke-linecap':'round',
    fill:'none', opacity:.6, transform:'translate(-7,-3)' }, island);

  /* 園路。1本の曲線。先が見えないから次が気になる。 */
  const roadPts = jitterLine(ROAD, 9, r);
  const roadD = smooth(roadPts, false);
  el('path', { d:roadD, stroke:'var(--road-edge)', 'stroke-width':34,
    'stroke-linecap':'round', fill:'none' }, island);
  el('path', { d:roadD, stroke:'var(--road)', 'stroke-width':26,
    'stroke-linecap':'round', fill:'none' }, island);

  /* 橋 */
  el('rect', { x:566, y:742, width:56, height:34, rx:8, fill:'#C9A46F',
    transform:'rotate(-8 594 759)' }, island);
  el('rect', { x:566, y:736, width:56, height:26, rx:7, fill:'#E4C293',
    transform:'rotate(-8 594 749)' }, island);

  /* 木 → 管理棟 → 放飼場 の順に置く。プレートは重なると読めない。 */
  const trees = el('g', {}, island);
  scatterTrees(trees, r);
  drawLodge(island, r);

  /* 放飼場。プレートだけは島の外にはみ出せるよう、クリップの外に置く。 */
  const pensG = el('g', {}, island);
  const platesG = el('g', {}, svg);
  PENS.forEach((p, i) => pensG.appendChild(drawPen(p, rng(1000 + i * 77), platesG)));

  /* 来園者。名前も姿もない白丸。 */
  visitorsG = el('g', {}, island);
  spawnVisitors();

  /* 雲の影が島を横切る */
  const clouds = el('g', { opacity:.1 }, island);
  for(let i = 0; i < 3; i++){
    const g = el('g', { class:'cloudshadow' }, clouds);
    g.style.animationDuration = (28 + i * 11) + 's';
    g.style.animationDelay = (-i * 13) + 's';
    el('path', { d:smooth(wobblyBlob(0, 320 + i*400, 190, 110, .4, 10, r)),
      fill:'#2B3A2A', filter:'url(#cloudblur)' }, g);
  }
}

/* 画面いっぱいの海。島の周りがどれだけ空いても、波は流れ続ける。 */
function buildSea(){
  let sea = document.getElementById('sea');
  if(!sea){
    sea = document.createElementNS(NS, 'svg');
    sea.id = 'sea';
    document.body.insertBefore(sea, document.body.firstChild);
  }
  const w = window.innerWidth, h = window.innerHeight;
  sea.setAttribute('viewBox', `0 0 ${w} ${h}`);
  sea.innerHTML = '';
  const r = rng(90210);
  el('rect', { x:0, y:0, width:w, height:h, fill:'var(--sea)' }, sea);
  const waves = el('g', { opacity:.5 }, sea);
  const n = Math.round(w * h / 22000);
  for(let i = 0; i < n; i++){
    const y = r() * h, x = -140 + r() * (w + 160);
    const ww = 26 + r() * 40;
    const g = el('g', { class:'waveline' }, waves);
    g.style.animationDuration = (7 + r()*7).toFixed(1) + 's';
    g.style.animationDelay = (-r()*9).toFixed(1) + 's';
    el('path', { d:`M${x},${y} q${ww/2},-6 ${ww},0`, stroke:'var(--wave)', 'stroke-width':4,
      'stroke-linecap':'round', fill:'none' }, g);
    el('path', { d:`M${x+ww+16},${y+9} q${ww/3},-5 ${ww*.66},0`, stroke:'var(--wave)',
      'stroke-width':3.5, 'stroke-linecap':'round', fill:'none', opacity:.7 }, g);
  }
}

/* 放飼場ひとつ */
function drawPen(p, r, platesG){
  const reg = REGIONS[p.key];
  const g = el('g', { class:'tap' });
  g.dataset.pen = p.key;
  const pts = wobblyCircle(p.x, p.y, p.r, .07, 18, r);
  const d = smooth(pts);

  el('path', { d, fill:'rgba(70,64,46,.22)', transform:`translate(9,12)`, filter:'url(#soft)' }, g);
  /* 芝から切り離すためのフチ。放飼場として読ませる。 */
  el('path', { d:smooth(wobblyCircle(p.x, p.y, p.r + 13, .05, 16, r)), fill:'var(--sand-edge)' }, g);
  el('path', { d:smooth(wobblyCircle(p.x, p.y, p.r + 9, .05, 16, r)), fill:'var(--sand)' }, g);
  el('path', { d, fill:reg.shade }, g);
  el('path', { d, fill:reg.ground, transform:'translate(-2,-4)' }, g);
  el('path', { d, fill:'none', stroke:reg.accent, 'stroke-width':5, opacity:.7,
    transform:'translate(-5,-7)' }, g);
  for(let i = 0; i < 5; i++){
    const a = r() * 6.28, rr = r() * p.r * .7;
    el('ellipse', { cx:p.x + Math.cos(a)*rr, cy:p.y + Math.sin(a)*rr,
      rx:6 + r()*9, ry:4 + r()*5, fill:reg.shade, opacity:.5 }, g);
  }

  /* 中身のちらり見せ */
  const list = itemsOf(p.key).slice(0, 3);
  list.forEach((it, i) => {
    const a = -1.9 + i * 1.25, rr = p.r * .42;
    const x = p.x + Math.cos(a)*rr, y = p.y + Math.sin(a)*rr;
    const wrap = el('g', {}, g);
    el('ellipse', { cx:x, cy:y + 15, rx:12, ry:4.5, fill:'rgba(60,54,40,.28)' }, wrap);
    const hop = el('g', { transform:`translate(${x-16},${y-22})` }, wrap);
    const inner = el('g', {}, hop);
    inner.style.animation = `hop-${it.weight} ${(1.5 + r()*1.4).toFixed(2)}s ease-in-out infinite`;
    inner.style.animationDelay = (-r()*2).toFixed(2) + 's';
    inner.style.transformBox = 'fill-box';
    inner.style.transformOrigin = '50% 100%';
    const c = critterSVG(it, 32);
    c.setAttribute('x', 0); c.setAttribute('y', 0);
    inner.appendChild(c);
  });

  /* プレート */
  const plate = el('g', { class:'tap' }, platesG);
  plate.dataset.pen = p.key;
  const label = p.empty ? 'まだ誰もいません' : `${itemsOf(p.key).length}匹`;
  const px = clamp(p.x, 78, 822), py = plateY(p);
  el('rect', { x:px-64, y:py+3, width:128, height:38, rx:10, fill:'rgba(60,54,40,.3)' }, plate);
  el('rect', { x:px-64, y:py-2, width:128, height:38, rx:10, fill:'var(--plate)' }, plate);
  const t1 = el('text', { x:px, y:py+13, fill:'var(--plate-text)', 'font-size':14,
    'text-anchor':'middle', 'font-family':'"Noto Sans JP",sans-serif' }, plate);
  t1.textContent = reg.name;
  const t2 = el('text', { x:px, y:py+28, fill:'var(--plate-text)', 'font-size':11.5,
    'text-anchor':'middle', opacity:.66,
    'font-family':'"JetBrains Mono",monospace' }, plate);
  t2.textContent = label;

  /* 光る演出用 */
  const ring = el('path', { d, fill:'none', stroke:'#FFF3B0', 'stroke-width':10,
    opacity:0, 'pointer-events':'none' }, g);
  ring.dataset.ring = p.key;
  return g;
}

const plateY = p => p.y + p.r + 4;

function drawLodge(parent, r){
  const g = el('g', {}, parent);
  const { x, y } = LODGE;
  el('ellipse', { cx:x+8, cy:y+34, rx:56, ry:16, fill:'rgba(60,54,40,.26)', filter:'url(#soft)' }, g);
  el('rect', { x:x-46, y:y-12, width:92, height:46, rx:8, fill:'#E8D8B6' }, g);
  el('rect', { x:x+10, y:y-12, width:36, height:46, rx:8, fill:'#D2BE96' }, g);
  el('path', { d:`M${x-58},${y-10} L${x},${y-52} L${x+58},${y-10} Z`, fill:'#C4644B' }, g);
  el('path', { d:`M${x},${y-52} L${x+58},${y-10} L${x+30},${y-10} L${x},${y-38} Z`,
    fill:'#A94F3B' }, g);
  el('rect', { x:x-14, y:y+4, width:28, height:30, rx:4, fill:'#8C6B4A' }, g);
  const sign = el('g', { class:'signpost' }, g);
  el('rect', { x:x+58, y:y+6, width:6, height:28, fill:'#9A7A50' }, sign);
  el('rect', { x:x+38, y:y-16, width:48, height:26, rx:6, fill:'var(--sign-shade)' }, sign);
  el('rect', { x:x+38, y:y-20, width:48, height:26, rx:6, fill:'var(--sign)' }, sign);
}

function scatterTrees(parent, r){
  const placed = [];
  let guard = 0;
  while(placed.length < 26 && guard++ < 3000){
    const a = r()*Math.PI*2, k = Math.sqrt(r());
    const x = ISLAND.cx + Math.cos(a) * ISLAND.rx * .87 * k;
    const y = ISLAND.cy + Math.sin(a) * ISLAND.ry * .87 * k;
    if(PENS.some(p => Math.hypot(p.x-x, p.y-y) < p.r + 52)) continue;
    if(PENS.some(p => Math.abs(x - clamp(p.x, 78, 822)) < 84
                   && y > plateY(p) - 22 && y < plateY(p) + 54)) continue;
    if(Math.hypot(LODGE.x-x, LODGE.y-y) < 110) continue;
    if(distToPolyline(x, y, ROAD) < 46) continue;
    if(distToPolyline(x, y, RIVER) < 44) continue;
    if(placed.some(q => Math.hypot(q[0]-x, q[1]-y) < 52)) continue;
    placed.push([x,y]);
    drawTree(parent, x, y, .8 + r()*.5, r);
  }
}

function drawTree(parent, x, y, s, r){
  const g = el('g', {}, parent);
  el('ellipse', { cx:x+6, cy:y+4, rx:20*s, ry:7*s, fill:'rgba(60,54,40,.26)' }, g);
  const sway = el('g', { class:'tree' }, g);
  sway.style.animationDuration = (4.5 + r()*3).toFixed(1) + 's';
  sway.style.animationDelay = (-r()*4).toFixed(1) + 's';
  el('rect', { x:x-3.5*s, y:y-22*s, width:7*s, height:24*s, rx:3*s, fill:'#9A7346' }, sway);
  const pts = wobblyBlob(x, y-38*s, 24*s, 21*s, .3, 9, r);
  el('path', { d:smooth(pts), fill:'#4E8F3C' }, sway);
  el('path', { d:smooth(pts), fill:'#63A94B', transform:`translate(${-3*s},${-4*s})` }, sway);
  el('path', { d:smooth(wobblyBlob(x-8*s, y-46*s, 11*s, 8*s, .3, 8, r)),
    fill:'#7BC05C', opacity:.85 }, sway);
}

function distToPolyline(x, y, pts){
  let best = 1e9;
  for(let i = 0; i < pts.length-1; i++){
    const [x1,y1] = pts[i], [x2,y2] = pts[i+1];
    const dx = x2-x1, dy = y2-y1;
    const t = clamp(((x-x1)*dx + (y-y1)*dy) / (dx*dx+dy*dy || 1), 0, 1);
    best = Math.min(best, Math.hypot(x - (x1+dx*t), y - (y1+dy*t)));
  }
  return best;
}

/* 来園者 */
let visitorsG = null, visitors = [];
function spawnVisitors(){
  visitors = [];
  const n = 7 + Math.floor(rand()*8);
  document.getElementById('hud-visitors').textContent = n;
  for(let i = 0; i < n; i++){
    const t = rand();
    const g = el('g', {}, visitorsG);
    el('ellipse', { cx:1.5, cy:5, rx:6, ry:2.6, fill:'rgba(60,54,40,.3)' }, g);
    el('circle', { cx:0, cy:0, r:6.5, fill:'#FBF7EC' }, g);
    el('circle', { cx:-2, cy:-2, r:3, fill:'#fff', opacity:.9 }, g);
    visitors.push({ g, t, v:(rand() < .5 ? 1 : -1) * (0.00006 + rand()*0.00009),
      wob: rand()*6.28 });
  }
}
function pointOnRoad(t){
  const n = ROAD.length - 1;
  const f = clamp(t, 0, .9999) * n, i = Math.floor(f), k = f - i;
  const [x1,y1] = ROAD[i], [x2,y2] = ROAD[i+1];
  return [x1 + (x2-x1)*k, y1 + (y2-y1)*k];
}
function tickVisitors(ts){
  for(const v of visitors){
    v.t += v.v * 16;
    if(v.t > 1){ v.t = 1; v.v *= -1; }
    if(v.t < 0){ v.t = 0; v.v *= -1; }
    const [x, y] = pointOnRoad(v.t);
    const w = Math.sin(ts/900 + v.wob) * 7;
    v.g.setAttribute('transform', `translate(${(x+w).toFixed(1)},${y.toFixed(1)})`);
  }
  requestAnimationFrame(tickVisitors);
}

/* ------------------------------------------------------------------ *
 * 放飼場の中
 * ------------------------------------------------------------------ */
const $ = id => document.getElementById(id);
let peekMode = false;
let openKey = null;

function openPen(key){
  const reg = REGIONS[key];
  const list = itemsOf(key).slice(0, CONFIG.penMax);
  openKey = key;
  $('enclosure').hidden = false;   // 先に出さないと放飼場の広さが測れない

  $('enclosure-region').textContent = reg.name;
  $('enclosure-sub').textContent = list.length
    ? `${list.length}匹 ・ 本日 ${shippedOf(key)}匹 出荷`
    : 'まだ誰もいません';

  const pen = $('pen');
  pen.innerHTML = '';
  const W = Math.round(pen.clientWidth || window.innerWidth - 24);
  const H = Math.round(pen.clientHeight || window.innerHeight * .6);

  /* 展示場。空、遠景、掘られた地面、手前のガラス柵、見に来ている人。 */
  const { horizon, fenceY, sc, signLeft } = buildExhibit(pen, key, W, H);
  pen.style.background = sc.sky[1];

  const locked = !hasTicket() && !peekMode;
  const shown = peekMode && !hasTicket() ? list.slice(0, CONFIG.peekLimit) : list;
  pen.classList.toggle('hazed', locked);
  $('pen-hazed').hidden = !locked;

  /* ゴミたちは地面の上、柵の手前には出ない。奥ほど小さい。 */
  const bandTop = horizon + H * .155, bandBottom = fenceY - H * .05;
  const base = clamp(Math.min(W / 4.8, H / 3.6), 92, 205);
  const perRow = Math.max(2, Math.round(W / (base * 1.15)));
  const rows = Math.max(1, Math.ceil(Math.max(1, shown.length) / perRow));
  const rowH = (bandBottom - bandTop) / rows;

  shown.forEach((it, i) => {
    const col = i % perRow, row = Math.floor(i / perRow);
    const depth = rows === 1 ? .55 : row / (rows - 1);
    const scale = .74 + depth * .40;
    const size = Math.round(base * scale * (it.weight === 'heavy' ? 1.04 : 1));
    const cw = W / perRow;
    const x = col * cw + cw / 2 - size / 2 + (Math.random() - .5) * cw * .2;
    const y = bandTop + row * rowH + rowH * .5 - size * .55 + (Math.random() - .5) * rowH * .22;

    const d = document.createElement('div');
    d.className = 'critter';
    d.style.cssText = `left:${clamp(x, 4, Math.max(4, Math.min(W-size-4, signLeft-size*.45)))}px;top:${clamp(y, bandTop-size*.3, bandBottom-size*.6)}px;`
      + `width:${size}px;height:${size}px;z-index:${Math.round(y) + 10}`;

    const sh = document.createElement('div');
    sh.className = 'cshadow';
    sh.style.cssText = `width:${size*.6}px;height:${size*.17}px`;
    sh.style.animation = `squash-${it.weight} var(--per) ease-in-out infinite`;
    d.appendChild(sh);

    const body = critterSVG(it, size);
    body.style.animation = `hop-${it.weight} var(--per) ease-in-out infinite`;
    d.appendChild(body);

    /* 個体ごとに周期をずらす。揃うと機械に見える。 */
    const per = ({ light:2.6, medium:1.9, heavy:2.9 })[it.weight] * (.78 + Math.random()*.5);
    d.style.setProperty('--per', per.toFixed(2) + 's');
    body.style.animationDelay = sh.style.animationDelay = (-Math.random()*per).toFixed(2) + 's';
    if(it.weight === 'light'){
      d.style.animation = `drift ${(5 + Math.random()*4).toFixed(1)}s ease-in-out infinite`;
      d.style.animationDelay = (-Math.random()*6).toFixed(1) + 's';
    }
    if(!locked) d.addEventListener('click', () => openDetail(it));
    pen.appendChild(d);
  });
}

/* ------------------------------------------------------------------ *
 * 個体の詳細
 * ------------------------------------------------------------------ */
function openDetail(it){
  const stage = $('detail-stage');
  stage.innerHTML = '';
  const big = clamp(Math.min(window.innerWidth, window.innerHeight) * .3, 150, 330);
  const body = critterSVG(it, big);
  body.style.animation = `hop-${it.weight} 2.4s ease-in-out infinite`;
  stage.appendChild(body);
  $('detail-name').textContent = it.name;
  $('detail-flag').textContent = it.flag || '';
  $('detail-time').textContent = localTime(it) + ' 現地';
  $('detail-note').textContent = it.note;
  $('detail-remain').textContent = `工場まであと ${remainHours(it)} 時間`;
  $('detail').hidden = false;
}

/* ------------------------------------------------------------------ *
 * 入場券
 * ------------------------------------------------------------------ */
function refreshTicketBar(){
  const bar = $('ticket-text'), btn = $('ticket-action');
  if(hasTicket()){
    const h = Math.ceil((store.ticketUntil - now()) / HOUR);
    bar.textContent = `入場券 残り ${h} 時間`;
    btn.hidden = true;
  }else{
    bar.textContent = '今日はまだ入場券がありません';
    btn.hidden = false;
  }
  $('hud-today').textContent = store.items.filter(
    i => new Date(i.createdAt).toDateString() === new Date().toDateString()).length;
}

function openGate(){
  $('post').hidden = false;
  showStep('intro');
  $('post-peek').hidden = store.peeked;
}
function showStep(name){
  ['intro','cut','judge','sent'].forEach(s => $('post-step-' + s).hidden = (s !== name));
}

/* ------------------------------------------------------------------ *
 * 撮影 → 自動切り抜き
 * 加工手段は与えない。「これでいい / 撮り直す」だけ。
 * ------------------------------------------------------------------ */
let cutDataURL = null;

$('post-file').addEventListener('change', e => {
  const f = e.target.files && e.target.files[0];
  e.target.value = '';
  if(!f) return;
  const img = new Image();
  img.onload = () => { cutout(img); showStep('cut'); };
  img.src = URL.createObjectURL(f);
});

function cutout(img){
  const max = 560;
  const sc = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * sc), h = Math.round(img.height * sc);
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently:true });
  ctx.drawImage(img, 0, 0, w, h);
  const im = ctx.getImageData(0, 0, w, h), px = im.data;

  /* 縁の色を基準に、そこから繋がった範囲を消す。
     隣どうしの比較だけで広げると、輪郭のぼけを伝って対象まで食われる。 */
  const seen = new Uint8Array(w*h);
  const at = (x,y) => (y*w + x)*4;
  let br = 0, bg = 0, bb = 0, bn = 0;
  const border = [];
  for(let x = 0; x < w; x++) border.push([x,0],[x,h-1]);
  for(let y = 0; y < h; y++) border.push([0,y],[w-1,y]);
  for(const [x,y] of border){ const p = at(x,y); br += px[p]; bg += px[p+1]; bb += px[p+2]; bn++; }
  br /= bn; bg /= bn; bb /= bn;
  let dev = 0;
  for(const [x,y] of border){ const p = at(x,y);
    dev += Math.abs(px[p]-br) + Math.abs(px[p+1]-bg) + Math.abs(px[p+2]-bb); }
  dev /= bn;
  const TOL = clamp(dev * 2.2 + 70, 90, 240);
  const near = p => Math.abs(px[p]-br) + Math.abs(px[p+1]-bg) + Math.abs(px[p+2]-bb) < TOL;

  const stack = [];
  for(const [x,y] of border){ if(near(at(x,y))) stack.push([x,y]); }
  while(stack.length){
    const [x,y] = stack.pop();
    if(x < 0 || y < 0 || x >= w || y >= h) continue;
    const i = y*w + x;
    if(seen[i] || !near(i*4)) continue;
    seen[i] = 1;
    stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
  }
  for(let i = 0; i < w*h; i++) if(seen[i]) px[i*4+3] = 0;

  /* 縁を1px なじませる */
  const alpha = new Uint8Array(w*h);
  for(let i = 0; i < w*h; i++) alpha[i] = px[i*4+3];
  for(let y = 1; y < h-1; y++) for(let x = 1; x < w-1; x++){
    const i = y*w+x;
    if(!alpha[i]) continue;
    const s = alpha[i-1] + alpha[i+1] + alpha[i-w] + alpha[i+w];
    if(s < 1020) px[i*4+3] = Math.round(s/4 * .6 + 102);
  }
  ctx.putImageData(im, 0, 0);

  /* 余白を切る */
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){
    if(px[(y*w+x)*4+3] > 24){
      if(x < x0) x0 = x; if(x > x1) x1 = x;
      if(y < y0) y0 = y; if(y > y1) y1 = y;
    }
  }
  if(x1 <= x0 || y1 <= y0){ x0 = 0; y0 = 0; x1 = w-1; y1 = h-1; }
  const out = $('cut-canvas');
  const pad = 8;
  out.width = (x1-x0+1) + pad*2; out.height = (y1-y0+1) + pad*2;
  const octx = out.getContext('2d');
  octx.clearRect(0, 0, out.width, out.height);
  octx.drawImage(cv, x0, y0, x1-x0+1, y1-y0+1, pad, pad, x1-x0+1, y1-y0+1);

  /* 保存するのは切り抜き後だけ。元画像は持たない。 */
  const small = document.createElement('canvas');
  const k = Math.min(1, 300 / Math.max(out.width, out.height));
  small.width = Math.round(out.width*k); small.height = Math.round(out.height*k);
  small.getContext('2d').drawImage(out, 0, 0, small.width, small.height);
  cutDataURL = small.toDataURL('image/png');
}

/* ------------------------------------------------------------------ *
 * 判定（Claude API / vision）
 * ------------------------------------------------------------------ */
async function judge(dataURL){
  if(CONFIG.judgeEndpoint){
    try{
      const res = await fetch(CONFIG.judgeEndpoint, {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ image: dataURL })
      });
      if(res.ok) return await res.json();
      /* 判定そのものが「食べ物のゴミではない」と答えた場合は、そのまま返る。
         ここに来るのは、飼育員が不在（未デプロイ・キー未設定）のとき。 */
      console.warn('judge endpoint returned', res.status, '- 暫定の飼育員が答えます');
    }catch(e){
      console.warn('judge endpoint unreachable:', e.message, '- 暫定の飼育員が答えます');
    }
  }
  /* 暫定。api/judge.js が繋がるまでの仮の飼育員。judge-prompt.md 参照。 */
  await new Promise(r => setTimeout(r, 1200));
  return {
    is_food_waste:true, name:'食べ物の包み', category:'その他', weight_class:'light',
    keeper_note:'中身は食べ終えられています。包みの内側に油と甘みの跡が残っています。',
    confidence:0.4
  };
}

$('cut-ok').addEventListener('click', async () => {
  showStep('judge');
  $('judge-title').textContent = '判定しています';
  $('judge-error').hidden = true; $('judge-back').hidden = true; $('judge-dots').hidden = false;
  let v;
  try{ v = await judge(cutDataURL); }
  catch(e){ v = null; }
  if(!v || !v.is_food_waste){
    $('judge-title').textContent = '受け付けられませんでした';
    $('judge-dots').hidden = true;
    $('judge-error').hidden = false;
    $('judge-error').textContent = v ? '食べ物のゴミだけを受け付けています。' : 'もう一度お試しください。';
    $('judge-back').hidden = false;
    return;
  }
  release(v);
});
$('judge-back').addEventListener('click', () => showStep('intro'));
$('cut-retry').addEventListener('click', () => showStep('intro'));

/* 放す */
let glowKey = null;
function release(v){
  const region = regionFromDevice();
  const item = {
    id:newId(), region, name:v.name, category:v.category || 'その他',
    weight:v.weight_class || 'medium', flag:'', note:v.keeper_note,
    photo:cutDataURL, createdAt:now(), mine:true
  };
  store.items.push(item);
  store.mine = item.id;
  store.ticketUntil = now() + CONFIG.ticketHours * HOUR;
  store.peeked = true;
  save();
  glowKey = region;
  $('sent-title').textContent = `あなたの子は${REGIONS[region].name}に送られました`;
  showStep('sent');
}

$('sent-go').addEventListener('click', () => {
  $('post').hidden = true;
  buildMap();
  refreshTicketBar();
  if(glowKey){ guideTo(glowKey); glowKey = null; }
});

/* 案内は一度きり。到着したら消える。 */
function guideTo(key){
  const pen = PENS.find(p => p.key === key);
  const node = svg.querySelector(`[data-ring="${key}"]`);
  if(node){ node.classList.remove('pulse'); void node.getBoundingClientRect(); node.classList.add('pulse'); }
  const stage = $('map-stage');
  const ratio = stage.scrollHeight / VB_H;
  if(pen) stage.scrollTo({ top: clamp(pen.y * ratio - stage.clientHeight/2, 0, stage.scrollHeight), behavior:'smooth' });
}

/* ------------------------------------------------------------------ *
 * 起動
 * ------------------------------------------------------------------ */
svg.addEventListener('click', e => {
  const g = e.target.closest('[data-pen]');
  if(!g) return;
  const key = g.dataset.pen;
  if(!hasTicket() && !peekMode){ openGate(); return; }
  openPen(key);
});
$('enclosure-back').addEventListener('click', () => { $('enclosure').hidden = true; openKey = null; });
$('detail-back').addEventListener('click', () => { $('detail').hidden = true; });
$('ticket-action').addEventListener('click', openGate);
$('hazed-action').addEventListener('click', () => { $('enclosure').hidden = true; openGate(); });
$('post-peek').addEventListener('click', () => {
  peekMode = true; store.peeked = true; save();
  $('post').hidden = true;
});
$('notice-ok').addEventListener('click', () => { $('notice').hidden = true; });

function boot(){
  buildSea();
  buildMap();
  refreshTicketBar();
  requestAnimationFrame(tickVisitors);
  setInterval(() => { runFactory(); save(); refreshTicketBar(); }, 60000);
  if(pendingFactoryNotice){
    pendingFactoryNotice = false;
    $('notice-text').textContent = 'あなたの子は工場に運ばれました。ありがとうございました。';
    $('notice').hidden = false;
    save();
  }else if(!hasTicket() && !store.peeked){
    openGate();
  }
  /* 島全体が見える位置から始める */
  const stage = $('map-stage');
  stage.scrollTop = (stage.scrollHeight - stage.clientHeight) * .35;
}
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    buildSea();
    if(!$('enclosure').hidden && openKey) openPen(openKey);
  }, 200);
});
boot();
