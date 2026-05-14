(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const rand = (min, max) => Math.random() * (max - min) + min;
  const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const SAVE_KEY = 'emxCoreDefense_v1';

  const MAP_W = 900;
  const MAP_H = 1000;
  const MAX_WAVES = 20;

  const canvas = $('gameCanvas');
  const ctx = canvas.getContext('2d');

  const bgImg = new Image();
  bgImg.src = 'assets/emx-bg.png';

  const path = [
    { x: 70, y: 110 },
    { x: 740, y: 110 },
    { x: 740, y: 245 },
    { x: 185, y: 245 },
    { x: 185, y: 420 },
    { x: 775, y: 420 },
    { x: 775, y: 610 },
    { x: 115, y: 610 },
    { x: 115, y: 815 },
    { x: 830, y: 815 }
  ];

  const towerTypes = {
    flame: {
      key: 'flame', name: 'Flame Turret', icon: '🔥', cost: 90, range: 150, fireRate: 0.75, damage: 16,
      color: '#ff6b21', desc: 'Burns enemies over time.', effect: 'burn'
    },
    tesla: {
      key: 'tesla', name: 'Tesla Coil', icon: '⚡', cost: 125, range: 165, fireRate: 0.95, damage: 18,
      color: '#60dfff', desc: 'Chains electric damage.', effect: 'chain'
    },
    cryo: {
      key: 'cryo', name: 'Cryo Blaster', icon: '❄️', cost: 110, range: 145, fireRate: 0.85, damage: 11,
      color: '#93e8ff', desc: 'Slows fast enemies.', effect: 'slow'
    },
    venom: {
      key: 'venom', name: 'Venom Sprayer', icon: '☠️', cost: 100, range: 135, fireRate: 0.65, damage: 10,
      color: '#a8ff24', desc: 'Poison stacks damage.', effect: 'poison'
    },
    rocket: {
      key: 'rocket', name: 'Rocket Node', icon: '🚀', cost: 155, range: 180, fireRate: 1.35, damage: 34,
      color: '#ff4f7a', desc: 'Splash damage explosions.', effect: 'splash'
    },
    shadow: {
      key: 'shadow', name: 'Shadow Sniper', icon: '🌑', cost: 180, range: 260, fireRate: 1.6, damage: 52,
      color: '#d14cff', desc: 'Long range boss damage.', effect: 'pierce'
    }
  };

  const enemyBase = {
    glitch: { name: 'Glitch Orb', icon: '🟣', hp: 45, speed: 72, reward: 9, color: '#c34cff' },
    fast: { name: 'Fast Bug', icon: '🟢', hp: 32, speed: 120, reward: 10, color: '#82ff2e' },
    shield: { name: 'Shield Drone', icon: '🛡️', hp: 75, armor: 5, speed: 62, reward: 13, color: '#73d7ff' },
    split: { name: 'Split Virus', icon: '🧬', hp: 68, speed: 66, reward: 16, color: '#ff43f2', split: true },
    tank: { name: 'EMP Tank', icon: '🔋', hp: 150, armor: 8, speed: 38, reward: 24, color: '#ffd65a' },
    boss: { name: 'Boss Core', icon: '👁️', hp: 500, armor: 10, speed: 35, reward: 90, color: '#ff2c79', boss: true }
  };

  let game;
  let lastTime = 0;
  let audioUnlocked = false;
  const audioFiles = {};

  function makeGame() {
    return {
      screen: 'menu',
      running: false,
      paused: false,
      speed: 1,
      wave: 0,
      waveActive: false,
      lives: 20,
      coins: 380,
      score: 0,
      selectedType: null,
      selectedTowerId: null,
      towers: [],
      enemies: [],
      projectiles: [],
      effects: [],
      floating: [],
      spawnQueue: [],
      spawnTimer: 0,
      nextTowerId: 1,
      nextEnemyId: 1,
      pointer: { x: 0, y: 0, active: false },
      gameOver: false,
      victory: false
    };
  }

  function loadAudio() {
    ['tap', 'place', 'shoot', 'blast', 'coin', 'wave', 'win', 'lose'].forEach((name) => {
      const a = new Audio(`assets/sfx/${name}.wav`);
      a.preload = 'auto';
      audioFiles[name] = a;
    });
  }

  function playSound(name) {
    if (!audioUnlocked) return;
    const base = audioFiles[name] || audioFiles.tap;
    if (!base) return;
    try {
      const s = base.cloneNode();
      s.volume = 0.28;
      s.play().catch(() => {});
    } catch (_) {}
  }

  function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    Object.values(audioFiles).forEach((a) => {
      try { a.load(); } catch (_) {}
    });
  }

  function showScreen(name) {
    game.screen = name;
    $('menuScreen').classList.toggle('active', name === 'menu');
    $('gameScreen').classList.toggle('active', name === 'game');
    updateUI();
  }

  function showToast(text, ms = 1600) {
    const t = $('toast');
    t.textContent = text;
    t.classList.remove('hidden');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => t.classList.add('hidden'), ms);
  }

  function loadBest() {
    const raw = localStorage.getItem(SAVE_KEY);
    try {
      const data = raw ? JSON.parse(raw) : {};
      $('bestWaveText').textContent = data.bestWave || 0;
      $('bestScoreText').textContent = data.bestScore || 0;
    } catch (_) {
      $('bestWaveText').textContent = 0;
      $('bestScoreText').textContent = 0;
    }
  }

  function saveBest() {
    const raw = localStorage.getItem(SAVE_KEY);
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch (_) {}
    data.bestWave = Math.max(data.bestWave || 0, game.wave || 0);
    data.bestScore = Math.max(data.bestScore || 0, game.score || 0);
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    loadBest();
  }

  function resetBest() {
    localStorage.removeItem(SAVE_KEY);
    loadBest();
    openModal('<h2>Best scores reset.</h2><p>Your EMX defense records were cleared.</p>');
  }

  function buildTowerButtons() {
    const wrap = $('towerButtons');
    wrap.innerHTML = '';
    Object.values(towerTypes).forEach((t) => {
      const btn = document.createElement('button');
      btn.className = 'tower-btn';
      btn.dataset.tower = t.key;
      btn.innerHTML = `<strong>${t.icon} ${t.name}</strong><small>${t.desc}<br>${t.cost} coins</small>`;
      btn.addEventListener('click', () => {
        unlockAudio();
        playSound('tap');
        selectTowerType(t.key);
      });
      wrap.appendChild(btn);
    });
  }

  function selectTowerType(key) {
    game.selectedType = game.selectedType === key ? null : key;
    game.selectedTowerId = null;
    $('towerPanel').classList.add('hidden');
    updateTowerButtonState();
    updateStatusText();
  }

  function updateTowerButtonState() {
    document.querySelectorAll('.tower-btn').forEach((btn) => {
      const key = btn.dataset.tower;
      btn.classList.toggle('selected', game.selectedType === key);
      const t = towerTypes[key];
      btn.disabled = game.coins < t.cost;
    });
  }

  function updateStatusText() {
    if (game.gameOver) return;
    if (game.victory) return;
    if (game.selectedType) {
      const t = towerTypes[game.selectedType];
      $('statusText').textContent = `${t.icon} ${t.name} selected. Tap an empty spot away from the path.`;
    } else if (game.selectedTowerId) {
      const tower = getSelectedTower();
      if (tower) $('statusText').textContent = `${towerTypes[tower.type].name} selected. Upgrade or sell it.`;
    } else if (!game.waveActive) {
      $('statusText').textContent = 'Build towers, then tap Start Wave.';
    } else {
      $('statusText').textContent = 'Wave running — towers attack automatically.';
    }
  }

  function startNewGame() {
    unlockAudio();
    game = makeGame();
    game.running = true;
    game.screen = 'game';
    showScreen('game');
    showToast('Protect the EMX Core. Place towers beside the neon path.');
    playSound('wave');
  }

  function startWave() {
    unlockAudio();
    if (game.waveActive || game.gameOver || game.victory) return;
    if (game.wave >= MAX_WAVES) return;
    game.wave += 1;
    game.waveActive = true;
    game.spawnQueue = createWave(game.wave);
    game.spawnTimer = 0;
    game.selectedTowerId = null;
    $('towerPanel').classList.add('hidden');
    showToast(game.wave % 5 === 0 ? `Boss Wave ${game.wave}!` : `Wave ${game.wave} started!`);
    playSound(game.wave % 5 === 0 ? 'blast' : 'wave');
    updateUI();
  }

  function createWave(wave) {
    const queue = [];
    const add = (type, count, gap) => {
      for (let i = 0; i < count; i++) queue.push({ type, gap });
    };
    const base = 7 + wave;
    add('glitch', base, 0.48);
    if (wave >= 2) add('fast', Math.floor(2 + wave * 0.7), 0.42);
    if (wave >= 4) add('shield', Math.floor(1 + wave * 0.45), 0.62);
    if (wave >= 7) add('split', Math.floor(1 + wave * 0.35), 0.72);
    if (wave >= 10) add('tank', Math.floor(1 + wave * 0.18), 0.9);
    if (wave % 5 === 0) add('boss', 1, 1.5);
    return queue;
  }

  function spawnEnemy(type, waveScale = game.wave) {
    const base = enemyBase[type];
    const bossScale = base.boss ? 1 + waveScale * 0.22 : 1 + waveScale * 0.12;
    const enemy = {
      id: game.nextEnemyId++,
      type,
      name: base.name,
      icon: base.icon,
      color: base.color,
      x: path[0].x,
      y: path[0].y,
      seg: 0,
      progress: 0,
      hp: Math.round(base.hp * bossScale),
      maxHp: Math.round(base.hp * bossScale),
      speed: base.speed * (base.boss ? 0.95 : 1),
      armor: base.armor || 0,
      reward: Math.round(base.reward * (1 + waveScale * 0.08)),
      split: base.split,
      boss: base.boss,
      burn: 0,
      burnDps: 0,
      poison: 0,
      poisonDps: 0,
      slow: 0,
      alive: true,
      distanceTravelled: 0
    };
    game.enemies.push(enemy);
  }

  function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const rawDt = Math.min(0.05, (timestamp - lastTime) / 1000);
    lastTime = timestamp;
    const dt = rawDt * (game?.speed || 1);
    if (game && game.screen === 'game' && game.running && !game.paused && !game.gameOver && !game.victory) {
      updateGame(dt);
    }
    draw();
    requestAnimationFrame(gameLoop);
  }

  function updateGame(dt) {
    updateSpawning(dt);
    updateEnemies(dt);
    updateTowers(dt);
    updateProjectiles(dt);
    updateEffects(dt);
    checkWaveComplete();
    updateUI(false);
  }

  function updateSpawning(dt) {
    if (!game.waveActive || game.spawnQueue.length === 0) return;
    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0) {
      const item = game.spawnQueue.shift();
      spawnEnemy(item.type);
      game.spawnTimer = item.gap;
    }
  }

  function updateEnemies(dt) {
    for (const e of game.enemies) {
      if (!e.alive) continue;
      if (e.burn > 0) { e.hp -= e.burnDps * dt; e.burn -= dt; }
      if (e.poison > 0) { e.hp -= e.poisonDps * dt; e.poison -= dt; }
      if (e.hp <= 0) {
        killEnemy(e);
        continue;
      }
      const slowFactor = e.slow > 0 ? 0.52 : 1;
      e.slow = Math.max(0, e.slow - dt);
      moveAlongPath(e, e.speed * slowFactor * dt);
    }
    game.enemies = game.enemies.filter((e) => e.alive);
  }

  function moveAlongPath(e, distance) {
    while (distance > 0 && e.alive) {
      const a = path[e.seg];
      const b = path[e.seg + 1];
      if (!b) {
        e.alive = false;
        game.lives -= e.boss ? 5 : 1;
        addFloating('CORE HIT', e.x, e.y, '#ff4f7a');
        playSound('blast');
        if (game.lives <= 0) endGame(false);
        return;
      }
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      const remaining = segLen - e.progress;
      const step = Math.min(distance, remaining);
      e.progress += step;
      e.distanceTravelled += step;
      const t = e.progress / segLen;
      e.x = a.x + (b.x - a.x) * t;
      e.y = a.y + (b.y - a.y) * t;
      distance -= step;
      if (e.progress >= segLen - 0.001) {
        e.seg += 1;
        e.progress = 0;
      }
    }
  }

  function killEnemy(e) {
    if (!e.alive) return;
    e.alive = false;
    game.coins += e.reward;
    game.score += e.boss ? 500 + e.reward : 40 + e.reward;
    addExplosion(e.x, e.y, e.color, e.boss ? 42 : 22);
    addFloating(`+${e.reward}`, e.x, e.y, '#a8ff24');
    playSound(e.boss ? 'win' : 'coin');
    if (e.split && !e.boss) {
      for (let i = 0; i < 2; i++) {
        const child = createSplitChild(e);
        game.enemies.push(child);
      }
    }
  }

  function createSplitChild(parent) {
    const b = enemyBase.glitch;
    return {
      id: game.nextEnemyId++, type: 'glitch', name: 'Mini Glitch', icon: '•', color: '#ff8cff',
      x: parent.x + rand(-10, 10), y: parent.y + rand(-10, 10), seg: parent.seg, progress: parent.progress,
      hp: Math.max(18, Math.round(parent.maxHp * 0.26)), maxHp: Math.max(18, Math.round(parent.maxHp * 0.26)),
      speed: b.speed * 1.18, armor: 0, reward: 5, alive: true, distanceTravelled: parent.distanceTravelled,
      burn: 0, burnDps: 0, poison: 0, poisonDps: 0, slow: 0
    };
  }

  function updateTowers(dt) {
    for (const t of game.towers) {
      t.cooldown -= dt;
      if (t.cooldown > 0) continue;
      const target = findTarget(t);
      if (!target) continue;
      fireTower(t, target);
      const data = towerStats(t);
      t.cooldown = 1 / data.fireRate;
    }
  }

  function towerStats(tower) {
    const base = towerTypes[tower.type];
    const levelBoost = tower.level - 1;
    return {
      range: base.range + levelBoost * 22,
      damage: Math.round(base.damage * (1 + levelBoost * 0.55)),
      fireRate: base.fireRate * (1 + levelBoost * 0.22),
      color: base.color,
      effect: base.effect,
      name: base.name,
      icon: base.icon
    };
  }

  function findTarget(tower) {
    const s = towerStats(tower);
    let best = null;
    let bestDist = -Infinity;
    for (const e of game.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - tower.x, e.y - tower.y);
      if (d <= s.range && e.distanceTravelled > bestDist) {
        best = e;
        bestDist = e.distanceTravelled;
      }
    }
    return best;
  }

  function fireTower(tower, target) {
    const s = towerStats(tower);
    playSound(tower.type === 'rocket' ? 'blast' : 'shoot');
    if (tower.type === 'tesla') {
      instantHit(tower, target, s);
      chainLightning(tower, target, s);
      return;
    }
    game.projectiles.push({
      x: tower.x, y: tower.y, targetId: target.id, speed: tower.type === 'rocket' ? 420 : 640,
      damage: s.damage, color: s.color, effect: s.effect, radius: tower.type === 'rocket' ? 9 : 6,
      type: tower.type
    });
  }

  function instantHit(tower, target, s) {
    damageEnemy(target, s.damage, s.effect);
    game.effects.push({ type: 'beam', x1: tower.x, y1: tower.y, x2: target.x, y2: target.y, color: s.color, life: 0.18, maxLife: 0.18 });
  }

  function chainLightning(tower, first, s) {
    const chained = [first.id];
    let current = first;
    for (let i = 0; i < 2; i++) {
      let next = null;
      let bestD = Infinity;
      for (const e of game.enemies) {
        if (!e.alive || chained.includes(e.id)) continue;
        const d = Math.hypot(e.x - current.x, e.y - current.y);
        if (d < 135 && d < bestD) { next = e; bestD = d; }
      }
      if (!next) break;
      chained.push(next.id);
      damageEnemy(next, Math.round(s.damage * 0.55), s.effect);
      game.effects.push({ type: 'beam', x1: current.x, y1: current.y, x2: next.x, y2: next.y, color: s.color, life: 0.18, maxLife: 0.18 });
      current = next;
    }
  }

  function updateProjectiles(dt) {
    for (const p of game.projectiles) {
      const target = game.enemies.find((e) => e.id === p.targetId && e.alive);
      if (!target) { p.dead = true; continue; }
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < p.speed * dt || d < 10) {
        impactProjectile(p, target);
        p.dead = true;
      } else {
        p.x += (dx / d) * p.speed * dt;
        p.y += (dy / d) * p.speed * dt;
      }
    }
    game.projectiles = game.projectiles.filter((p) => !p.dead);
  }

  function impactProjectile(p, target) {
    if (p.effect === 'splash') {
      addExplosion(target.x, target.y, p.color, 34);
      for (const e of game.enemies) {
        if (!e.alive) continue;
        const d = Math.hypot(e.x - target.x, e.y - target.y);
        if (d <= 75) damageEnemy(e, Math.round(p.damage * (1 - d / 110)), p.effect);
      }
    } else {
      damageEnemy(target, p.damage, p.effect);
      addSpark(target.x, target.y, p.color);
    }
  }

  function damageEnemy(enemy, amount, effect) {
    if (!enemy || !enemy.alive) return;
    let real = Math.max(1, Math.round(amount - enemy.armor));
    if (effect === 'pierce') real = Math.max(1, Math.round(amount - enemy.armor * 0.25));
    enemy.hp -= real;
    if (effect === 'burn') { enemy.burn = Math.max(enemy.burn, 3.0); enemy.burnDps = Math.max(enemy.burnDps, 7); }
    if (effect === 'poison') { enemy.poison = Math.max(enemy.poison, 4.0); enemy.poisonDps = Math.max(enemy.poisonDps, 5); }
    if (effect === 'slow') { enemy.slow = Math.max(enemy.slow, 2.2); }
    if (enemy.hp <= 0) killEnemy(enemy);
  }

  function updateEffects(dt) {
    for (const e of game.effects) e.life -= dt;
    game.effects = game.effects.filter((e) => e.life > 0);
    for (const f of game.floating) { f.life -= dt; f.y -= 30 * dt; }
    game.floating = game.floating.filter((f) => f.life > 0);
  }

  function checkWaveComplete() {
    if (!game.waveActive) return;
    if (game.spawnQueue.length === 0 && game.enemies.length === 0) {
      game.waveActive = false;
      game.coins += 45 + game.wave * 5;
      game.score += 100 + game.wave * 25;
      showToast(`Wave ${game.wave} cleared! Bonus coins added.`);
      playSound('win');
      saveBest();
      if (game.wave >= MAX_WAVES) endGame(true);
    }
  }

  function endGame(win) {
    if (game.gameOver || game.victory) return;
    game.gameOver = !win;
    game.victory = win;
    game.waveActive = false;
    saveBest();
    playSound(win ? 'win' : 'lose');
    const title = win ? 'EMX Core Saved!' : 'Core Breached!';
    const body = `
      <h2 class="result-title">${win ? '🏆' : '💥'} ${title}</h2>
      <p>You reached wave <strong>${game.wave}</strong> with score <strong>${game.score}</strong>.</p>
      <div class="guide-grid">
        <button class="big-btn primary" id="modalPlayAgain">Play Again</button>
        <button class="big-btn" id="modalMenuBtn">Main Menu</button>
      </div>`;
    openModal(body);
    setTimeout(() => {
      const again = $('modalPlayAgain');
      const menu = $('modalMenuBtn');
      if (again) again.onclick = () => { closeModal(); startNewGame(); };
      if (menu) menu.onclick = () => { closeModal(); showScreen('menu'); };
    }, 0);
  }

  function canPlaceTower(x, y) {
    if (x < 45 || y < 45 || x > MAP_W - 45 || y > MAP_H - 45) return { ok: false, reason: 'Too close to edge.' };
    const pd = distanceToPath(x, y);
    if (pd < 54) return { ok: false, reason: 'Too close to enemy path.' };
    for (const t of game.towers) {
      if (Math.hypot(x - t.x, y - t.y) < 64) return { ok: false, reason: 'Too close to another tower.' };
    }
    return { ok: true };
  }

  function placeTower(x, y) {
    const type = game.selectedType;
    if (!type) return;
    const data = towerTypes[type];
    if (game.coins < data.cost) { showToast('Not enough coins.'); return; }
    const check = canPlaceTower(x, y);
    if (!check.ok) { showToast(check.reason); return; }
    game.towers.push({ id: game.nextTowerId++, type, x, y, level: 1, cooldown: 0, spent: data.cost });
    game.coins -= data.cost;
    game.selectedType = null;
    addSpark(x, y, data.color);
    showToast(`${data.name} placed.`);
    playSound('place');
    updateUI();
  }

  function selectTowerAt(x, y) {
    let best = null;
    let bestD = Infinity;
    for (const t of game.towers) {
      const d = Math.hypot(x - t.x, y - t.y);
      if (d < 38 && d < bestD) { best = t; bestD = d; }
    }
    if (!best) {
      game.selectedTowerId = null;
      $('towerPanel').classList.add('hidden');
      return false;
    }
    game.selectedType = null;
    game.selectedTowerId = best.id;
    showTowerPanel();
    updateUI();
    return true;
  }

  function getSelectedTower() {
    return game.towers.find((t) => t.id === game.selectedTowerId);
  }

  function showTowerPanel() {
    const t = getSelectedTower();
    if (!t) { $('towerPanel').classList.add('hidden'); return; }
    const data = towerTypes[t.type];
    const s = towerStats(t);
    const upgradeCost = getUpgradeCost(t);
    $('selectedTowerName').textContent = `${data.icon} ${data.name} L${t.level}`;
    $('selectedTowerStats').textContent = `Damage ${s.damage} • Range ${s.range} • Fire rate ${s.fireRate.toFixed(1)}/s • Sell ${getSellValue(t)} coins`;
    $('upgradeTowerBtn').textContent = t.level >= 3 ? 'Max Level' : `Upgrade ${upgradeCost}`;
    $('upgradeTowerBtn').disabled = t.level >= 3 || game.coins < upgradeCost;
    $('towerPanel').classList.remove('hidden');
  }

  function getUpgradeCost(t) {
    return Math.round(towerTypes[t.type].cost * (0.82 + t.level * 0.65));
  }

  function getSellValue(t) {
    return Math.round(t.spent * 0.62);
  }

  function upgradeSelectedTower() {
    unlockAudio();
    const t = getSelectedTower();
    if (!t || t.level >= 3) return;
    const cost = getUpgradeCost(t);
    if (game.coins < cost) { showToast('Not enough coins for upgrade.'); return; }
    game.coins -= cost;
    t.spent += cost;
    t.level += 1;
    addExplosion(t.x, t.y, towerTypes[t.type].color, 28);
    showToast(`${towerTypes[t.type].name} upgraded to L${t.level}.`);
    playSound('place');
    updateUI();
    showTowerPanel();
  }

  function sellSelectedTower() {
    unlockAudio();
    const t = getSelectedTower();
    if (!t) return;
    const sell = getSellValue(t);
    game.towers = game.towers.filter((tower) => tower.id !== t.id);
    game.coins += sell;
    game.selectedTowerId = null;
    $('towerPanel').classList.add('hidden');
    showToast(`Tower sold for ${sell} coins.`);
    playSound('coin');
    updateUI();
  }

  function getCanvasPoint(evt) {
    const rect = canvas.getBoundingClientRect();
    const x = (evt.clientX - rect.left) * (MAP_W / rect.width);
    const y = (evt.clientY - rect.top) * (MAP_H / rect.height);
    return { x: clamp(x, 0, MAP_W), y: clamp(y, 0, MAP_H) };
  }

  function onCanvasPointerDown(evt) {
    evt.preventDefault();
    unlockAudio();
    const p = getCanvasPoint(evt);
    game.pointer = { x: p.x, y: p.y, active: true };
  }

  function onCanvasPointerMove(evt) {
    if (!game.pointer.active) return;
    const p = getCanvasPoint(evt);
    game.pointer.x = p.x;
    game.pointer.y = p.y;
  }

  function onCanvasPointerUp(evt) {
    evt.preventDefault();
    const p = getCanvasPoint(evt);
    game.pointer = { x: p.x, y: p.y, active: false };
    if (game.gameOver || game.victory) return;
    if (game.selectedType) placeTower(p.x, p.y);
    else selectTowerAt(p.x, p.y);
  }

  function distanceToPath(x, y) {
    let min = Infinity;
    for (let i = 0; i < path.length - 1; i++) {
      min = Math.min(min, distanceToSegment(x, y, path[i], path[i + 1]));
    }
    return min;
  }

  function distanceToSegment(px, py, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq === 0 ? 0 : clamp(((px - a.x) * dx + (py - a.y) * dy) / lenSq, 0, 1);
    const x = a.x + t * dx;
    const y = a.y + t * dy;
    return Math.hypot(px - x, py - y);
  }

  function addSpark(x, y, color) {
    for (let i = 0; i < 10; i++) {
      game.effects.push({ type: 'spark', x, y, vx: rand(-80, 80), vy: rand(-80, 80), color, life: rand(0.28, 0.5), maxLife: 0.5 });
    }
  }

  function addExplosion(x, y, color, radius) {
    game.effects.push({ type: 'explosion', x, y, radius, color, life: 0.35, maxLife: 0.35 });
    for (let i = 0; i < 16; i++) {
      game.effects.push({ type: 'spark', x, y, vx: rand(-140, 140), vy: rand(-140, 140), color, life: rand(0.28, 0.6), maxLife: 0.6 });
    }
  }

  function addFloating(text, x, y, color) {
    game.floating.push({ text, x, y, color, life: 1, maxLife: 1 });
  }

  function draw() {
    if (!game) return;
    ctx.clearRect(0, 0, MAP_W, MAP_H);
    drawBackground();
    drawPath();
    drawPlacementPreview();
    drawTowers();
    drawEnemies();
    drawProjectiles();
    drawEffects();
    drawFloating();
    drawCore();
    if (game.paused && game.screen === 'game') drawCenterText('PAUSED', 'Tap Pause to resume');
  }

  function drawBackground() {
    ctx.fillStyle = '#050507';
    ctx.fillRect(0, 0, MAP_W, MAP_H);
    if (bgImg.complete) {
      ctx.save();
      ctx.globalAlpha = 0.24;
      ctx.drawImage(bgImg, 0, 0, MAP_W, MAP_H);
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#a8ff24';
    for (let x = 0; x < MAP_W; x += 90) line(x, 0, x, MAP_H);
    ctx.strokeStyle = '#ff38f8';
    for (let y = 0; y < MAP_H; y += 90) line(0, y, MAP_W, y);
    ctx.restore();
    // Circuit dots
    ctx.save();
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 42; i++) {
      const x = (i * 211) % MAP_W;
      const y = (i * 137) % MAP_H;
      ctx.fillStyle = i % 2 ? '#ff38f8' : '#a8ff24';
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawPath() {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 28;
    ctx.shadowColor = '#a8ff24';
    ctx.strokeStyle = 'rgba(168,255,36,.30)';
    ctx.lineWidth = 74;
    drawPathLine();
    ctx.shadowColor = '#ff38f8';
    ctx.strokeStyle = 'rgba(255,56,248,.23)';
    ctx.lineWidth = 52;
    drawPathLine();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,.14)';
    ctx.lineWidth = 32;
    drawPathLine();
    ctx.strokeStyle = 'rgba(5,5,10,.86)';
    ctx.lineWidth = 26;
    drawPathLine();
    ctx.strokeStyle = 'rgba(168,255,36,.9)';
    ctx.lineWidth = 3;
    drawPathLine();
    ctx.strokeStyle = 'rgba(255,56,248,.85)';
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 15]);
    drawPathLine();
    ctx.restore();
  }

  function drawPathLine() {
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();
  }

  function drawCore() {
    const start = path[0];
    const end = path[path.length - 1];
    drawNode(start.x, start.y, '#a8ff24', 'IN');
    drawNode(end.x, end.y, '#ff38f8', 'CORE');
  }

  function drawNode(x, y, color, label) {
    ctx.save();
    ctx.shadowBlur = 25; ctx.shadowColor = color;
    ctx.fillStyle = '#050508';
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x, y, 34, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = '900 16px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y);
    ctx.restore();
  }

  function drawPlacementPreview() {
    if (!game.selectedType || !game.pointer.active) return;
    const t = towerTypes[game.selectedType];
    const check = canPlaceTower(game.pointer.x, game.pointer.y);
    ctx.save();
    ctx.globalAlpha = .7;
    ctx.strokeStyle = check.ok ? t.color : '#ff4f7a';
    ctx.fillStyle = check.ok ? 'rgba(168,255,36,.10)' : 'rgba(255,79,122,.10)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(game.pointer.x, game.pointer.y, t.range, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = t.color;
    ctx.beginPath(); ctx.arc(game.pointer.x, game.pointer.y, 28, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawTowers() {
    for (const t of game.towers) {
      const data = towerTypes[t.type];
      const s = towerStats(t);
      const selected = t.id === game.selectedTowerId;
      ctx.save();
      if (selected) {
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.arc(t.x, t.y, s.range, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = selected ? 30 : 16;
      ctx.shadowColor = s.color;
      ctx.fillStyle = '#0d0d18';
      ctx.strokeStyle = s.color;
      ctx.lineWidth = selected ? 5 : 3;
      ctx.beginPath(); ctx.arc(t.x, t.y, 31, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.font = '26px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(data.icon, t.x, t.y + 1);
      ctx.font = '900 13px Arial'; ctx.fillStyle = '#fff';
      ctx.fillText(`L${t.level}`, t.x, t.y + 45);
      ctx.restore();
    }
  }

  function drawEnemies() {
    for (const e of game.enemies) {
      const r = e.boss ? 30 : e.type === 'tank' ? 24 : 18;
      ctx.save();
      ctx.shadowBlur = e.boss ? 30 : 16;
      ctx.shadowColor = e.color;
      ctx.fillStyle = e.color;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = e.boss ? 3 : 2;
      ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#09090f';
      ctx.font = `${e.boss ? 24 : 18}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(e.icon, e.x, e.y + 1);
      const w = e.boss ? 72 : 48;
      const hpPct = clamp(e.hp / e.maxHp, 0, 1);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0,0,0,.65)';
      ctx.fillRect(e.x - w / 2, e.y - r - 15, w, 7);
      ctx.fillStyle = hpPct > .4 ? '#a8ff24' : '#ff4f7a';
      ctx.fillRect(e.x - w / 2, e.y - r - 15, w * hpPct, 7);
      if (e.slow > 0) drawStatusDot(e.x - 18, e.y + r + 10, '#93e8ff');
      if (e.burn > 0) drawStatusDot(e.x, e.y + r + 10, '#ff6b21');
      if (e.poison > 0) drawStatusDot(e.x + 18, e.y + r + 10, '#a8ff24');
      ctx.restore();
    }
  }

  function drawStatusDot(x, y, color) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
  }

  function drawProjectiles() {
    for (const p of game.projectiles) {
      ctx.save();
      ctx.shadowBlur = 18; ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  function drawEffects() {
    for (const e of game.effects) {
      const alpha = clamp(e.life / e.maxLife, 0, 1);
      ctx.save(); ctx.globalAlpha = alpha;
      if (e.type === 'beam') {
        ctx.strokeStyle = e.color;
        ctx.shadowBlur = 24; ctx.shadowColor = e.color;
        ctx.lineWidth = 5;
        line(e.x1, e.y1, e.x2, e.y2);
      } else if (e.type === 'explosion') {
        ctx.strokeStyle = e.color; ctx.fillStyle = e.color;
        ctx.shadowBlur = 28; ctx.shadowColor = e.color;
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.radius * (1.3 - alpha), 0, Math.PI * 2); ctx.stroke();
      } else if (e.type === 'spark') {
        e.x += e.vx * 0.016; e.y += e.vy * 0.016;
        ctx.fillStyle = e.color; ctx.shadowBlur = 15; ctx.shadowColor = e.color;
        ctx.beginPath(); ctx.arc(e.x, e.y, 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawFloating() {
    for (const f of game.floating) {
      const alpha = clamp(f.life / f.maxLife, 0, 1);
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.fillStyle = f.color;
      ctx.shadowBlur = 14; ctx.shadowColor = f.color;
      ctx.font = '900 22px Arial'; ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }
  }

  function drawCenterText(title, subtitle) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.62)';
    ctx.fillRect(0, 0, MAP_W, MAP_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = '900 64px Arial';
    ctx.fillText(title, MAP_W / 2, MAP_H / 2 - 20);
    ctx.fillStyle = '#c6bddf';
    ctx.font = '700 28px Arial';
    ctx.fillText(subtitle, MAP_W / 2, MAP_H / 2 + 35);
    ctx.restore();
  }

  function line(x1, y1, x2, y2) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  function updateUI(refreshButtons = true) {
    if (!game) return;
    $('waveText').textContent = `${Math.min(game.wave + (game.waveActive ? 0 : 1), MAX_WAVES)}/${MAX_WAVES}`;
    if (game.waveActive) $('waveText').textContent = `${game.wave}/${MAX_WAVES}`;
    $('livesText').textContent = game.lives;
    $('coinsText').textContent = game.coins;
    $('scoreText').textContent = game.score;
    $('startWaveBtn').disabled = game.waveActive || game.gameOver || game.victory;
    $('startWaveBtn').textContent = game.waveActive ? 'Wave Running' : game.wave >= MAX_WAVES ? 'Complete' : 'Start Wave';
    $('pauseBtn').textContent = game.paused ? 'Resume' : 'Pause';
    $('speedBtn').textContent = `${game.speed}x Speed`;
    if (refreshButtons) updateTowerButtonState();
    if (game.selectedTowerId) showTowerPanel();
    updateStatusText();
  }

  function openModal(html) {
    $('modalBody').innerHTML = html;
    $('modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    $('modal').classList.add('hidden');
    document.body.style.overflow = '';
  }

  function showHowToPlay() {
    openModal(`
      <p class="eyebrow">How To Play</p>
      <h2>Defend the EMX Core</h2>
      <div class="guide-grid">
        <div class="guide-card"><h3>1. Build</h3><p>Pick a tower from the shop. Tap an empty area beside the neon path to place it.</p></div>
        <div class="guide-card"><h3>2. Start Waves</h3><p>Tap Start Wave. Glitch enemies move along the circuit path toward your EMX Core.</p></div>
        <div class="guide-card"><h3>3. Upgrade</h3><p>Tap a placed tower to upgrade or sell it. Upgraded towers hit harder and reach farther.</p></div>
        <div class="guide-card"><h3>4. Win</h3><p>Survive 20 waves. Boss Core waves happen every 5 waves.</p></div>
      </div>
    `);
  }

  function showTowerGuide() {
    const cards = Object.values(towerTypes).map((t) => `
      <div class="guide-card"><h3>${t.icon} ${t.name}</h3><p><strong>${t.cost} coins.</strong> ${t.desc} Range ${t.range}, damage ${t.damage}.</p></div>
    `).join('');
    openModal(`
      <p class="eyebrow">Tower Guide</p>
      <h2>EMX Defense Towers</h2>
      <div class="guide-grid">${cards}</div>
    `);
  }

  function togglePause() {
    unlockAudio();
    if (game.screen !== 'game') return;
    game.paused = !game.paused;
    playSound('tap');
    updateUI();
  }

  function toggleSpeed() {
    unlockAudio();
    game.speed = game.speed === 1 ? 2 : game.speed === 2 ? 3 : 1;
    playSound('tap');
    updateUI();
  }

  function goHome() {
    unlockAudio();
    saveBest();
    game.running = false;
    game.paused = false;
    closeModal();
    showScreen('menu');
    playSound('tap');
  }

  function wireEvents() {
    $('playBtn').addEventListener('click', startNewGame);
    $('howBtn').addEventListener('click', () => { unlockAudio(); playSound('tap'); showHowToPlay(); });
    $('towerGuideBtn').addEventListener('click', () => { unlockAudio(); playSound('tap'); showTowerGuide(); });
    $('resetBestBtn').addEventListener('click', () => { unlockAudio(); playSound('tap'); resetBest(); });
    $('startWaveBtn').addEventListener('click', startWave);
    $('pauseBtn').addEventListener('click', togglePause);
    $('speedBtn').addEventListener('click', toggleSpeed);
    $('homeBtn').addEventListener('click', goHome);
    $('upgradeTowerBtn').addEventListener('click', upgradeSelectedTower);
    $('sellTowerBtn').addEventListener('click', sellSelectedTower);
    $('closeTowerPanelBtn').addEventListener('click', () => { game.selectedTowerId = null; $('towerPanel').classList.add('hidden'); updateUI(); });
    $('modalClose').addEventListener('click', closeModal);
    $('modal').addEventListener('click', (evt) => { if (evt.target.id === 'modal') closeModal(); });
    canvas.addEventListener('pointerdown', onCanvasPointerDown, { passive: false });
    canvas.addEventListener('pointermove', onCanvasPointerMove, { passive: false });
    canvas.addEventListener('pointerup', onCanvasPointerUp, { passive: false });
    canvas.addEventListener('pointercancel', () => { game.pointer.active = false; });
    document.addEventListener('click', unlockAudio, { once: true });
  }

  function init() {
    game = makeGame();
    loadAudio();
    buildTowerButtons();
    wireEvents();
    loadBest();
    setTimeout(() => $('boot').classList.add('done'), 1300);
    requestAnimationFrame(gameLoop);
  }

  init();
})();
