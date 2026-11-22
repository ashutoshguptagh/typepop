/* =====================================================
   SAVE / STORE
===================================================== */
const KEY = 'typepop.save.v1';
const DEFAULTS = { bestScore:0, bestWpm:0, bestAcc:0, games:0, popped:0, bestCombo:0, testWpm:0 };
let save;
try { save = Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(KEY) || '{}')); }
catch(e){ save = Object.assign({}, DEFAULTS); }
function persist(){ try { localStorage.setItem(KEY, JSON.stringify(save)); } catch(e){} }

/* =====================================================
   SOUND
===================================================== */
let soundOn = true, actx = null;
document.getElementById('soundBtn').onclick = function(){
  soundOn = !soundOn;
  this.textContent = soundOn ? '🔊' : '🔇';
};
function beep(freq, dur){
  if(!soundOn) return;
  try{
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.07, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + (dur || 0.08));
    o.connect(g); g.connect(actx.destination);
    o.start(); o.stop(actx.currentTime + (dur || 0.08));
  }catch(e){}
}

/* =====================================================
   ROUTER
===================================================== */
let currentPage = 'home';
const pages = document.querySelectorAll('.page');
const tabs  = document.querySelectorAll('.tab');

function go(name){
  currentPage = name;
  const mobileKeyboard = document.getElementById('mobileKeyboard');
  pages.forEach(p => p.classList.toggle('active', p.id === 'page-' + name));
  tabs.forEach(t => t.classList.toggle('active', t.dataset.page === name));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if(name !== 'game') stopGame();
  if(name === 'stats') renderStats();
  if(name === 'test') resetTest();
  if(name === 'home') renderHome();

  if((name === 'game' || name === 'test') && window.matchMedia('(max-width: 820px)').matches){
    setTimeout(() => mobileKeyboard?.focus({ preventScroll: true }), 80);
  } else {
    mobileKeyboard?.blur();
  }
}
tabs.forEach(t => t.onclick = () => go(t.dataset.page));
document.querySelectorAll('[data-goto]').forEach(el => el.onclick = () => go(el.dataset.goto));

/* =====================================================
   BUBBLE POP GAME
===================================================== */
const playArea      = document.getElementById('playArea');
const bufferDisplay = document.getElementById('bufferDisplay');
const startOverlay  = document.getElementById('startOverlay');
const overOverlay   = document.getElementById('overOverlay');
const hudScore = document.getElementById('hudScore');
const hudCombo = document.getElementById('hudCombo');
const hudLives = document.getElementById('hudLives');
const hudTime  = document.getElementById('hudTime');
const hudWpm   = document.getElementById('hudWpm');

const WORDS = [
  'pop','bop','zip','sky','fly','joy','win','sun','star','glow','jump','buzz','type','fast',
  'zoom','magic','happy','smile','spark','bubble','bounce','rocket','giggle','wizard','unicorn',
  'rainbow','keyboard','victory','amazing','super','power','shine','dream','level','cheer',
  'blast','cloud','float','quick','bright','wonder'
];
const COLORS = ['#7c5cff','#ff3d8b','#12b886','#1f9fd8','#f59f00'];

let bubbles = [], buffer = '', running = false, rafId = null, lastTs = 0;
let score = 0, combo = 0, bestCombo = 0, lives = 3, timeLeft = 60;
let charsTyped = 0, charsCorrect = 0, popped = 0, elapsed = 0;
let spawnTimer = 0, spawnEvery = 1.3, bubbleSpeed = 42;

function startGame(){
  bubbles.forEach(b => b.el.remove());
  bubbles = []; buffer = '';
  score = 0; combo = 0; bestCombo = 0; lives = 3; timeLeft = 60;
  charsTyped = 0; charsCorrect = 0; popped = 0; elapsed = 0;
  spawnTimer = 0.4; spawnEvery = 1.3; bubbleSpeed = 42; lastTs = 0;
  running = true;
  startOverlay.classList.add('hidden');
  overOverlay.classList.add('hidden');
  renderBuffer();
  updateHUD();
  rafId = requestAnimationFrame(loop);
}

