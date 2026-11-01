/* =====================================================================
   UNLEASHED — scroll-driven WebGL energy-drink rack
   Three.js r169 · real lathe geometry, canvas-drawn labels, no photos.

   CAN GEOMETRY STACK (computed, not eyeballed — see skill pitfalls)
     body      : r 1.00, y  0.00 .. 4.10
     shoulder  : r 1.00 -> 0.72, y 4.10 .. 4.62
     neck      : r 0.72, y 4.62 .. 4.78
     lid       : r 0.74, y 4.78 .. 4.86     (rim sits proud of the neck)
     tab       : y 4.86 .. 4.93
     total height 4.93, centred by shifting the group -2.46 on Y

   Timeline (p = 0..1)
     0.00-0.18  CAN      one can assembles: body, shoulder, lid, tab
     0.18-0.36  CHILL    condensation beads form, can rotates, frost ring
     0.36-0.58  LINEUP   five more cans slide in, camera pulls back
     0.58-0.78  FLAVOURS cans fan out in an arc, labels face the camera
     0.78-1.00  PICK     interactive: click a can, it steps forward
   ===================================================================== */

import * as THREE from 'three';

/* ----------------------------------------------------------- flavours */
const FLAVOURS = [
  { id:'original', name:'ORIGINAL',    sub:'Monster Energy',
    base:'#0d0d0d', claw:'#00ff41', accent:'#00ff41',
    sugar:'54 g', cal:'230', note:'Apple-ish, medicinal, the benchmark.' },
  { id:'ultra',    name:'ULTRA WHITE', sub:'Zero Sugar',
    base:'#eceae2', claw:'#1fb6c9', accent:'#1fb6c9', dark:true,
    sugar:'0 g',  cal:'10',  note:'Citrus, dry finish. Quietly the best one.' },
  { id:'mango',    name:'MANGO LOCO',  sub:'Juice Monster',
    base:'#ffb300', claw:'#e02020', accent:'#ff7a00', dark:true,
    sugar:'52 g', cal:'220', note:'Melted ice lolly. Unserious. Excellent.' },
  { id:'pipeline', name:'PIPELINE',    sub:'Punch Juice',
    base:'#ff5fa2', claw:'#2bd4a0', accent:'#ff5fa2', dark:true,
    sugar:'44 g', cal:'190', note:'Passionfruit and guava. Tastes pink.' },
  { id:'rossi',    name:'ULTRA ROSA',  sub:'Zero Sugar',
    base:'#f3d9e6', claw:'#d6346f', accent:'#d6346f', dark:true,
    sugar:'0 g',  cal:'10',  note:'Pink grapefruit. Sharp, almost bitter.' },
  { id:'khaos',    name:'KHAOS',       sub:'Juice Monster',
    base:'#ff8a00', claw:'#1b1b1b', accent:'#ff8a00', dark:true,
    sugar:'50 g', cal:'210', note:'Orange juice that went to the gym.' },
];

