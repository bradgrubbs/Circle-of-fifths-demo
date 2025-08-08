// Minimal chord player using WebAudio; supports majors/minors/7ths like C, Am, G7
let ctx;
function audio() { if (!ctx) ctx = new (window.AudioContext||window.webkitAudioContext)(); if (ctx.state==='suspended') ctx.resume(); return ctx; }
const order = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function fOf(n){ // map note name to C4..B4
  const A4=440; // midi 69
  const base=60+order.indexOf(n); // C4..B4
  const sem=base-69;
  return A4*Math.pow(2, sem/12);
}
function playChord(sym){
  const ac = audio();
  const root = sym.replace(/m|7/gi,'');
  const minor = /m(?!aj)/i.test(sym);
  const has7 = /7/.test(sym);
  const idx = order.indexOf(root);
  if (idx<0) return;
  const notes = [ order[idx], order[(idx+(minor?3:4))%12], order[(idx+7)%12] ];
  if (has7) notes.push(order[(idx+10)%12]);
  const now = ac.currentTime;
  notes.forEach((n,i)=>{
    const o=ac.createOscillator(), g=ac.createGain();
    o.type='sine'; o.frequency.value=fOf(n);
    o.connect(g).connect(ac.destination);
    const t=now + i*0.04;
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(0.28,t+0.03);
    g.gain.linearRampToValueAtTime(0, t+0.6);
    o.start(t); o.stop(t+0.65);
  });
}

const input = document.getElementById('chordInput');
const row = document.getElementById('row');
document.getElementById('addBtn').onclick = ()=>{
  const v = (input.value||'').trim();
  if(!v) return;
  addTile(v);
  input.value='';
};
document.getElementById('clearBtn').onclick = ()=> row.innerHTML='';
function addTile(sym){
  const div = document.createElement('button');
  div.className='tile';
  div.textContent = sym;
  div.onclick = ()=> { audio(); playChord(sym); };
  row.appendChild(div);
}
// starter examples (you can delete these)
['C','Am','F','G7'].forEach(addTile);
