/* Trash zoo — 放飼場の風景。
   動物園の展示場をそのまま作る。空、遠景の街や木、掘られた地面と岩、
   手前のガラス柵、そしてそれを覗き込んでいる人たち。
   地域ごとに、空の色も、地面も、柵も、見に来ている人の様子も違う。 */

const SCENES = {
  eastasia: { sky:['#BFE2F0','#E8F4EC'], far:'towers',    farColor:'#93A9B4',
    soil:['#C6A574','#A5854F'], grass:'#86BC5B', rock:['#BFB6A6','#8E8578'],
    plant:'#4F9440', crowd:['#3B4650','#4A4048','#333E46','#54483C'], busy:5 },
  seasia:   { sky:['#CDE9EE','#F2F3D8'], far:'palms',     farColor:'#5E8C63',
    soil:['#B98C58','#95693C'], grass:'#6FA847', rock:['#A8A294','#7C766A'],
    plant:'#3E8437', crowd:['#46504E','#5A4A42','#3A4744','#6B5540'], busy:6 },
  sasia:    { sky:['#E4DFBE','#F6EED6'], far:'temple',    farColor:'#A38F6E',
    soil:['#C2A163','#9E7C42'], grass:'#9BAE55', rock:['#B6AA92','#8A7F69'],
    plant:'#7E9B3C', crowd:['#4A423C','#5B4436','#3E3A38','#6A5442'], busy:7 },
  mideast:  { sky:['#E9DFC4','#F7F0DC'], far:'domes',     farColor:'#BCA783',
    soil:['#D8BC85','#B79A62'], grass:'#C3B36C', rock:['#C6B598','#9B8B70'],
    plant:'#8F9A4E', crowd:['#4C4438','#5E5344','#3F3A32','#6B6050'], busy:4 },
  africa:   { sky:['#EBD9B4','#F8EFD6'], far:'acacia',    farColor:'#9C7F52',
    soil:['#C08A5A','#9C6A41'], grass:'#B49A4E', rock:['#B9A183','#8D7761'],
    plant:'#7E8F3E', crowd:['#4A3F35','#5C4A38','#3C352F','#6E5940'], busy:4 },
  westeu:   { sky:['#C6E0F2','#EDF3EC'], far:'rowhouses', farColor:'#A08C86',
    soil:['#B99A6E','#987A50'], grass:'#8CC463','rock':['#BAB3A6','#8B8478'],
    plant:'#4E9440', crowd:['#3D4650','#4B3F44','#35404A','#574B3E'], busy:5 },
  northeu:  { sky:['#CBDDE6','#E9EFEA'], far:'pines',     farColor:'#5C7060',
    soil:['#A99B7C','#8A7C60'], grass:'#A9B79A', rock:['#B0AFA6','#83827A'],
    plant:'#6E8A62', crowd:['#39444C','#46414A','#2F3940','#4E4A42'], busy:3 },
  easteu:   { sky:['#CFDDE8','#EDF0E7'], far:'blocks',    farColor:'#9AA0A4',
    soil:['#B29A72','#907A56'], grass:'#8FA86B', rock:['#B3ADA0','#868073'],
    plant:'#5F8A44', crowd:['#3C444C','#4A424A','#343C44','#544A40'], busy:4 },
  namerica: { sky:['#C2DFF2','#EAF2F0'], far:'towers',    farColor:'#8E9DA8',
    soil:['#BE9C6C','#9B7B4E'], grass:'#84C263', rock:['#BDB5A8','#8C857A'],
    plant:'#4C9440', crowd:['#3A454F','#4C4046','#343E48','#57493C'], busy:6 },
  latam:    { sky:['#D6E7E4','#F5EFD6'], far:'hills',     farColor:'#7F9464',
    soil:['#C79B63','#A67B44'], grass:'#9EB055', rock:['#B7A98F','#897D68'],
    plant:'#6E9440', crowd:['#454038','#5C4638','#3B3E3C','#6B5642'], busy:7 },
  oceania:  { sky:['#C9E4F0','#EFF2E2'], far:'gums',      farColor:'#8A9B78',
    soil:['#C3A971','#A08850'], grass:'#B9C36B', rock:['#BDB4A2','#8D8676'],
    plant:'#7E9B58', crowd:['#3F4850','#4E4444','#374048','#5A4E40'], busy:4 }
};

