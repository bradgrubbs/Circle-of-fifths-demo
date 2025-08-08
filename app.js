// --- Simple Circle of Fifths web demo with audio (iPad/Safari friendly) ---
const canvas = document.getElementById('circle');
const ctx = canvas.getContext('2d', { alpha: false });

// Resize for device pixel ratio for crispness
function fitCanvas() {
  const s = Math.min(window.innerWidth, 900) - 24;
  const px = Math.max(320, s);
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = px + 'px';
  canvas.style.height = px + 'px';
  canvas.width = px * dpr;
  canvas.height = px * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}
window.addEventListener('resize', fitCanvas);

// Labels
const majors = ['C','G','D','A','E','B','F#','C#','G♭','D♭','A♭','E♭'];
const minors = ['Am','Em','Bm','F#m','C#m','G#m','D#m','A#m','Fm','Cm','Gm','Dm'];
const pitchOrder = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// Audio
let audio, unlocked = false;
function ensureAudio() {
  if (!audio) {
    audio = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audio.state === 'suspended') { audio.resume(); }
  unlocked = true;
}
function noteFreq(name) {
  const idx = pitchOrder.indexOf(name);
  const A4 = 440, A4idx = pitchOrder.indexOf('A') + 12 * 4; // midi-ish
  // map our 12 names to octave 4 (C4..B4 = 60..71)
  const base = 60 + idx; // treat C4=60
  const semisFromA4 = base - 69;
  return A4 * Math.pow(2, semisFromA4 / 12);
}
function playNote(name, dur = 0.6) {
  if (!unlocked) return;
  const f = noteFreq(name);
  const o = audio.createOscillator();
  const g = audio.createGain();
  o.type = 'sine';
  o.frequency.value = f;
  o.connect(g).connect(audio.destination);
  const now = audio.currentTime;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.28, now + 0.01);
  g.gain.linearRampToValueAtTime(0.0, now + dur);
  o.start(now);
  o.stop(now + dur + 0.05);
}

// Geometry
let rotation = 0; // radians for outer ring
const TAU = Math.PI * 2;
function draw() {
  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);
  const cx = w / 2, cy = h / 2;
  const outerR = Math.min(w, h) / 2 - 8;
  const innerR = outerR * 0.42;
  const holeR  = outerR * 0.18;

  ctx.fillStyle = '#0b1020';
  ctx.fillRect(0,0,w,h);

  const wedge = TAU / 12;

  // Outer ring (rotates)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  for (let i=0;i<12;i++){
    const start = i*wedge;
    ringSlice(cx, cy, outerR, innerR, start, wedge, '#1a2446', '#263a78');
    labelAt(cx, cy, (outerR+innerR)/2, start + wedge/2, majors[i], 18, 700);
  }
  ctx.restore();

  // Inner ring (fixed)
  for (let i=0;i<12;i++){
    const start = i*wedge;
    ringSlice(cx, cy, innerR, holeR, start, wedge, '#17203f', '#223263');
    labelAt(cx, cy, (innerR+holeR)/2, start + wedge/2, minors[i], 16, 600);
  }

  // center
  ctx.beginPath();
  ctx.arc(cx, cy, holeR, 0, TAU);
  ctx.fillStyle = '#0b1020';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.stroke();
}

function ringSlice(cx, cy, rOuter, rInner, start, sweep, c1, c2) {
  const g = ctx.createLinearGradient(cx, cy-rOuter, cx, cy+rOuter);
  g.addColorStop(0, c2);
  g.addColorStop(1, c1);
  ctx.beginPath();
  ctx.arc(cx, cy, rOuter, start, start+sweep);
  ctx.arc(cx, cy, rInner, start+sweep, start, true);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.stroke();
}

function labelAt(cx, cy, r, ang, text, size, weight) {
  ctx.save();
  ctx.translate(cx + r*Math.cos(ang), cy + r*Math.sin(ang));
  ctx.fillStyle = '#e5e7eb';
  ctx.font = `${weight} ${size}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// Input
let dragging = false, lastAngle = 0;
function posAngle(x,y) {
  const rect = canvas.getBoundingClientRect();
  const cx = rect.left + rect.width/2;
  const cy = rect.top + rect.height/2;
  return Math.atan2(y - cy, x - cx);
}
function distFromCenter(x,y) {
  const rect = canvas.getBoundingClientRect();
  const cx = rect.left + rect.width/2;
  const cy = rect.top + rect.height/2;
  return Math.hypot(x - cx, y - cy);
}

function handleStart(e){
  ensureAudio();
  const p = e.touches ? e.touches[0] : e;
  lastAngle = posAngle(p.clientX, p.clientY);
  dragging = true;
}
function handleMove(e){
  if (!dragging) return;
  const p = e.touches ? e.touches[0] : e;
  const a = posAngle(p.clientX, p.clientY);
  const delta = a - lastAngle;
  rotation += delta;
  lastAngle = a;
  draw();
}
function handleEnd(){ dragging = false; }

function handleTap(e){
  ensureAudio();
  const p = e.changedTouches ? e.changedTouches[0] : e;
  // map tap to sector + ring
  const rect = canvas.getBoundingClientRect();
  const cx = rect.left + rect.width/2;
  const cy = rect.top + rect.height/2;
  const x = p.clientX - cx, y = p.clientY - cy;
  const r = Math.hypot(x,y);
  const size = Math.min(rect.width, rect.height);
  const outerR = size/2 - 8;
  const innerR = outerR * 0.42;
  const holeR  = outerR * 0.18;

  let ang = Math.atan2(y, x) - rotation;
  ang = ((ang % TAU) + TAU) % TAU;
  const sector = Math.floor(ang / (TAU/12));
  if (r > innerR && r < outerR) {
    playNote(nameToPitch(majors[sector]));
  } else if (r > holeR && r <= innerR) {
    playNote(nameToPitch(minors[sector]));
  }
}
function nameToPitch(label){
  // Map labels to pitch names used in pitchOrder
  const map = {
    'C':'C','G':'G','D':'D','A':'A','E':'E','B':'B',
    'F#':'F#','C#':'C#','G♭':'F#','D♭':'C#','A♭':'G#','E♭':'D#',
    'Am':'A','Em':'E','Bm':'B','F#m':'F#','C#m':'C#','G#m':'G#',
    'D#m':'D#','A#m':'A#','Fm':'F','Cm':'C','Gm':'G','Dm':'D'
  };
  return map[label] || 'C';
}

// Mouse + touch events
canvas.addEventListener('mousedown', handleStart);
canvas.addEventListener('mousemove', handleMove);
window.addEventListener('mouseup', handleEnd);
canvas.addEventListener('touchstart', (e)=>{handleStart(e);}, {passive:true});
canvas.addEventListener('touchmove', (e)=>{handleMove(e);}, {passive:true});
canvas.addEventListener('touchend', (e)=>{handleEnd(e); handleTap(e);}, {passive:true});
canvas.addEventListener('click', handleTap);

fitCanvas();