/* -------------------------------------------------------------- setup */
const canvas = document.querySelector('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07070a);
scene.fog = new THREE.Fog(0x07070a, 30, 85);

const camera = new THREE.PerspectiveCamera(36, innerWidth/innerHeight, .1, 200);
scene.add(camera);

/* -------------------------------------------------------------- light */
scene.add(new THREE.AmbientLight(0xffffff, .5));

const key = new THREE.DirectionalLight(0xfff6ec, 2.4);
key.position.set(7, 13, 9);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 1; key.shadow.camera.far = 60;
key.shadow.camera.left = -20; key.shadow.camera.right = 20;
key.shadow.camera.top = 20;   key.shadow.camera.bottom = -20;
key.shadow.bias = -0.0016;
scene.add(key);

const fill = new THREE.DirectionalLight(0x9fc0ff, .8);
fill.position.set(-9, 5, -7);
scene.add(fill);

// brand rim light — recoloured live from the selected flavour
const rim = new THREE.PointLight(0x00ff41, 30, 34, 2);
rim.position.set(-3.5, 3, 4.5);
scene.add(rim);

/* ------------------------------------------------- label texture (2D) */
// Each can gets its artwork drawn into a canvas: colour field, claw marks,
// wordmark, and the small print. No image files, so the site stays 3 files.
function makeLabel(f) {
  const W = 1024, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');

  // base colour field
  x.fillStyle = f.base;
  x.fillRect(0, 0, W, H);

  // subtle vertical sheen so the cylinder doesn't look flat-painted
  for (let i = 0; i < W; i += 4) {
    const t = i / W;
    x.fillStyle = `rgba(255,255,255,${(.05 * Math.sin(t * Math.PI * 2)).toFixed(3)})`;
    x.fillRect(i, 0, 4, H);
  }

  // the claw: three tapered slashes, drawn twice so it wraps front and back
  const claw = (cx) => {
    x.save();
    x.translate(cx, H * .40);
    x.rotate(-.12);
    x.fillStyle = f.claw;
    for (let s = 0; s < 3; s++) {
      const off = s * 62;
      x.beginPath();
      x.moveTo(off,        -120);
      x.lineTo(off + 34,   -118);
      x.lineTo(off + 16,    126);
      x.lineTo(off -  6,    120);
      x.closePath();
      x.fill();
    }
    x.restore();
  };
  claw(W * .13); claw(W * .63);

  // wordmark, twice, so a label is readable from either side
  const word = (cx) => {
    x.save();
    x.translate(cx, H * .74);
    x.textAlign = 'center';
    x.fillStyle = f.dark ? '#141414' : '#ffffff';
    x.font = '900 72px Inter, sans-serif';
    x.fillText(f.name, 0, 0);
    x.font = '500 26px "JetBrains Mono", monospace';
    x.fillStyle = f.claw;
    x.fillText(f.sub.toUpperCase(), 0, 38);
    x.restore();
  };
  word(W * .25); word(W * .75);

  // top band with the volume, repeated around the can
  x.fillStyle = f.dark ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.14)';
  x.fillRect(0, 0, W, 54);
  x.fillStyle = f.dark ? '#141414' : '#ffffff';
  x.font = '500 24px "JetBrains Mono", monospace';
  x.textAlign = 'left';
  for (let i = 0; i < 4; i++) x.fillText('500 ML · 160 MG CAFFEINE', 30 + i * 256, 36);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* ------------------------------------------------------ can geometry */
// One lathe profile shared by all six cans; only the label material differs.
const CAN = (() => {
  const pts = [];
  pts.push(new THREE.Vector2(0,    0));      // base centre
  pts.push(new THREE.Vector2(.86,  0));      // base edge
  pts.push(new THREE.Vector2(1.00, .22));    // base roll
  pts.push(new THREE.Vector2(1.00, 4.10));   // wall top
  pts.push(new THREE.Vector2(.92,  4.34));   // shoulder
  pts.push(new THREE.Vector2(.78,  4.56));
  pts.push(new THREE.Vector2(.72,  4.62));   // neck
  pts.push(new THREE.Vector2(.72,  4.78));
  pts.push(new THREE.Vector2(.74,  4.82));   // rim, proud of the neck
  pts.push(new THREE.Vector2(.68,  4.86));
  pts.push(new THREE.Vector2(0,    4.86));   // lid centre
  return {
    shell:    new THREE.LatheGeometry(pts, 72),
    // the label is a separate sleeve so it can carry its own UVs
    sleeve:   new THREE.CylinderGeometry(1.005, 1.005, 3.9, 72, 1, true),
    lid:      new THREE.CylinderGeometry(.70, .70, .05, 48),
    tabRing:  new THREE.TorusGeometry(.17, .035, 8, 24),
    tabPlate: new THREE.BoxGeometry(.34, .03, .20),
    HEIGHT:   4.86,
  };
})();

const M_ALU  = new THREE.MeshStandardMaterial({ color:0xdcdce2, roughness:.26, metalness:.95 });
const M_LID  = new THREE.MeshStandardMaterial({ color:0xc9c9d0, roughness:.3,  metalness:.95 });
const M_FROST= new THREE.MeshStandardMaterial({ color:0xffffff, roughness:.95, metalness:0,
                                                transparent:true, opacity:0 });

function makeCan(f) {
  const g = new THREE.Group();

  const shell = new THREE.Mesh(CAN.shell, M_ALU);
  shell.castShadow = shell.receiveShadow = true;
  g.add(shell);

  const sleeve = new THREE.Mesh(CAN.sleeve, new THREE.MeshStandardMaterial({
    map: makeLabel(f), roughness:.42, metalness:.25,
  }));
  sleeve.position.y = 2.05;                    // centres the 3.9-tall sleeve on the wall
  sleeve.castShadow = true;
  g.add(sleeve);

  const lidGrp = new THREE.Group();
  const lid = new THREE.Mesh(CAN.lid, M_LID);
  lid.position.y = 4.84;
  lidGrp.add(lid);
  const ring = new THREE.Mesh(CAN.tabRing, M_LID);
  ring.position.set(.12, 4.90, 0);
  ring.rotation.x = Math.PI / 2;
  lidGrp.add(ring);
  const plate = new THREE.Mesh(CAN.tabPlate, M_LID);
  plate.position.set(-.14, 4.89, 0);
  lidGrp.add(plate);
  g.add(lidGrp);

  // condensation: small spheres scattered over the wall, grown in phase 2
  const beads = new THREE.Group();
  const beadGeo = new THREE.SphereGeometry(1, 6, 5);
  for (let i = 0; i < 90; i++) {
    const a = Math.random() * Math.PI * 2;
    const y = .4 + Math.random() * 3.5;
    const s = .015 + Math.random() * .035;
    const b = new THREE.Mesh(beadGeo, M_FROST);
    b.position.set(Math.cos(a) * 1.02, y, Math.sin(a) * 1.02);
    b.scale.setScalar(s);
    b.userData.s = s;
    beads.add(b);
  }
  g.add(beads);

  g.userData = { shell, sleeve, lidGrp, beads, flavour:f };
  g.position.y = -CAN.HEIGHT / 2;              // centre the can on the origin
  return g;
}

/* ------------------------------------------------------- build scene */
const rack = new THREE.Group();
scene.add(rack);

const cans = [];
const SPACING = 2.9;
FLAVOURS.forEach((f, i) => {
  const holder = new THREE.Group();           // holds position; can group holds the offset
  const can = makeCan(f);
  holder.add(can);
  // line-up X, and the arc the cans fan into during phase 4
  const lineX = (i - (FLAVOURS.length - 1) / 2) * SPACING;
  const arcA  = (i - (FLAVOURS.length - 1) / 2) * .33;
  holder.userData = {
    can, f, i,
    lineX,
    arcPos: new THREE.Vector3(Math.sin(arcA) * 9.5, 0, Math.cos(arcA) * 9.5 - 9.5),
    arcRot: -arcA,
    step: 0, hover:false, selected: i === 0,
  };
  rack.add(holder);
  cans.push(holder);
});
const hero = cans[0];

// floor that catches the shadows
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(140, 140),
  new THREE.ShadowMaterial({ opacity:.45 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -CAN.HEIGHT / 2 - .02;
floor.receiveShadow = true;
scene.add(floor);

// frost ring under the hero can, revealed in the CHILL phase
const frostRing = new THREE.Mesh(
  new THREE.RingGeometry(1.1, 2.4, 64),
  new THREE.MeshBasicMaterial({ color:0x9fe8ff, transparent:true, opacity:0,
                                side:THREE.DoubleSide })
);
frostRing.rotation.x = -Math.PI / 2;
frostRing.position.y = -CAN.HEIGHT / 2 + .015;   // just above the floor plane
scene.add(frostRing);

/* ------------------------------------------------------------ helpers */
const lerp  = (a,b,t) => a + (b-a) * t;
const clamp = (v,a=0,b=1) => Math.min(b, Math.max(a, v));
const seg   = (p,f,t) => clamp((p - f) / (t - f));
const ease  = t => t<.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
const easeOut = t => 1 - Math.pow(1-t, 3);
const bounce = t => {
  const n = 7.5625, d = 2.75;
  if (t < 1/d)   return n*t*t;
  if (t < 2/d)   return n*(t-=1.5/d)*t + .75;
  if (t < 2.5/d) return n*(t-=2.25/d)*t + .9375;
  return n*(t-=2.625/d)*t + .984375;
};

/* ------------------------------------------------------ scroll + drag */
let targetP = 0, p = 0;
const spacer = document.querySelector('#scroll-space');
function readScroll() {
  targetP = clamp(scrollY / Math.max(1, spacer.offsetHeight - innerHeight));
}
addEventListener('scroll', readScroll, { passive:true });
readScroll();

let dragA = 0, dragT = 0, dragging = false, lastX = 0, moved = 0;
// declared here because the pointermove handler below writes them
const ptr = new THREE.Vector2();
let pointerInside = false, hovered = null;
canvas.addEventListener('pointerdown', e => {
  dragging = true; moved = 0; lastX = e.clientX; canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  if (dragging) { const d = e.clientX - lastX; dragT += d * .006; moved += Math.abs(d); lastX = e.clientX; }
  pointerInside = true;
  ptr.x = (e.clientX / innerWidth) * 2 - 1;
  ptr.y = -(e.clientY / innerHeight) * 2 + 1;
});
canvas.addEventListener('pointerup', () => { dragging = false; });
canvas.addEventListener('pointercancel', () => { dragging = false; });
canvas.addEventListener('pointerleave', () => { pointerInside = false; });

/* ------------------------------------------------------ pick / hover */
const ray = new THREE.Raycaster();
const pickTargets = cans.map(h => h.userData.can.userData.sleeve);
const sleeveToHolder = new Map(cans.map(h => [h.userData.can.userData.sleeve, h]));

function select(holder) {
  cans.forEach(h => h.userData.selected = (h === holder));
  const f = holder.userData.f;
  document.documentElement.style.setProperty('--acc', f.accent);
  rim.color.set(f.accent);
  document.querySelector('#pick-h').textContent = f.name;
  document.querySelector('#pick-p').textContent = f.note;
  document.querySelector('#pick-spec').innerHTML =
    [['160 mg','CAFFEINE'], [f.sugar,'SUGAR'], [f.cal,'KCAL']]
      .map(([v,l]) => `<li><b>${v}</b>${l}</li>`).join('');
  [...document.querySelectorAll('.chip')].forEach(c => {
    const on = c.dataset.id === f.id;
    c.classList.toggle('on', on);
    c.style.background = on ? f.accent : '';
    c.style.borderColor = on ? f.accent : '';
  });
}

canvas.addEventListener('click', () => {
  if (moved > 6) return;                 // that was a drag, not a click
  if (hovered) select(hovered);
});

function updateHover() {
  if (p < .58 || dragging || !pointerInside) {
    if (hovered) { hovered.userData.hover = false; hovered = null; canvas.style.cursor = ''; }
    return;
  }
  ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects(pickTargets, false)[0];
  const h = hit ? sleeveToHolder.get(hit.object) : null;
  if (h !== hovered) {
    if (hovered) hovered.userData.hover = false;
    hovered = h;
    if (hovered) hovered.userData.hover = true;
    canvas.style.cursor = hovered ? 'pointer' : '';
  }
}

/* ------------------------------------------------------------ UI bind */
const panels    = [...document.querySelectorAll('.panel')];
const railFill  = document.querySelector('#rail-fill');
const railSteps = [...document.querySelectorAll('.rail__steps li')];
const hint      = document.querySelector('#hint');
const hdrMeta   = document.querySelector('#hdr-meta');
const chips     = document.querySelector('#chips');
const META = ['500 ML · ALUMINIUM · 0.097 MM WALL','SERVE AT 4 °C · 3 ATM',
              '6 FLAVOURS · 160 MG EACH','CLAW MARKS SINCE 2002','CLICK TO SELECT'];
let metaIdx = -1;

FLAVOURS.forEach((f, i) => {
  const b = document.createElement('button');
  b.className = 'chip'; b.dataset.id = f.id; b.textContent = f.name;
  b.addEventListener('click', () => select(cans[i]));
  chips.appendChild(b);
});

function updateUI() {
  panels.forEach(el => {
    const f = +el.dataset.from, t = +el.dataset.to;
    const fade = (t - f) * .28;
    const a = clamp((p - (f - fade)) / fade);
    const b = clamp(((t + fade) - p) / fade);
    el.style.opacity = Math.min(a, b);
    el.style.transform = `translateY(${(p - (f + t) / 2) * -70}px)`;
  });
  railFill.style.height = (p * 100) + '%';
  const s = Math.min(4, Math.floor(p * 5));
  railSteps.forEach((li, i) => li.classList.toggle('on', i === s));
  if (s !== metaIdx) { metaIdx = s; hdrMeta.textContent = META[s]; }
  hint.classList.toggle('gone', p > .02);
  chips.classList.toggle('on', p > .80);
}

/* ------------------------------------------------------------- camera */
const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3();
// aim left of the subject so it lands in the right half; the wider the subject
// gets (one can -> a row of six), the less offset it needs
const shift = () => innerWidth > 860 ? -9.5 : 0;
const shiftRow = () => innerWidth > 860 ? -4.2 : 0;

function updateCamera(t) {
  const sh = shift();
  if (p < .36) {
    // close on the hero can
    const k = seg(p, 0, .36);
    const a = -.45 + k * .9 + Math.sin(t * .1) * .05 + dragA;
    const r = lerp(17, 15, ease(k));
    const h = lerp(2.2, 1.4, k);
    camPos.set(Math.sin(a) * r, h, Math.cos(a) * r);
    // aim left of the can so the can itself lands in the right half of the frame
    camTgt.set(sh, lerp(.3, 0, k), 0);
  } else if (p < .78) {
    // pull back over the line-up, then the arc
    const k = seg(p, .36, .78), q = easeOut(k);
    const a = .45 + k * .45 + dragA;
    const r = lerp(15, 24, q);
    const h = lerp(1.4, 5.0, q);
    camPos.set(Math.sin(a) * r, h, Math.cos(a) * r);
    camTgt.set(lerp(sh, shiftRow(), q), lerp(0, .2, k), lerp(0, -3, q));
  } else {
    // picking phase: slightly lower, slow drift, fully draggable
    const k = seg(p, .78, 1);
    const a = .9 + k * .3 + Math.sin(t * .06) * .04 + dragA;
    const r = lerp(24, 22, ease(k));
    const h = lerp(5.0, 3.4, ease(k));
    camPos.set(Math.sin(a) * r, h, Math.cos(a) * r);
    camTgt.set(shiftRow(), .1, -3);
  }
  camera.position.lerp(camPos, .085);
  camera.lookAt(camTgt);
}

/* -------------------------------------------------------------- scene */
function updateScene(t) {
  /* --- phase 1: the hero can assembles --- */
  const asm = ease(seg(p, 0, .18));
  const ex  = 1 - asm;
  const hu  = hero.userData.can.userData;
  hu.lidGrp.position.y = ex * 1.4;
  hu.lidGrp.rotation.y = ex * t * .8;
  hu.sleeve.position.y = 2.05 - ex * .9;
  hu.sleeve.scale.setScalar(lerp(1.12, 1, asm));
  hu.sleeve.material.opacity = 1;
  hu.shell.scale.y = lerp(.55, 1, asm);

  /* --- phase 2: condensation + frost ring --- */
  const chill = seg(p, .18, .36);
  cans.forEach(h => {
    const isHero = h === hero;
    const amt = isHero ? chill : seg(p, .40, .58);
    h.userData.can.userData.beads.children.forEach((b, i) => {
      const local = clamp((amt - (i / 110)) * 3);
      b.scale.setScalar(b.userData.s * local);
      b.material.opacity = local * .85;
    });
  });
  // one shared material drives every bead, so set it once
  M_FROST.opacity = Math.max(seg(p, .18, .36), seg(p, .40, .58)) * .8;
  frostRing.material.opacity = seg(p, .20, .34) * .18 * (1 - seg(p, .4, .55));
  frostRing.scale.setScalar(lerp(.6, 1.25, ease(seg(p, .18, .4))));

  /* --- phase 3: the other five cans slide in --- */
  const lineIn = seg(p, .34, .50);
  cans.forEach((h, i) => {
    const d = h.userData;
    if (i === 0) { d.can.rotation.y = lerp(0, .6, seg(p,0,.36)) + (p<.58 ? t*.12 : 0); }
    const local = i === 0 ? 1 : clamp((lineIn - i * .07) / .55);
    const e = bounce(local);
    // they drop in from above and settle on the line
    h.position.x = d.lineX * e;
    h.position.y = lerp(16, 0, e);
    h.visible = i === 0 || local > 0;
    d.can.rotation.y = i === 0 ? d.can.rotation.y : lerp(Math.PI, .25, easeOut(local));
  });

  /* --- phase 4: fan into an arc, labels turning to camera --- */
  const fan = ease(seg(p, .58, .78));
  cans.forEach(h => {
    const d = h.userData;
    h.position.x = lerp(d.lineX, d.arcPos.x, fan);
    h.position.z = lerp(0, d.arcPos.z, fan);
    d.can.rotation.y = lerp(d.can.rotation.y, d.arcRot + .25, fan * .25);
  });

  /* --- phase 5: selection steps a can forward --- */
  const pick = seg(p, .76, .88);
  cans.forEach(h => {
    const d = h.userData;
    const want = (d.selected ? 1 : 0) * pick + (d.hover ? .3 : 0) * pick;
    d.step += (want - d.step) * .12;
    // pull the chosen can out of the arc, toward the camera and onto the sight line
    h.position.z += d.step * 6.0;
    h.position.x = lerp(h.position.x, shiftRow() + 3.2, d.step * .5);
    h.position.y += d.step * .25;
    d.can.rotation.y += d.step * .3;
    // the chosen can turns a little faster so it reads as "live"
    if (d.selected && pick > .5) d.can.rotation.y += Math.sin(t * .5) * .015;
  });

  // unselected cans sit back a little so the choice reads
  cans.forEach(h => {
    const d = h.userData;
    const dim = 1 - (1 - d.step) * pick * .35;
    d.can.userData.sleeve.material.color.setScalar(dim);
  });

  /* rim light tracks the selected can */
  const sel = cans.find(h => h.userData.selected) || hero;
  rim.position.set(sel.position.x - 2, 2.4, sel.position.z + 4);
  rim.intensity = lerp(30, 18, p);
}

/* ---------------------------------------------------------------- loop */
const clock = new THREE.Clock();
function frame() {
  const t = clock.getElapsedTime();
  p += (targetP - p) * .085;
  dragA += (dragT - dragA) * .1;
  updateScene(t);
  updateCamera(t);
  updateHover();
  updateUI();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}, { passive:true });

/* ----------------------------------------------------------------boot */
select(hero);
const loaderEl = document.querySelector('#loader');
const fillEl = document.querySelector('#loader-fill');
let lp = 0;
const li = setInterval(() => {
  lp = Math.min(100, lp + 7 + Math.random() * 13);
  fillEl.style.width = lp + '%';
  if (lp >= 100) {
    clearInterval(li);
    renderer.render(scene, camera);
    requestAnimationFrame(() => { loaderEl.classList.add('gone'); frame(); });
  }
}, 70);