function stopGame(){
  if(!running && !bubbles.length) { startOverlay.classList.remove('hidden'); overOverlay.classList.add('hidden'); return; }
  running = false;
  if(rafId) cancelAnimationFrame(rafId);
  bubbles.forEach(b => b.el.remove());
  bubbles = []; buffer = '';
  startOverlay.classList.remove('hidden');
  overOverlay.classList.add('hidden');
  renderBuffer();
  resetHUD();
}

function resetHUD(){
  hudScore.textContent = '0';
  hudCombo.textContent = '0';
  hudLives.textContent = '3';
  hudTime.textContent = '60';
  hudWpm.textContent = '0';
}

function updateHUD(){
  hudScore.textContent = score;
  hudCombo.textContent = combo;
  hudLives.textContent = lives;
  hudTime.textContent = Math.ceil(timeLeft);
  const mins = Math.max(elapsed, 3) / 60;
  hudWpm.textContent = Math.round((charsCorrect / 5) / mins) || 0;
}

function renderBuffer(){
  bufferDisplay.textContent = buffer || '…';
  bufferDisplay.classList.toggle('active', !!buffer);
}

function pickWord(){
  const active = new Set(bubbles.map(b => b.word));
  const pool = WORDS.filter(w => !active.has(w));
  const list = pool.length ? pool : WORDS;
  return list[Math.floor(Math.random() * list.length)];
}

function spawnBubble(){
  if(bubbles.length > 7) return;
  const word = pickWord();
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const el = document.createElement('div');
  el.className = 'bubble';
  el.innerHTML = '<div class="bubble-inner" style="--b:' + color + '">' + word + '</div>';
  playArea.appendChild(el);

  const w = el.offsetWidth || 90;
  const h = el.offsetHeight || 44;
  const areaW = playArea.clientWidth;
  const x = Math.max(10, Math.random() * Math.max(1, areaW - w - 20) + 10);
  const y = playArea.clientHeight + 12;
  el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';

  bubbles.push({
    el, word, x, y, w, h,
    speed: bubbleSpeed + Math.random() * 18
  });
}

function highlight(){
  bubbles.forEach(b => {
    const inner = b.el.firstElementChild;
    if(buffer && b.word.indexOf(buffer) === 0){
      b.el.classList.add('target');
      inner.innerHTML = '<span class="done">' + b.word.slice(0, buffer.length) + '</span>' + b.word.slice(buffer.length);
    } else {
      b.el.classList.remove('target');
      if(inner.textContent !== b.word) inner.textContent = b.word;
    }
  });
}

function floatScore(x, y, text){
  const d = document.createElement('div');
  d.className = 'float-score';
  d.textContent = text;
  d.style.left = x + 'px';
  d.style.top = y + 'px';
  playArea.appendChild(d);
  setTimeout(() => d.remove(), 900);
}

function popBubble(b){
  const i = bubbles.indexOf(b);
  if(i < 0) return;
  bubbles.splice(i, 1);

  const pts = b.word.length * 10 + combo * 5;
  score += pts;
  combo++;
  popped++;
  if(combo > bestCombo) bestCombo = combo;

  b.el.classList.add('pop');
  setTimeout(() => b.el.remove(), 320);
  floatScore(b.x + b.w / 2 - 12, b.y, '+' + pts);
  beep(520 + Math.min(combo, 12) * 45, 0.07);
  updateHUD();
}

function flashWrong(){
  playArea.classList.add('shake');
  setTimeout(() => playArea.classList.remove('shake'), 300);
}

function escapeBubble(b, i){
  b.el.remove();
  bubbles.splice(i, 1);
  lives--;
  combo = 0;
  buffer = '';
  renderBuffer();
  highlight();
  updateHUD();
  flashWrong();
  beep(150, 0.09);
  if(lives <= 0) endGame();
}