/* 遠景。地域の空気を、輪郭だけで伝える。 */
const SKYLINES = {
  towers(g, W, base, col, r){
    for(let x = -20; x < W + 40; ){
      const w = 26 + r()*54, h = 40 + r()*120;
      SVG.rect(g, x, base - h, w, h, col, .55 + r()*.2);
      for(let i = 0; i < Math.floor(h/18); i++)
        SVG.rect(g, x + 5, base - h + 8 + i*16, w - 10, 5, '#FFFFFF', .18);
      x += w + 6 + r()*14;
    }
    const tx = W * (.12 + r()*.5), tw = 42, th = 210 + r()*70;
    SVG.rect(g, tx, base - th, tw, th, col, .85);
    SVG.rect(g, tx + 6, base - th + 14, tw - 12, th - 30, '#FFFFFF', .16);
  },
  blocks(g, W, base, col, r){
    for(let x = -10; x < W + 30; ){
      const w = 60 + r()*40, h = 70 + r()*70;
      SVG.rect(g, x, base - h, w, h, col, .6);
      for(let i = 0; i < Math.floor(h/22); i++)
        for(let j = 0; j < Math.floor(w/22); j++)
          SVG.rect(g, x + 8 + j*20, base - h + 10 + i*20, 9, 11, '#FFFFFF', .2);
      x += w + 10;
    }
  },
  rowhouses(g, W, base, col, r){
    for(let x = -20; x < W + 40; ){
      const w = 40 + r()*26, h = 60 + r()*50;
      SVG.path(g, `M${x},${base} L${x},${base-h} L${x+w/2},${base-h-18} L${x+w},${base-h} L${x+w},${base}Z`, col, .62);
      x += w + 2;
    }
    const sx = W * (.55 + r()*.3);
    SVG.path(g, `M${sx},${base} L${sx},${base-120} L${sx+16},${base-172} L${sx+32},${base-120} L${sx+32},${base}Z`, col, .8);
  },
  pines(g, W, base, col, r){
    for(let x = -20; x < W + 40; x += 22 + r()*20){
      const h = 70 + r()*90, w = 22 + r()*16;
      SVG.path(g, `M${x},${base} L${x+w/2},${base-h} L${x+w},${base}Z`, col, .5 + r()*.35);
    }
  },
  palms(g, W, base, col, r){
    for(let x = 10; x < W; x += 90 + r()*90){
      const h = 90 + r()*70;
      SVG.rect(g, x, base - h, 6, h, col, .7);
      for(let a = 0; a < 6; a++){
        const dir = a < 3 ? -1 : 1, k = (a % 3) + 1;
        SVG.path(g, `M${x+3},${base-h} q${dir*30},${-14*k/2} ${dir*(38+k*10)},${8+k*6}`,
          'none', .65, col, 7);
      }
    }
    SVG.path(g, `M-20,${base} q${W/3},-46 ${W/1.6},-10 q${W/4},-30 ${W/2},14 L${W+30},${base}Z`, col, .35);
  },
  hills(g, W, base, col, r){
    SVG.path(g, `M-30,${base} q${W*.24},-140 ${W*.5},-70 q${W*.22},-96 ${W*.62},-16 L${W+30},${base}Z`, col, .45);
    SVG.path(g, `M-30,${base} q${W*.3},-88 ${W*.62},-30 L${W+30},${base}Z`, col, .6);
    for(let x = 20; x < W; x += 120 + r()*80){
      const h = 60 + r()*40;
      SVG.rect(g, x, base - h, 5, h, col, .8);
      SVG.path(g, `M${x+2},${base-h} q-26,-6 -34,10 M${x+2},${base-h} q26,-6 34,10`, 'none', .7, col, 6);
    }
  },
  acacia(g, W, base, col, r){
    SVG.path(g, `M-30,${base} q${W*.35},-70 ${W*.7},-24 L${W+30},${base}Z`, col, .4);
    for(let x = 30; x < W; x += 130 + r()*110){
      const h = 66 + r()*40;
      SVG.rect(g, x, base - h, 6, h, col, .8);
      SVG.path(g, `M${x-52},${base-h-6} q54,-32 108,0 q-54,16 -108,0Z`, col, .75);
    }
  },
  gums(g, W, base, col, r){
    SVG.path(g, `M-30,${base} q${W*.4},-56 ${W*.8},-18 L${W+30},${base}Z`, col, .4);
    for(let x = 20; x < W; x += 100 + r()*90){
      const h = 70 + r()*44;
      SVG.rect(g, x, base - h, 6, h, col, .8);
      SVG.ellipse(g, x + 3, base - h - 14, 34 + r()*14, 22 + r()*10, col, .7);
    }
  },
  domes(g, W, base, col, r){
    for(let x = -10; x < W + 30; ){
      const w = 60 + r()*50, h = 46 + r()*40;
      SVG.rect(g, x, base - h, w, h, col, .55);
      x += w + 8;
    }
    const dx = W * (.3 + r()*.4);
    SVG.path(g, `M${dx-46},${base-70} a46,52 0 0 1 92,0Z`, col, .8);
    SVG.rect(g, dx - 50, base - 70, 100, 70, col, .8);
    SVG.rect(g, dx + 78, base - 168, 14, 168, col, .8);
    SVG.path(g, `M${dx+72},${base-168} a13,16 0 0 1 26,0Z`, col, .8);
  },
  temple(g, W, base, col, r){
    for(let x = -10; x < W + 30; ){
      const w = 54 + r()*40, h = 38 + r()*30;
      SVG.rect(g, x, base - h, w, h, col, .5);
      x += w + 10;
    }
    const tx = W * (.24 + r()*.4);
    for(let i = 0; i < 6; i++)
      SVG.rect(g, tx - 46 + i*7, base - 34 - i*26, 92 - i*14, 24, col, .78);
  }
};

/* SVG の細かい手当て。影と光の向きはここで固定する。 */
const SVG = {
  ns:'http://www.w3.org/2000/svg',
  make(tag, parent, attrs){
    const n = document.createElementNS(SVG.ns, tag);
    for(const k in attrs) n.setAttribute(k, attrs[k]);
    if(parent) parent.appendChild(n);
    return n;
  },
  rect(p, x, y, w, h, fill, op, rx){
    return SVG.make('rect', p, { x, y, width:Math.max(0,w), height:Math.max(0,h),
      fill, opacity:op == null ? 1 : op, rx:rx || 0 });
  },
  ellipse(p, cx, cy, rx, ry, fill, op){
    return SVG.make('ellipse', p, { cx, cy, rx, ry, fill, opacity:op == null ? 1 : op });
  },
  path(p, d, fill, op, stroke, sw){
    const a = { d, fill, opacity:op == null ? 1 : op };
    if(stroke){ a.stroke = stroke; a['stroke-width'] = sw || 4; a['stroke-linecap'] = 'round'; }
    return SVG.make('path', p, a);
  },
  circle(p, cx, cy, r, fill, op){
    return SVG.make('circle', p, { cx, cy, r, fill, opacity:op == null ? 1 : op });
  }
};

/* 見に来ている人。顔も名前もない。姿勢と動きだけが違う。 */
const POSES = ['stand', 'lean', 'photo', 'point', 'kid', 'crouch'];

function drawVisitor(parent, x, groundY, scale, pose, color, r, railY){
  const g = SVG.make('g', parent, { class:'visitor pose-' + pose });
  g.style.animationDuration = (3.4 + r()*3.6).toFixed(2) + 's';
  g.style.animationDelay = (-r()*6).toFixed(2) + 's';
  const s = scale, headR = 26 * s;
  const bodyTop = groundY - 74 * s;
  const inner = SVG.make('g', g, { transform:`translate(${x},0)` });

  /* 肩から下。柵の向こうを見ている背中。 */
  SVG.path(inner, `M${-52*s},${groundY+40*s} q0,${-96*s} ${52*s},${-96*s}
    q${52*s},0 ${52*s},${96*s} Z`, color, .96);
  /* 頭 */
  SVG.circle(inner, 0, bodyTop - headR * .2, headR, color, 1);

  if(pose === 'photo'){
    SVG.path(inner, `M${-42*s},${bodyTop+34*s} q${-16*s},${-40*s} ${14*s},${-58*s}`,
      'none', 1, color, 17*s);
    SVG.rect(inner, -34*s, bodyTop - 40*s, 30*s, 22*s, color, 1, 4*s);
    SVG.rect(inner, -29*s, bodyTop - 35*s, 20*s, 12*s, '#FBF7EC', .35, 2*s);
  }else if(pose === 'point'){
    const arm = SVG.make('g', inner, { class:'arm' });
    SVG.path(arm, `M${38*s},${bodyTop+40*s} q${34*s},${-16*s} ${58*s},${-46*s}`,
      'none', 1, color, 15*s);
  }else if(pose === 'lean'){
    SVG.path(inner, `M${-46*s},${bodyTop+44*s} q${-24*s},${26*s} ${-6*s},${44*s}`,
      'none', 1, color, 15*s);
  }
  /* 帽子・髪・鞄。人ごとの差はここだけ。 */
  const hat = r();
  if(hat < .22) SVG.path(inner, `M${-headR*1.5},${bodyTop-headR*.5} q${headR*1.5},${-headR*.9} ${headR*3},0Z`, color, 1);
  else if(hat < .4) SVG.circle(inner, headR*.7, bodyTop - headR*1.1, headR*.5, color, 1);
  if(r() < .3) SVG.rect(inner, -22*s, bodyTop + 30*s, 44*s, 52*s, color, .8, 10*s);
  return g;
}