function loop(ts){
  if(!running) return;
  if(!lastTs) lastTs = ts;
  const dt = Math.min((ts - lastTs) / 1000, 0.05);
  lastTs = ts;

  elapsed += dt;
  timeLeft -= dt;

  if(timeLeft <= 0){
    timeLeft = 0;
    updateHUD();
    endGame();
    return;
  }

  bubbleSpeed = 42 + elapsed * 1.1;
  spawnEvery  = Math.max(0.55, 1.3 - elapsed * 0.013);

  spawnTimer -= dt;
  if(spawnTimer <= 0){
    spawnBubble();
    spawnTimer = spawnEvery;
  }

  for(let i = bubbles.length - 1; i >= 0; i--){
    const b = bubbles[i];
    b.y -= b.speed * dt;
    b.el.style.transform = 'translate3d(' + b.x + 'px,' + b.y + 'px,0)';
    if(b.y + b.h < 0) escapeBubble(b, i);
  }

  updateHUD();
  rafId = requestAnimationFrame(loop);
}

function handleGameKey(e){
  if(!running) return;
  if(e.key === 'Backspace'){
    e.preventDefault();
    buffer = buffer.slice(0, -1);
    renderBuffer(); highlight();
    return;
  }
  if(e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
  const ch = e.key.toLowerCase();
  if(!/[a-z]/.test(ch)) return;
  e.preventDefault();

  charsTyped++;
  const candidate = buffer + ch;
  let match = null;
  for(let i = 0; i < bubbles.length; i++){
    if(bubbles[i].word.indexOf(candidate) === 0){ match = bubbles[i]; break; }
  }

  if(!match){
    buffer = '';
    combo = 0;
    renderBuffer(); highlight(); updateHUD();
    flashWrong();
    beep(170, 0.06);
    return;
  }

  charsCorrect++;
  buffer = candidate;
  if(buffer === match.word){
    popBubble(match);
    buffer = '';
  }
  renderBuffer();
  highlight();
  updateHUD();
}

function endGame(){
  if(!running) return;
  running = false;
  if(rafId) cancelAnimationFrame(rafId);

  bubbles.forEach(b => b.el.remove());
  bubbles = [];
  buffer = '';
  renderBuffer();

  const mins = Math.max(elapsed, 1) / 60;
  const wpm = Math.round((charsCorrect / 5) / mins);
  const acc = charsTyped ? Math.round((charsCorrect / charsTyped) * 100) : 100;

  const isBest = score > save.bestScore;

  save.games++;
  save.popped += popped;
  if(score > save.bestScore) save.bestScore = score;
  if(wpm > save.bestWpm) save.bestWpm = wpm;
  if(acc > save.bestAcc) save.bestAcc = acc;
  if(bestCombo > save.bestCombo) save.bestCombo = bestCombo;
  persist();

  document.getElementById('resScore').textContent = score;
  document.getElementById('resWpm').textContent = wpm;
  document.getElementById('resAcc').textContent = acc + '%';
  document.getElementById('resCombo').textContent = bestCombo;

  const emoji = document.getElementById('overEmoji');
  const title = document.getElementById('overTitle');
  const msg   = document.getElementById('overMsg');

  if(isBest && score > 0){
    emoji.textContent = '🏆';
    title.textContent = 'New personal best!';
    msg.textContent = 'Poppi is doing a happy dance for you! 🎊';
    confetti(60);
  } else if(score >= 500){
    emoji.textContent = '🎉';
    title.textContent = 'Awesome popping!';
    msg.textContent = 'You are getting faster every round. Keep it up!';
  } else if(score >= 200){
    emoji.textContent = '😄';
    title.textContent = 'Nice work!';
    msg.textContent = 'Try to beat your best score next round.';
  } else {
    emoji.textContent = '🌱';
    title.textContent = 'Warming up!';
    msg.textContent = 'Every expert was once a beginner. One more round?';
  }

  updateHUD();
  overOverlay.classList.remove('hidden');
}

document.getElementById('startBtn').onclick = startGame;
document.getElementById('againBtn').onclick = startGame;

/* =====================================================
   TYPING TEST
===================================================== */
const TEST_TEXT = "The quick brown fox jumps over the lazy dog while a curious cat watches from a sunny windowsill. Typing well is not about speed alone; it is about rhythm, focus, and staying calm when the words get tricky. Practice a little every day and your fingers will learn the way.";

const testTextEl = document.getElementById('testText');
const tWpmEl   = document.getElementById('tWpm');
const tAccEl   = document.getElementById('tAcc');
const tTimeEl  = document.getElementById('tTime');
const testResultEl = document.getElementById('testResult');

let tChars = [], tPos = 0, tStart = 0, tTimer = null, tRunning = false, tTyped = 0, tCorrect = 0;

function buildTest(){
  testTextEl.innerHTML = '';
  tChars = [];
  for(let i = 0; i < TEST_TEXT.length; i++){
    const s = document.createElement('span');
    s.className = 'ch';
    s.textContent = TEST_TEXT[i];
    testTextEl.appendChild(s);
    tChars.push(s);
  }
  if(tChars[0]) tChars[0].classList.add('cur');
}

function resetTest(){
  clearInterval(tTimer); tTimer = null;
  tPos = 0; tStart = 0; tRunning = false; tTyped = 0; tCorrect = 0;
  buildTest();
  tWpmEl.textContent = '0';
  tAccEl.textContent = '100';
  tTimeEl.textContent = '0';
  testResultEl.classList.add('hidden');
}

function updateCursor(){
  for(let i = 0; i < tChars.length; i++){
    tChars[i].classList.remove('cur');
  }
  if(tChars[tPos]) tChars[tPos].classList.add('cur');
}

function tickTest(){
  const secs = (performance.now() - tStart) / 1000;
  tTimeEl.textContent = Math.floor(secs);
  const mins = Math.max(secs, 1) / 60;
  tWpmEl.textContent = Math.round((tCorrect / 5) / mins) || 0;
  tAccEl.textContent = tTyped ? Math.round((tCorrect / tTyped) * 100) : 100;
}

function handleTestKey(e){
  if(e.key === 'Backspace'){
    e.preventDefault();
    if(tPos > 0){
      tPos--;
      tChars[tPos].className = 'ch';
      updateCursor();
    }
    return;
  }
  if(e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
  e.preventDefault();
  if(tPos >= TEST_TEXT.length) return;

  if(!tRunning){
    tRunning = true;
    tStart = performance.now();
    tTimer = setInterval(tickTest, 120);
  }

  const ok = (e.key === TEST_TEXT[tPos]);
  tTyped++;
  if(ok) tCorrect++;
  tChars[tPos].className = 'ch ' + (ok ? 'ok' : 'bad');
  tPos++;
  updateCursor();

  if(tPos >= TEST_TEXT.length) finishTest();
}

function finishTest(){
  clearInterval(tTimer); tTimer = null;
  tRunning = false;
  const secs = Math.max((performance.now() - tStart) / 1000, 1);
  const mins = secs / 60;
  const wpm = Math.round((tCorrect / 5) / mins);
  const acc = tTyped ? Math.round((tCorrect / tTyped) * 100) : 100;

  document.getElementById('tFinalWpm').textContent = wpm;
  document.getElementById('tFinalAcc').textContent = acc + '%';
  testResultEl.classList.remove('hidden');

  const isBest = wpm > save.testWpm;
  document.getElementById('tMsg').textContent = isBest
    ? '🏆 New personal best WPM! Outstanding.'
    : 'Nice run! Restart and push for a higher WPM.';

  if(wpm > save.testWpm) save.testWpm = wpm;
  if(wpm > save.bestWpm) save.bestWpm = wpm;
  if(acc > save.bestAcc) save.bestAcc = acc;
  persist();

  if(isBest) confetti(40);
  beep(700, 0.1);
  setTimeout(() => beep(950, 0.14), 120);
}

document.getElementById('testReset').onclick = resetTest;

/* =====================================================
   GLOBAL KEY ROUTER
===================================================== */
const mobileKeyboard = document.getElementById('mobileKeyboard');
mobileKeyboard?.addEventListener('input', function(){
  mobileKeyboard.value = '';
});

window.addEventListener('keydown', function(e){
  if(currentPage === 'game'){
    if(!running && !overOverlay.classList.contains('hidden') && e.key === 'Enter'){
      e.preventDefault();
      startGame();
      return;
    }
    handleGameKey(e);
  } else if(currentPage === 'test'){
    handleTestKey(e);
  }
});

/* =====================================================
   STATS PAGE
===================================================== */
const BADGES = [
  { icon:'🥚', name:'First Pop',    desc:'Play your first game',  test: s => s.games >= 1 },
  { icon:'🫧', name:'Bubble Buster',desc:'Pop 50 bubbles',        test: s => s.popped >= 50 },
  { icon:'⚡', name:'Speedster',    desc:'Reach 40 WPM',          test: s => Math.max(s.bestWpm, s.testWpm) >= 40 },
  { icon:'🎯', name:'Sniper',       desc:'95% accuracy',          test: s => s.bestAcc >= 95 },
  { icon:'🔥', name:'Combo King',   desc:'20 combo streak',       test: s => s.bestCombo >= 20 },
  { icon:'🏆', name:'Score Hunter', desc:'Score 1000 points',     test: s => s.bestScore >= 1000 }
];

function renderStats(){
  document.getElementById('sBestScore').textContent = save.bestScore;
  document.getElementById('sBestWpm').textContent   = Math.max(save.bestWpm, save.testWpm);
  document.getElementById('sBestAcc').textContent   = save.bestAcc + '%';
  document.getElementById('sPopped').textContent    = save.popped;
  document.getElementById('sGames').textContent     = save.games;
  document.getElementById('sCombo').textContent     = save.bestCombo;

  const grid = document.getElementById('badgeGrid');
  grid.innerHTML = '';
  BADGES.forEach(function(b){
    const unlocked = b.test(save);
    const d = document.createElement('div');
    d.className = 'badge-card' + (unlocked ? '' : ' locked');
    d.innerHTML = '<span class="b-icon">' + (unlocked ? b.icon : '🔒') + '</span>' +
                  '<div class="b-name">' + b.name + '</div>' +
                  '<div class="b-desc">' + b.desc + '</div>';
    grid.appendChild(d);
  });

  const goal = 1000;
  const cur = Math.min(save.bestScore, goal);
  document.getElementById('goalBar').style.width = (cur / goal * 100) + '%';
  document.getElementById('goalLabel').textContent = 'Score ' + goal + ' points';
  document.getElementById('goalValue').textContent = cur + ' / ' + goal;
}

document.getElementById('resetBtn').onclick = function(){
  if(confirm('Reset all your stats and badges? This cannot be undone.')){
    save = Object.assign({}, DEFAULTS);
    persist();
    renderStats();
    renderHome();
    beep(300, 0.12);
  }
};

/* =====================================================
   HOME STATS
===================================================== */
function renderHome(){
  document.getElementById('homeBest').textContent  = save.bestScore;
  document.getElementById('homeWpm').textContent   = Math.max(save.bestWpm, save.testWpm);
  document.getElementById('homeGames').textContent = save.games;
}

const PHRASES = [
  'Let\'s type! ✨',
  'Pop pop pop! 🫧',
  'You got this! 💪',
  'Speed mode ON ⚡',
  'Ready, set, type!'
];
let phraseIdx = 0;
setInterval(function(){
  const el = document.getElementById('speechBubble');
  if(!el) return;
  phraseIdx = (phraseIdx + 1) % PHRASES.length;
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
  el.textContent = PHRASES[phraseIdx];
}, 3200);

/* =====================================================
   CONFETTI
===================================================== */
function confetti(n){
  const colors = ['#7c5cff','#ff5ca8','#25d3a2','#ffc93c','#3fc1f0'];
  for(let i = 0; i < (n || 40); i++){
    const d = document.createElement('div');
    d.className = 'confetti';
    d.style.left = (Math.random() * 100) + 'vw';
    d.style.background = colors[i % colors.length];
    d.style.animationDelay = (Math.random() * 0.5) + 's';
    d.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
    document.body.appendChild(d);
    setTimeout(function(){ d.remove(); }, 2800);
  }
}

/* =====================================================
   INIT
===================================================== */
renderHome();
resetTest();
resetHUD();