/* 展示場をひとつ組み立てる。奥（空〜地面）と手前（柵と人）に分けて返す。
   その間にゴミたちが入る。 */
function buildExhibit(pen, key, W, H){
  const sc = SCENES[key] || SCENES.eastasia;
  const r = rng(key.split('').reduce((a, c) => a + c.charCodeAt(0), 11) * 131);
  const horizon = H * .40;
  const fenceY  = H * .78;

  const back = SVG.make('svg', null, { class:'ex-back', viewBox:`0 0 ${W} ${H}`,
    width:W, height:H });
  const front = SVG.make('svg', null, { class:'ex-front', viewBox:`0 0 ${W} ${H}`,
    width:W, height:H });

  /* 空 */
  const defs = SVG.make('defs', back, {});
  const grad = SVG.make('linearGradient', defs, { id:'sky-' + key, x1:0, y1:0, x2:0, y2:1 });
  SVG.make('stop', grad, { offset:'0%', 'stop-color':sc.sky[0] });
  SVG.make('stop', grad, { offset:'100%', 'stop-color':sc.sky[1] });
  SVG.rect(back, 0, 0, W, horizon + 4, `url(#sky-${key})`);

  /* 雲。ゆっくり流れる。 */
  for(let i = 0; i < 3; i++){
    const g = SVG.make('g', back, { class:'ex-cloud' });
    g.style.animationDuration = (70 + r()*60).toFixed(0) + 's';
    g.style.animationDelay = (-r()*90).toFixed(0) + 's';
    const cy = 20 + r() * horizon * .5, cx = r() * W;
    SVG.ellipse(g, cx, cy, 60 + r()*50, 16 + r()*10, '#FFFFFF', .5);
    SVG.ellipse(g, cx + 40, cy + 6, 44 + r()*30, 13 + r()*8, '#FFFFFF', .42);
  }

  /* 遠景。園の外側の景色。 */
  const far = SVG.make('g', back, { class:'ex-far' });
  (SKYLINES[sc.far] || SKYLINES.towers)(far, W, horizon + 6, sc.farColor, r);

  /* 園内の木。柵の向こう、展示場の奥。 */
  const mid = SVG.make('g', back, {});
  for(let x = -20; x < W + 40; x += 60 + r()*70){
    const h = 40 + r()*38, w = 34 + r()*26;
    const g = SVG.make('g', mid, { class:'ex-tree' });
    g.style.animationDuration = (5 + r()*4).toFixed(1) + 's';
    g.style.animationDelay = (-r()*6).toFixed(1) + 's';
    SVG.rect(g, x + w/2 - 3, horizon - h*.3, 6, h*.5, '#8A6A44');
    SVG.ellipse(g, x + w/2, horizon - h*.55, w*.6, h*.5, sc.plant, .95);
    SVG.ellipse(g, x + w/2 - w*.2, horizon - h*.75, w*.3, h*.3, '#FFFFFF', .14);
  }

  /* 展示場の地面。奥ほど明るく、手前ほど掘り込まれている。 */
  SVG.rect(back, 0, horizon, W, H - horizon, sc.soil[1]);
  SVG.path(back, `M0,${horizon} L${W},${horizon} L${W},${horizon+H*.06}
    q${-W*.3},${H*.05} ${-W*.62},${-H*.01} q${-W*.24},${-H*.04} ${-W*.38},${H*.02}Z`,
    sc.grass, .9);
  SVG.path(back, `M0,${horizon+H*.09} q${W*.28},${-H*.05} ${W*.55},${H*.01}
    q${W*.3},${H*.05} ${W*.45},${-H*.01} L${W},${H} L0,${H}Z`, sc.soil[0]);
  for(let i = 0; i < 16; i++){
    const y = horizon + H*.08 + r() * (fenceY - horizon - H*.06);
    SVG.ellipse(back, r()*W, y, 20 + r()*60, 5 + r()*12, sc.soil[1], .3);
  }

  /* 展示場の奥の擁壁。不揃いな岩を積んで、園路との境をつくる。 */
  const wallY = horizon + H * .085;
  const boulder = (cx, cy, bw, bh, lit, dark) => {
    const steps = 8, jit = [];
    for(let k = 0; k < steps; k++) jit.push(1 + (r() - .5) * .4);
    const shape = (dx, dy, f) => jit.map((j, k) => {
      const t = k / steps * Math.PI * 2;
      return (k ? 'L' : 'M') + (cx + dx + Math.cos(t) * bw * j * f).toFixed(1)
        + ',' + (cy + dy + Math.sin(t) * bh * j * f).toFixed(1);
    }).join('') + 'Z';
    SVG.path(back, shape(0, 0, 1), dark);
    SVG.path(back, shape(-bw*.09, -bh*.16, .87), lit);
    SVG.path(back, `M${cx-bw*.5},${cy-bh*.45} q${bw*.3},${-bh*.4} ${bw*.66},${-bh*.16}`,
      'none', .3, '#FFFFFF', Math.max(2, bw*.11));
  };
  for(let pass = 0; pass < 2; pass++){
    for(let x = -40; x < W + 60; ){
      const bw = (22 + r()*30) * (pass ? 1 : .78);
      const bh = bw * (.55 + r()*.3);
      const tone = r();
      boulder(x, wallY + (pass ? bh*.35 : -bh*.35) + (r()-.5)*H*.012, bw, bh,
        tone < .5 ? sc.rock[0] : sc.soil[0], tone < .5 ? sc.rock[1] : sc.soil[1]);
      x += bw * (1.05 + r()*.5);
    }
  }
  SVG.rect(back, 0, wallY + H*.035, W, H*.018, '#3B3226', .1);

  /* 岩。同じ岩は二つとない。左上に光、右下に影。 */
  const rocks = 9 + Math.floor(r()*6);
  for(let i = 0; i < rocks; i++){
    const y = horizon + H*.04 + r() * (fenceY - horizon - H*.12);
    const x = r() * W;
    const depth = (y - horizon) / (fenceY - horizon);
    const rw = (12 + r()*24) * (.55 + depth*.95), rh = rw * (.34 + r()*.36);
    const tone = r();
    const lit = tone < .35 ? sc.rock[0] : (tone < .7 ? sc.soil[0] : sc.rock[1]);
    const dark = tone < .7 ? sc.rock[1] : sc.soil[1];
    /* 縁を崩す。楕円のままだと石に見えない。 */
    const steps = 9, jit = [];
    for(let k = 0; k < steps; k++) jit.push(1 + (r() - .5) * .34);
    const shape = (kx, ky, f) => jit.map((j, k) => {
      const t = k / steps * Math.PI * 2;
      return (k ? 'L' : 'M') + (x + kx + Math.cos(t) * rw * j * f).toFixed(1)
        + ',' + (y - rh*.2 + ky + Math.sin(t) * rh * j * f).toFixed(1);
    }).join('') + 'Z';
    SVG.ellipse(back, x + rw*.25, y + rh*.5, rw*.95, rh*.32, '#3B3226', .16);
    SVG.path(back, shape(0, 0, 1), dark);
    SVG.path(back, shape(-rw*.08, -rh*.14, .88), lit);
    SVG.path(back, `M${x-rw*.5},${y-rh*.5} q${rw*.35},${-rh*.42} ${rw*.7},${-rh*.2}`,
      'none', .38, '#FFFFFF', Math.max(2, rw*.14));
  }

  /* 草むら。まばらに、奥ほど小さく。 */
  for(let i = 0; i < 17; i++){
    const y = horizon + H*.05 + r() * (fenceY - horizon - H*.08);
    const x = r() * W, k = (.55 + (y - horizon) / (fenceY - horizon) * .8) * (.7 + r()*.7);
    const g = SVG.make('g', back, { class:'ex-tuft' });
    g.style.animationDuration = (3 + r()*3).toFixed(1) + 's';
    g.style.animationDelay = (-r()*5).toFixed(1) + 's';
    const blades = 3 + Math.floor(r()*3);
    for(let b = 0; b < blades; b++){
      const dir = (b - (blades-1)/2) * (.7 + r()*.8);
      SVG.path(g, `M${x},${y} q${dir*4*k},${-9*k} ${dir*7*k},${-(14+r()*12)*k}`,
        'none', .55 + r()*.4, sc.plant, 2.4*k);
    }
  }

  /* ---- 手前：柵とガラス ---- */
  SVG.path(back, `M0,${fenceY-H*.10} q${W*.3},${-H*.02} ${W*.55},${H*.005}
    q${W*.26},${H*.02} ${W*.45},${-H*.005} L${W},${H} L0,${H}Z`, sc.soil[1], .5);
  SVG.rect(back, 0, fenceY - 16, W, 16, '#3B3226', .12);   // 柵が地面に落とす影
  SVG.rect(front, 0, fenceY + 6, W, H - fenceY, '#DCE6E4', .16);
  SVG.rect(front, 0, fenceY + 6, W, 3, '#FFFFFF', .5);
  /* ガラスの映り込み */
  for(let i = 0; i < 3; i++){
    const gx = W * (.08 + i * .34);
    SVG.path(front, `M${gx},${H} L${gx + 90},${fenceY + 8} L${gx + 132},${fenceY + 8} L${gx + 42},${H}Z`,
      '#FFFFFF', .09);
  }
  const posts = Math.max(3, Math.round(W / 190));
  for(let i = 0; i <= posts; i++){
    const x = i * (W / posts);
    SVG.rect(front, x - 5, fenceY, 10, H - fenceY, '#B9C2C4');
    SVG.rect(front, x - 5, fenceY, 4, H - fenceY, '#E8EFEF', .9);
    SVG.ellipse(front, x, fenceY, 9, 5, '#CFD8D9');
  }
  SVG.rect(front, 0, fenceY - 10, W, 11, '#AEB8BA');
  SVG.rect(front, 0, fenceY - 10, W, 4, '#E4EAEA', .95);
  SVG.rect(front, 0, fenceY + 2, W, 5, '#3B3226', .12);

  /* 注意書き。淡々と置く。 */
  const sx = W * .84, sy = fenceY - 96;
  const sign = SVG.make('g', front, { class:'ex-sign' });
  SVG.rect(sign, sx - 4, sy + 42, 8, 120, '#9AA3A5');
  SVG.path(sign, `M${sx},${sy-46} L${sx+46},${sy} L${sx},${sy+46} L${sx-46},${sy}Z`, '#D8A82E');
  SVG.path(sign, `M${sx},${sy-40} L${sx+40},${sy} L${sx},${sy+40} L${sx-40},${sy}Z`, '#F5CB55');
  /* 跳ねている包み紙の標識 */
  SVG.path(sign, `M${sx-17},${sy+14} q${-4},${-24} ${8},${-30} q${-2},${-8} ${4},${-10}
    q${5},${9} ${9},${1} q${13},${5} ${9},${39} q${-15},${8} ${-30},0Z`, '#3A3020');
  SVG.ellipse(sign, sx, sy + 24, 16, 4, '#3A3020', .4);
  SVG.rect(sign, sx - 46, sy + 52, 92, 26, '#D8A82E', 1, 4);
  SVG.rect(sign, sx - 46, sy + 50, 92, 26, '#F5CB55', 1, 4);
  const t = SVG.make('text', sign, { x:sx, y:sy + 68, 'text-anchor':'middle',
    'font-size':15, fill:'#6B5312', 'font-family':'"Noto Sans JP",sans-serif' });
  t.textContent = '入らないで';

  /* ---- 見に来ている人 ---- */
  const backRow = SVG.make('g', front, { opacity:.62 });
  const frontRow = SVG.make('g', front, {});
  const count = Math.max(3, Math.round(sc.busy * W / 760));
  const slots = [];
  for(let i = 0; i < count; i++){
    const far = i % 3 === 2;                     // 三人にひとりは少し離れて見ている
    let x, guard = 0;
    do { x = W * (.04 + r()*.92); guard++; }
    while(guard < 40 && slots.some(v => Math.abs(v - x) < W * (far ? .07 : .13)));
    slots.push(x);
    const pose = POSES[Math.floor(r() * POSES.length)];
    let scale = (H / 700) * (far ? .42 + r()*.14 : .62 + r()*.34);
    if(pose === 'kid') scale *= .62;
    const groundY = far ? H - (H - fenceY) * .16 : H + 12 * scale;
    drawVisitor(far ? backRow : frontRow, x, groundY, scale, pose,
      sc.crowd[Math.floor(r()*sc.crowd.length)], r, fenceY);
  }

  pen.appendChild(back);
  pen.appendChild(front);
  return { horizon, fenceY, sc };
}
