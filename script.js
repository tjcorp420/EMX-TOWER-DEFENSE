(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const rand = (min, max) => Math.random() * (max - min) + min;
  const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const SAVE_KEY = 'emxCoreDefense_v3_full';
  const MAP_W = 900, MAP_H = 1000;
  const MAX_WAVES = 30;

  const canvas = $('gameCanvas');
  const ctx = canvas.getContext('2d');
  const bgImg = new Image(); bgImg.src = 'assets/emx-bg.png';

  const levels = {
    neon: {
      key:'neon', name:'Neon Circuit', icon:'🌃', unlockWave:0, reward:1, startCoins:430, lives:25,
      desc:'Balanced EMX city grid with lots of build zones.',
      palette:{a:'#a8ff24',b:'#ff38f8',c:'#55d7ff',bg:'#050509'},
      path:[{x:70,y:110},{x:740,y:110},{x:740,y:245},{x:185,y:245},{x:185,y:420},{x:775,y:420},{x:775,y:610},{x:115,y:610},{x:115,y:815},{x:830,y:815}],
      props:[['tower',95,78],['hex',812,146],['core',560,505],['vent',280,735]]
    },
    frost: {
      key:'frost', name:'Frost Rift', icon:'❄️', unlockWave:4, reward:1.12, startCoins:470, lives:22,
      desc:'Icy landscape. Fast enemies slide quicker, but cryo towers get bonus slow.',
      palette:{a:'#7fe7ff',b:'#ffffff',c:'#a8ff24',bg:'#021018'},
      path:[{x:70,y:85},{x:250,y:85},{x:250,y:255},{x:780,y:255},{x:780,y:410},{x:95,y:410},{x:95,y:590},{x:640,y:590},{x:640,y:790},{x:830,y:790}],
      props:[['ice',128,705],['ice',710,120],['crystal',500,485],['snow',375,860]]
    },
    desert: {
      key:'desert', name:'Solar Dunes', icon:'🏜️', unlockWave:8, reward:1.25, startCoins:520, lives:24,
      desc:'Wide open heat map. Flame and rocket attacks hit harder.',
      palette:{a:'#ffd65a',b:'#ff6b21',c:'#ff38f8',bg:'#160b04'},
      path:[{x:75,y:140},{x:810,y:140},{x:810,y:315},{x:535,y:315},{x:535,y:510},{x:150,y:510},{x:150,y:705},{x:715,y:705},{x:715,y:850},{x:840,y:850}],
      props:[['sun',750,75],['rock',135,315],['rock',420,660],['cactus',220,835]]
    },
    void: {
      key:'void', name:'Void Core', icon:'🌌', unlockWave:12, reward:1.45, startCoins:600, lives:20,
      desc:'Hard mode blackhole arena. Higher rewards and stronger boss cores.',
      palette:{a:'#a84cff',b:'#ff38f8',c:'#55d7ff',bg:'#030007'},
      path:[{x:75,y:90},{x:790,y:90},{x:790,y:205},{x:118,y:205},{x:118,y:340},{x:790,y:340},{x:790,y:500},{x:120,y:500},{x:120,y:680},{x:790,y:680},{x:790,y:845}],
      props:[['blackhole',450,465],['star',210,110],['star',650,585],['void',330,820]]
    }
  };

  const towerTypes = {
    flame:{key:'flame',name:'Flame Turret',icon:'🔥',cost:90,range:150,fireRate:.82,damage:16,color:'#ff6b21',desc:'Burns enemies over time.',effect:'burn',sound:'flame'},
    tesla:{key:'tesla',name:'Tesla Coil',icon:'⚡',cost:125,range:168,fireRate:1.0,damage:18,color:'#60dfff',desc:'Chains electric damage.',effect:'chain',sound:'zap'},
    cryo:{key:'cryo',name:'Cryo Blaster',icon:'❄️',cost:110,range:148,fireRate:.88,damage:11,color:'#93e8ff',desc:'Slows fast enemies.',effect:'slow',sound:'ice'},
    venom:{key:'venom',name:'Venom Sprayer',icon:'☠️',cost:100,range:138,fireRate:.7,damage:10,color:'#a8ff24',desc:'Poison stacks damage.',effect:'poison',sound:'poison'},
    rocket:{key:'rocket',name:'Rocket Node',icon:'🚀',cost:155,range:185,fireRate:1.38,damage:36,color:'#ff4f7a',desc:'Splash damage explosions.',effect:'splash',sound:'rocket'},
    shadow:{key:'shadow',name:'Shadow Sniper',icon:'🌑',cost:180,range:265,fireRate:1.65,damage:55,color:'#d14cff',desc:'Long range boss damage.',effect:'pierce',sound:'shadow'},
    prism:{key:'prism',name:'Prism Ray',icon:'💎',cost:220,range:210,fireRate:.72,damage:22,color:'#ffffff',desc:'Laser beam ramps on same target.',effect:'laser',sound:'laser'},
    nova:{key:'nova',name:'Nova Cannon',icon:'🟣',cost:260,range:175,fireRate:.5,damage:64,color:'#b026ff',desc:'Huge pulse every few seconds.',effect:'nova',sound:'nova'}
  };

  const enemyBase = {
    glitch:{name:'Glitch Orb',icon:'🟣',hp:45,speed:72,reward:9,color:'#c34cff'},
    fast:{name:'Fast Bug',icon:'🟢',hp:32,speed:124,reward:10,color:'#82ff2e'},
    shield:{name:'Shield Drone',icon:'🛡️',hp:82,armor:6,speed:62,reward:14,color:'#73d7ff'},
    split:{name:'Split Virus',icon:'🧬',hp:72,speed:67,reward:17,color:'#ff43f2',split:true},
    tank:{name:'EMP Tank',icon:'🔋',hp:165,armor:9,speed:39,reward:25,color:'#ffd65a'},
    regen:{name:'Regen Slime',icon:'🧪',hp:115,armor:2,speed:55,reward:22,color:'#39ff14',regen:true},
    ghost:{name:'Phase Ghost',icon:'👻',hp:95,armor:0,speed:82,reward:28,color:'#d8b8ff',phase:true},
    boss:{name:'Boss Core',icon:'👁️',hp:620,armor:12,speed:34,reward:110,color:'#ff2c79',boss:true}
  };

  let game, lastTime=0, audioUnlocked=false, audioMuted=false, audioCtx=null, dockMode='towers';
  const audioFiles = {};
  const soundNames = ['tap','place','shoot','blast','coin','wave','win','lose','flame','zap','ice','poison','rocket','shadow','laser','nova','mine','drone','upgrade'];

  function makeGame(levelKey='neon') {
    const level = levels[levelKey] || levels.neon;
    return {screen:'menu',running:false,paused:false,speed:1,levelKey,wave:0,waveActive:false,lives:level.lives,coins:level.startCoins,score:0,
      selectedType:null,selectedTowerId:null,selectedTool:null,towers:[],tools:[],enemies:[],projectiles:[],effects:[],floating:[],spawnQueue:[],spawnTimer:0,nextTowerId:1,nextToolId:1,nextEnemyId:1,kills:0,perfectWaves:0,overdrive:0,
      abilities:{emp:{cd:0,max:32},repair:{cd:0,max:42},overdrive:{cd:0,max:38},mine:{cd:0,max:18},drone:{cd:0,max:30}},
      missions:[],pointer:{x:0,y:0,active:false},gameOver:false,victory:false,levelUnlocked:loadUnlockedLevel()};
  }
  const path = () => levels[game.levelKey].path;
  const level = () => levels[game.levelKey];

  function makeAudio(name){
    const a=new Audio(`assets/sfx/${name}.wav`);
    a.preload='auto';
    a.dataset.altSrc=`sfx/${name}.wav`;
    a.addEventListener('error',()=>{
      if(a.dataset.altSrc&&!a.dataset.triedAlt){
        a.dataset.triedAlt='1';
        a.src=a.dataset.altSrc;
        try{a.load()}catch(_){}
      }
    });
    return a;
  }
  function loadAudio(){soundNames.forEach(n=>{audioFiles[n]=makeAudio(n);});}
  function synthSound(name,vol=.18){
    if(!audioCtx||audioMuted)return;
    try{
      const now=audioCtx.currentTime;
      const osc=audioCtx.createOscillator();
      const gain=audioCtx.createGain();
      const map={tap:[520,.045,'square'],place:[260,.08,'triangle'],coin:[880,.09,'sine'],wave:[190,.16,'sawtooth'],blast:[90,.22,'sawtooth'],win:[660,.24,'triangle'],lose:[120,.3,'sawtooth'],flame:[150,.08,'sawtooth'],zap:[1040,.06,'square'],ice:[720,.1,'sine'],poison:[310,.12,'triangle'],rocket:[130,.14,'sawtooth'],shadow:[220,.13,'sine'],laser:[980,.08,'square'],nova:[170,.18,'triangle'],mine:[95,.2,'sawtooth'],drone:[440,.12,'square'],upgrade:[760,.18,'triangle']};
      const cfg=map[name]||map.tap;
      osc.type=cfg[2];
      osc.frequency.setValueAtTime(cfg[0],now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(50,cfg[0]*1.55),now+cfg[1]);
      gain.gain.setValueAtTime(Math.max(.001,vol*.55),now);
      gain.gain.exponentialRampToValueAtTime(.001,now+cfg[1]);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(now); osc.stop(now+cfg[1]+.02);
    }catch(_){}
  }
  function playSound(name,vol=.28){
    if(!audioUnlocked||audioMuted)return;
    const base=audioFiles[name]||audioFiles.tap;
    if(base){
      try{
        const s=base.cloneNode(true);
        s.volume=vol;
        const p=s.play();
        if(p&&p.catch)p.catch(()=>synthSound(name,vol));
        return;
      }catch(_){}
    }
    synthSound(name,vol);
  }
  function unlockAudio(){
    if(!audioCtx){
      const Ctx=window.AudioContext||window.webkitAudioContext;
      if(Ctx)audioCtx=new Ctx();
    }
    if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
    if(audioUnlocked)return;
    audioUnlocked=true;
    Object.values(audioFiles).forEach(a=>{try{a.load()}catch(_){}});
    setTimeout(()=>playSound('tap',.18),0);
  }

  function loadUnlockedLevel(){try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'{}').unlockedLevel||0}catch(_){return 0}}
  function levelIsUnlocked(k){return game.levelUnlocked >= Object.values(levels).findIndex(l=>l.key===k)}
  function saveProgress(){let data={};try{data=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}')}catch(_){};data.bestWave=Math.max(data.bestWave||0,game.wave||0);data.bestScore=Math.max(data.bestScore||0,game.score||0);const idx=Object.values(levels).findIndex(l=>l.key===game.levelKey);if(game.wave>=levels[game.levelKey].unlockWave+4)data.unlockedLevel=Math.max(data.unlockedLevel||0,Math.min(Object.keys(levels).length-1,idx+1));localStorage.setItem(SAVE_KEY,JSON.stringify(data));loadBest();}
  function loadBest(){let d={};try{d=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}')}catch(_){};$('bestWaveText').textContent=d.bestWave||0;$('bestScoreText').textContent=d.bestScore||0;if(game)game.levelUnlocked=d.unlockedLevel||0;}

  function showScreen(name){game.screen=name;document.body.classList.toggle('game-active',name==='game');$('menuScreen').classList.toggle('active',name==='menu');$('gameScreen').classList.toggle('active',name==='game');updateUI();}
  function showToast(text,ms=1700){const t=$('toast');t.textContent=text;t.classList.remove('hidden');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.add('hidden'),ms);}
  function openModal(html){$('modalBody').innerHTML=html;$('modal').classList.remove('hidden');document.body.style.overflow='hidden';}
  function closeModal(){$('modal').classList.add('hidden');document.body.style.overflow='';}

  function startNewGame(levelKey=game.levelKey||'neon'){unlockAudio();game=makeGame(levelKey);game.running=true;game.screen='game';game.missions=makeMissions();buildLevelButtons();showScreen('game');showToast(`${level().icon} ${level().name} loaded. Build towers beside the path.`);playSound('wave');}
  function startWave(){unlockAudio();if(game.waveActive||game.gameOver||game.victory)return;if(game.wave>=MAX_WAVES)return;game.wave++;game.waveActive=true;game.spawnQueue=createWave(game.wave);game.spawnTimer=0;game.selectedTowerId=null;$('towerPanel').classList.add('hidden');showToast(game.wave%5===0?`BOSS WAVE ${game.wave}`:`Wave ${game.wave} started`);playSound(game.wave%5===0?'blast':'wave');updateUI();}
  function createWave(w){const q=[];const add=(t,c,g)=>{for(let i=0;i<c;i++)q.push({type:t,gap:g})};const base=7+w;add('glitch',base,.46);if(w>=2)add('fast',Math.floor(2+w*.7),.4);if(w>=4)add('shield',Math.floor(1+w*.45),.58);if(w>=6)add('regen',Math.floor(1+w*.26),.7);if(w>=7)add('split',Math.floor(1+w*.34),.68);if(w>=9)add('ghost',Math.floor(1+w*.26),.55);if(w>=10)add('tank',Math.floor(1+w*.18),.85);if(w%5===0)add('boss',1,1.3);return q.sort(()=>Math.random()-.42)}
  function spawnEnemy(type,w=game.wave){const b=enemyBase[type];let scale=b.boss?1+w*.26:1+w*.12;if(game.levelKey==='void')scale*=1.18;const p=path()[0];const e={id:game.nextEnemyId++,type,name:b.name,icon:b.icon,color:b.color,x:p.x,y:p.y,seg:0,progress:0,hp:Math.round(b.hp*scale),maxHp:Math.round(b.hp*scale),speed:b.speed*(game.levelKey==='frost'&&type==='fast'?1.12:1),armor:b.armor||0,reward:Math.round(b.reward*(1+w*.08)*level().reward),split:b.split,boss:b.boss,regen:b.regen,phase:b.phase,burn:0,burnDps:0,poison:0,poisonDps:0,slow:0,alive:true,distanceTravelled:0};game.enemies.push(e)}

  function gameLoop(ts){if(!lastTime)lastTime=ts;const raw=Math.min(.05,(ts-lastTime)/1000);lastTime=ts;const dt=raw*(game?.speed||1);if(game&&game.screen==='game'&&game.running&&!game.paused&&!game.gameOver&&!game.victory)updateGame(dt);draw();requestAnimationFrame(gameLoop)}
  function updateGame(dt){updateCooldowns(dt);updateSpawning(dt);updateEnemies(dt);updateTools(dt);updateTowers(dt);updateProjectiles(dt);updateEffects(dt);checkWaveComplete();updateUI(false)}
  function updateSpawning(dt){if(!game.waveActive||!game.spawnQueue.length)return;game.spawnTimer-=dt;if(game.spawnTimer<=0){const it=game.spawnQueue.shift();spawnEnemy(it.type);game.spawnTimer=it.gap}}
  function updateEnemies(dt){for(const e of game.enemies){if(!e.alive)continue;if(e.burn>0){e.hp-=e.burnDps*dt;e.burn-=dt}if(e.poison>0){e.hp-=e.poisonDps*dt;e.poison-=dt}if(e.regen&&e.hp>0)e.hp=Math.min(e.maxHp,e.hp+4*dt);if(e.hp<=0){killEnemy(e);continue}const slow=e.slow>0?.52:1;e.slow=Math.max(0,e.slow-dt);let toolSlow=1;for(const tool of game.tools){if(tool.type==='barrier'&&Math.hypot(e.x-tool.x,e.y-tool.y)<95)toolSlow*=.58}moveAlongPath(e,e.speed*slow*toolSlow*dt)}game.enemies=game.enemies.filter(e=>e.alive)}
  function moveAlongPath(e,dist){const pth=path();while(dist>0&&e.alive){const a=pth[e.seg],b=pth[e.seg+1];if(!b){e.alive=false;game.lives-=e.boss?5:1;addFloating('CORE HIT',e.x,e.y,'#ff4f7a');playSound('blast');if(game.lives<=0)endGame(false);return}const len=Math.hypot(b.x-a.x,b.y-a.y),remain=len-e.progress,step=Math.min(dist,remain);e.progress+=step;e.distanceTravelled+=step;const t=e.progress/len;e.x=a.x+(b.x-a.x)*t;e.y=a.y+(b.y-a.y)*t;dist-=step;if(e.progress>=len-.001){e.seg++;e.progress=0}}}
  function killEnemy(e){if(!e.alive)return;e.alive=false;game.kills++;game.coins+=e.reward;game.score+=e.boss?650+e.reward:45+e.reward;addExplosion(e.x,e.y,e.color,e.boss?50:24);addFloating(`+${e.reward}`,e.x,e.y,'#a8ff24');playSound(e.boss?'win':'coin');checkMissions();if(e.split&&!e.boss){for(let i=0;i<2;i++)game.enemies.push(createSplitChild(e))}}
  function createSplitChild(p){const b=enemyBase.glitch;return{id:game.nextEnemyId++,type:'glitch',name:'Mini Glitch',icon:'•',color:'#ff8cff',x:p.x+rand(-10,10),y:p.y+rand(-10,10),seg:p.seg,progress:p.progress,hp:Math.max(18,Math.round(p.maxHp*.26)),maxHp:Math.max(18,Math.round(p.maxHp*.26)),speed:b.speed*1.18,armor:0,reward:5,alive:true,distanceTravelled:p.distanceTravelled,burn:0,burnDps:0,poison:0,poisonDps:0,slow:0}}

  function towerStats(t){const b=towerTypes[t.type];const lvl=t.level-1;let dmg=b.damage*(1+lvl*.58),range=b.range+lvl*24,fr=b.fireRate*(1+lvl*.24);if(game.overdrive>0){dmg*=1.5;fr*=1.48}if(game.levelKey==='frost'&&t.type==='cryo')range+=25;if(game.levelKey==='desert'&&(t.type==='flame'||t.type==='rocket'))dmg*=1.12;for(const tool of game.tools){if(tool.type==='boost'&&Math.hypot(t.x-tool.x,t.y-tool.y)<120){dmg*=1.18;fr*=1.12}}if(t.mod==='range')range+=45;if(t.mod==='damage')dmg*=1.22;if(t.mod==='speed')fr*=1.2;return{range,damage:Math.round(dmg),fireRate:fr,color:b.color,effect:b.effect,name:b.name,icon:b.icon}}
  function updateTowers(dt){for(const t of game.towers){t.cooldown-=dt;if(t.cooldown>0)continue;const tar=findTarget(t);if(!tar)continue;fireTower(t,tar);t.cooldown=1/towerStats(t).fireRate}}
  function findTarget(t){const s=towerStats(t);let best=null,bestD=-Infinity;for(const e of game.enemies){if(!e.alive)continue;const d=Math.hypot(e.x-t.x,e.y-t.y);if(d<=s.range&&e.distanceTravelled>bestD){best=e;bestD=e.distanceTravelled}}return best}
  function fireTower(t,target){const s=towerStats(t),b=towerTypes[t.type];playSound(b.sound,.24);game.effects.push({type:'muzzle',x:t.x,y:t.y,color:s.color,life:.16,maxLife:.16});if(t.type==='tesla'){instantHit(t,target,s);chainLightning(t,target,s);return}if(t.type==='prism'){instantHit(t,target,s);target.prism=(target.prism||0)+1;damageEnemy(target,Math.min(55,target.prism*5),'laser');return}if(t.type==='nova'){addExplosion(t.x,t.y,s.color,36);for(const e of game.enemies){if(e.alive&&Math.hypot(e.x-t.x,e.y-t.y)<=s.range)damageEnemy(e,s.damage,'nova')}return}game.projectiles.push({x:t.x,y:t.y,targetId:target.id,speed:t.type==='rocket'?420:650,damage:s.damage,color:s.color,effect:s.effect,radius:t.type==='rocket'?9:6,type:t.type})}
  function instantHit(t,target,s){damageEnemy(target,s.damage,s.effect);game.effects.push({type:'beam',x1:t.x,y1:t.y,x2:target.x,y2:target.y,color:s.color,life:.18,maxLife:.18})}
  function chainLightning(t,first,s){const ids=[first.id];let cur=first;for(let i=0;i<3;i++){let next=null,bd=Infinity;for(const e of game.enemies){if(!e.alive||ids.includes(e.id))continue;const d=Math.hypot(e.x-cur.x,e.y-cur.y);if(d<145&&d<bd){next=e;bd=d}}if(!next)break;ids.push(next.id);damageEnemy(next,Math.round(s.damage*.55),s.effect);game.effects.push({type:'beam',x1:cur.x,y1:cur.y,x2:next.x,y2:next.y,color:s.color,life:.18,maxLife:.18});cur=next}}
  function updateProjectiles(dt){for(const p of game.projectiles){const target=game.enemies.find(e=>e.id===p.targetId&&e.alive);if(!target){p.dead=true;continue}const dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy);if(d<p.speed*dt||d<10){impactProjectile(p,target);p.dead=true}else{p.x+=(dx/d)*p.speed*dt;p.y+=(dy/d)*p.speed*dt}}game.projectiles=game.projectiles.filter(p=>!p.dead)}
  function impactProjectile(p,target){if(p.effect==='splash'){playSound('blast',.2);addExplosion(target.x,target.y,p.color,36);for(const e of game.enemies){if(!e.alive)continue;const d=Math.hypot(e.x-target.x,e.y-target.y);if(d<=78)damageEnemy(e,Math.round(p.damage*(1-d/115)),p.effect)}}else{damageEnemy(target,p.damage,p.effect);addSpark(target.x,target.y,p.color)}}
  function damageEnemy(e,amount,effect){if(!e||!e.alive)return;if(e.phase&&Math.random()<.08&&effect!=='laser')return;let real=Math.max(1,Math.round(amount-e.armor));if(effect==='pierce'||effect==='laser')real=Math.max(1,Math.round(amount-e.armor*.25));e.hp-=real;if(effect==='burn'){e.burn=Math.max(e.burn,3.2);e.burnDps=Math.max(e.burnDps,game.levelKey==='desert'?10:7)}if(effect==='poison'){e.poison=Math.max(e.poison,4.2);e.poisonDps=Math.max(e.poisonDps,5)}if(effect==='slow'){e.slow=Math.max(e.slow,game.levelKey==='frost'?3.4:2.3)}if(e.hp<=0)killEnemy(e)}

  function updateTools(dt){for(const tool of game.tools){tool.life=(tool.life||0)+dt;if(tool.type==='mine'){for(const e of game.enemies){if(e.alive&&Math.hypot(e.x-tool.x,e.y-tool.y)<55){tool.dead=true;addExplosion(tool.x,tool.y,'#ff38f8',65);playSound('mine');for(const en of game.enemies){if(en.alive&&Math.hypot(en.x-tool.x,en.y-tool.y)<130)damageEnemy(en,120,'splash')}break}}}}game.tools=game.tools.filter(t=>!t.dead)}
  function placeTool(type,x,y){const costs={barrier:135,boost:170};if(game.coins<costs[type]){showToast('Not enough coins for tool.');return}if(type==='barrier'&&distanceToPath(x,y)>50){showToast('Barrier must touch the path.');return}if(type==='boost'&&distanceToPath(x,y)<55){showToast('Boost pad must be off the path.');return}game.coins-=costs[type];game.tools.push({id:game.nextToolId++,type,x,y});game.selectedTool=null;playSound('place');addExplosion(x,y,type==='barrier'?'#55d7ff':'#a8ff24',28);showToast(type==='barrier'?'Barrier Gate placed.':'Boost Pad placed.');updateUI()}
  function scrapToolAt(x,y){let best=null;for(const t of game.tools){if(Math.hypot(x-t.x,y-t.y)<45){best=t;break}}if(best){game.tools=game.tools.filter(t=>t.id!==best.id);game.coins+=45;playSound('coin');showToast('Tool scrapped for 45 coins.');}else showToast('Tap a placed field tool to scrap it.')}

  function checkWaveComplete(){if(!game.waveActive)return;if(!game.spawnQueue.length&&!game.enemies.length){game.waveActive=false;if(game.lives>=level().lives)game.perfectWaves++;const bonus=55+game.wave*7+(game.perfectWaves>=2?45:0);game.coins+=bonus;game.score+=140+game.wave*35;checkMissions();showToast(`Wave ${game.wave} cleared. +${bonus} coins.`);playSound('win');saveProgress();if(game.wave>=MAX_WAVES)endGame(true)}}
  function endGame(win){if(game.gameOver||game.victory)return;game.gameOver=!win;game.victory=win;game.waveActive=false;saveProgress();playSound(win?'win':'lose');openModal(`<h2 class="result-title">${win?'🏆 EMX Core Saved!':'💥 Core Breached!'}</h2><p>Level: <strong>${level().name}</strong><br>Wave <strong>${game.wave}</strong> • Score <strong>${game.score}</strong> • Kills <strong>${game.kills}</strong></p><div class="guide-grid"><button class="big-btn primary" id="modalPlayAgain">Play Again</button><button class="big-btn" id="modalMenuBtn">Main Menu</button></div>`);setTimeout(()=>{const a=$('modalPlayAgain'),m=$('modalMenuBtn');if(a)a.onclick=()=>{closeModal();startNewGame(game.levelKey)};if(m)m.onclick=()=>{closeModal();showScreen('menu')}},0)}

  function canPlaceTower(x,y){if(x<45||y<45||x>MAP_W-45||y>MAP_H-45)return{ok:false,reason:'Too close to edge.'};if(distanceToPath(x,y)<54)return{ok:false,reason:'Too close to enemy path.'};for(const t of game.towers)if(Math.hypot(x-t.x,y-t.y)<64)return{ok:false,reason:'Too close to another tower.'};for(const t of game.tools)if(Math.hypot(x-t.x,y-t.y)<48)return{ok:false,reason:'Too close to a field tool.'};return{ok:true}}
  function placeTower(x,y){const type=game.selectedType;if(!type)return;const data=towerTypes[type];if(game.coins<data.cost){showToast('Not enough coins.');return}const check=canPlaceTower(x,y);if(!check.ok){showToast(check.reason);return}game.towers.push({id:game.nextTowerId++,type,x,y,level:1,cooldown:0,spent:data.cost,mod:null});game.coins-=data.cost;game.selectedType=null;checkMissions();addSpark(x,y,data.color);showToast(`${data.name} placed.`);playSound('place');updateUI()}
  function selectTowerAt(x,y){let best=null,bd=Infinity;for(const t of game.towers){const d=Math.hypot(x-t.x,y-t.y);if(d<38&&d<bd){best=t;bd=d}}if(!best){game.selectedTowerId=null;$('towerPanel').classList.add('hidden');return false}game.selectedType=null;game.selectedTool=null;game.selectedTowerId=best.id;showTowerPanel();updateUI();return true}
  function getSelectedTower(){return game.towers.find(t=>t.id===game.selectedTowerId)}
  function showTowerPanel(){const t=getSelectedTower();if(!t){$('towerPanel').classList.add('hidden');return}const d=towerTypes[t.type],s=towerStats(t),cost=getUpgradeCost(t);$('selectedTowerName').textContent=`${d.icon} ${d.name} L${t.level}${t.mod?' • '+t.mod.toUpperCase():''}`;$('selectedTowerStats').textContent=`Damage ${s.damage} • Range ${Math.round(s.range)} • Fire ${s.fireRate.toFixed(1)}/s • Sell ${getSellValue(t)} coins`;$('upgradeTowerBtn').textContent=t.level>=5?'Max Level':`Upgrade ${cost}`;$('upgradeTowerBtn').disabled=t.level>=5||game.coins<cost;$('towerPanel').classList.remove('hidden')}
  function getUpgradeCost(t){return Math.round(towerTypes[t.type].cost*(.75+t.level*.62))}function getSellValue(t){return Math.round(t.spent*.62)}
  function upgradeSelectedTower(){unlockAudio();const t=getSelectedTower();if(!t||t.level>=5)return;const cost=getUpgradeCost(t);if(game.coins<cost){showToast('Not enough coins.');return}game.coins-=cost;t.spent+=cost;t.level++;if(t.level===3&&!t.mod)t.mod=choice(['range','damage','speed']);addExplosion(t.x,t.y,towerTypes[t.type].color,35);showToast(t.mod?`${towerTypes[t.type].name} upgraded. ${t.mod.toUpperCase()} mod active.`:`Tower upgraded.`);playSound('upgrade');updateUI();showTowerPanel()}
  function sellSelectedTower(){unlockAudio();const t=getSelectedTower();if(!t)return;const val=getSellValue(t);game.towers=game.towers.filter(x=>x.id!==t.id);game.coins+=val;game.selectedTowerId=null;$('towerPanel').classList.add('hidden');showToast(`Tower sold for ${val}.`);playSound('coin');updateUI()}

  function getCanvasPoint(evt){const r=canvas.getBoundingClientRect();return{x:clamp((evt.clientX-r.left)*(MAP_W/r.width),0,MAP_W),y:clamp((evt.clientY-r.top)*(MAP_H/r.height),0,MAP_H)}}
  function onCanvasPointerDown(evt){evt.preventDefault();unlockAudio();const p=getCanvasPoint(evt);game.pointer={x:p.x,y:p.y,active:true}}
  function onCanvasPointerMove(evt){if(!game.pointer.active)return;const p=getCanvasPoint(evt);game.pointer.x=p.x;game.pointer.y=p.y}
  function onCanvasPointerUp(evt){evt.preventDefault();const p=getCanvasPoint(evt);game.pointer={x:p.x,y:p.y,active:false};if(game.gameOver||game.victory)return;if(game.selectedTool==='scrap')scrapToolAt(p.x,p.y);else if(game.selectedTool)placeTool(game.selectedTool,p.x,p.y);else if(game.selectedType)placeTower(p.x,p.y);else selectTowerAt(p.x,p.y)}
  function distanceToPath(x,y){let min=Infinity,pth=path();for(let i=0;i<pth.length-1;i++)min=Math.min(min,distanceToSegment(x,y,pth[i],pth[i+1]));return min}
  function distanceToSegment(px,py,a,b){const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy,t=len===0?0:clamp(((px-a.x)*dx+(py-a.y)*dy)/len,0,1),x=a.x+dx*t,y=a.y+dy*t;return Math.hypot(px-x,py-y)}

  function addSpark(x,y,color){for(let i=0;i<12;i++)game.effects.push({type:'spark',x,y,vx:rand(-90,90),vy:rand(-90,90),color,life:rand(.28,.55),maxLife:.55})}
  function addExplosion(x,y,color,radius){game.effects.push({type:'explosion',x,y,radius,color,life:.38,maxLife:.38});for(let i=0;i<18;i++)game.effects.push({type:'spark',x,y,vx:rand(-150,150),vy:rand(-150,150),color,life:rand(.28,.62),maxLife:.62})}
  function addFloating(text,x,y,color){game.floating.push({text,x,y,color,life:1,maxLife:1})}
  function updateEffects(dt){game.overdrive=Math.max(0,game.overdrive-dt);for(const e of game.effects)e.life-=dt;game.effects=game.effects.filter(e=>e.life>0);for(const f of game.floating){f.life-=dt;f.y-=30*dt}game.floating=game.floating.filter(f=>f.life>0)}

  function draw(){if(!game)return;ctx.clearRect(0,0,MAP_W,MAP_H);drawBackground();drawPath();drawTools();drawPlacementPreview();drawTowers();drawEnemies();drawProjectiles();drawEffects();drawFloating();drawCore();if(game.paused&&game.screen==='game')drawCenterText('PAUSED','Tap Pause to resume')}
  function drawBackground(){const pal=level().palette;ctx.fillStyle=pal.bg;ctx.fillRect(0,0,MAP_W,MAP_H);if(bgImg.complete){ctx.save();ctx.globalAlpha=.18;ctx.drawImage(bgImg,0,0,MAP_W,MAP_H);ctx.restore()}const g=ctx.createRadialGradient(450,470,20,450,470,700);g.addColorStop(0,pal.a+'33');g.addColorStop(.45,pal.b+'16');g.addColorStop(1,'#00000000');ctx.fillStyle=g;ctx.fillRect(0,0,MAP_W,MAP_H);ctx.save();ctx.globalAlpha=.13;ctx.strokeStyle=pal.a;for(let x=0;x<MAP_W;x+=90)line(x,0,x,MAP_H);ctx.strokeStyle=pal.b;for(let y=0;y<MAP_H;y+=90)line(0,y,MAP_W,y);ctx.restore();drawLandscapeProps()}
  function drawLandscapeProps(){for(const [type,x,y] of level().props){ctx.save();ctx.globalAlpha=.7;ctx.shadowBlur=20;ctx.shadowColor=level().palette.c;ctx.font='42px Arial';ctx.textAlign='center';const map={tower:'🏙️',hex:'⬡',core:'💠',vent:'▰',ice:'🧊',crystal:'🔷',snow:'✦',sun:'☀️',rock:'🪨',cactus:'🌵',blackhole:'🕳️',star:'✦',void:'◈'};ctx.fillText(map[type]||'✦',x,y);ctx.restore()}}
  function drawPath(){const pal=level().palette;ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowBlur=30;ctx.shadowColor=pal.a;ctx.strokeStyle=pal.a+'55';ctx.lineWidth=76;drawPathLine();ctx.shadowColor=pal.b;ctx.strokeStyle=pal.b+'44';ctx.lineWidth=54;drawPathLine();ctx.shadowBlur=0;ctx.strokeStyle='rgba(255,255,255,.15)';ctx.lineWidth=34;drawPathLine();ctx.strokeStyle='rgba(3,3,9,.88)';ctx.lineWidth=27;drawPathLine();ctx.strokeStyle=pal.a;ctx.lineWidth=3;drawPathLine();ctx.strokeStyle=pal.b;ctx.setLineDash([20,15]);ctx.lineWidth=2;drawPathLine();ctx.restore()}
  function drawPathLine(){const pth=path();ctx.beginPath();ctx.moveTo(pth[0].x,pth[0].y);for(let i=1;i<pth.length;i++)ctx.lineTo(pth[i].x,pth[i].y);ctx.stroke()}
  function drawCore(){const pth=path();drawNode(pth[0].x,pth[0].y,level().palette.a,'IN');drawNode(pth[pth.length-1].x,pth[pth.length-1].y,level().palette.b,'CORE')}
  function drawNode(x,y,color,label){ctx.save();ctx.shadowBlur=25;ctx.shadowColor=color;ctx.fillStyle='#050508';ctx.strokeStyle=color;ctx.lineWidth=4;ctx.beginPath();ctx.arc(x,y,34,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=color;ctx.font='900 16px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,x,y);ctx.restore()}
  function drawPlacementPreview(){if((!game.selectedType&&!game.selectedTool)||!game.pointer.active)return;ctx.save();let color='#a8ff24',rad=70;if(game.selectedType){const t=towerTypes[game.selectedType];color=t.color;rad=t.range}else if(game.selectedTool==='barrier'){color='#55d7ff';rad=95}else if(game.selectedTool==='boost'){color='#a8ff24';rad=120}else if(game.selectedTool==='scrap'){color='#ff4f7a';rad=45}ctx.globalAlpha=.65;ctx.strokeStyle=color;ctx.fillStyle=color+'22';ctx.lineWidth=3;ctx.beginPath();ctx.arc(game.pointer.x,game.pointer.y,rad,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore()}
  function drawTools(){for(const t of game.tools){ctx.save();const color=t.type==='barrier'?'#55d7ff':t.type==='boost'?'#a8ff24':'#ff38f8';ctx.shadowBlur=22;ctx.shadowColor=color;ctx.globalAlpha=.35;ctx.fillStyle=color;ctx.beginPath();ctx.arc(t.x,t.y,t.type==='boost'?120:t.type==='barrier'?95:45,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#050509';ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(t.x,t.y,26,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.font='24px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t.type==='barrier'?'🛡️':t.type==='boost'?'💠':'💣',t.x,t.y);ctx.restore()}}
  function drawTowers(){for(const t of game.towers){const d=towerTypes[t.type],s=towerStats(t),sel=t.id===game.selectedTowerId;ctx.save();if(sel){ctx.globalAlpha=.23;ctx.fillStyle=s.color;ctx.beginPath();ctx.arc(t.x,t.y,s.range,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;ctx.shadowBlur=sel?34:18;ctx.shadowColor=s.color;ctx.fillStyle='#0d0d18';ctx.strokeStyle=s.color;ctx.lineWidth=sel?5:3;ctx.beginPath();ctx.arc(t.x,t.y,31+Math.sin(Date.now()/180+t.id)*1.5,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.font='26px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(d.icon,t.x,t.y+1);ctx.font='900 13px Arial';ctx.fillStyle='#fff';ctx.fillText(`L${t.level}`,t.x,t.y+45);if(t.mod){ctx.fillStyle=s.color;ctx.fillText(t.mod[0].toUpperCase(),t.x+32,t.y-25)}ctx.restore()}}
  function drawEnemies(){for(const e of game.enemies){const r=e.boss?31:e.type==='tank'?24:18;ctx.save();ctx.shadowBlur=e.boss?32:17;ctx.shadowColor=e.color;ctx.fillStyle=e.color;ctx.strokeStyle='#fff';ctx.lineWidth=e.boss?3:2;ctx.beginPath();ctx.arc(e.x,e.y,r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#09090f';ctx.font=`${e.boss?24:18}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(e.icon,e.x,e.y+1);const w=e.boss?76:50,hp=clamp(e.hp/e.maxHp,0,1);ctx.shadowBlur=0;ctx.fillStyle='rgba(0,0,0,.68)';ctx.fillRect(e.x-w/2,e.y-r-15,w,7);ctx.fillStyle=hp>.4?'#a8ff24':'#ff4f7a';ctx.fillRect(e.x-w/2,e.y-r-15,w*hp,7);if(e.slow>0)drawStatusDot(e.x-18,e.y+r+10,'#93e8ff');if(e.burn>0)drawStatusDot(e.x,e.y+r+10,'#ff6b21');if(e.poison>0)drawStatusDot(e.x+18,e.y+r+10,'#a8ff24');ctx.restore()}}
  function drawStatusDot(x,y,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill()}
  function drawProjectiles(){for(const p of game.projectiles){ctx.save();ctx.shadowBlur=18;ctx.shadowColor=p.color;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);ctx.fill();ctx.restore()}}
  function drawEffects(){for(const e of game.effects){const a=clamp(e.life/e.maxLife,0,1);ctx.save();ctx.globalAlpha=a;if(e.type==='beam'){ctx.strokeStyle=e.color;ctx.shadowBlur=24;ctx.shadowColor=e.color;ctx.lineWidth=5;line(e.x1,e.y1,e.x2,e.y2)}else if(e.type==='explosion'||e.type==='muzzle'){ctx.strokeStyle=e.color;ctx.shadowBlur=28;ctx.shadowColor=e.color;ctx.lineWidth=4;ctx.beginPath();ctx.arc(e.x,e.y,(e.radius||28)*(1.3-a),0,Math.PI*2);ctx.stroke()}else if(e.type==='ring'){ctx.strokeStyle=e.color;ctx.shadowBlur=34;ctx.shadowColor=e.color;ctx.lineWidth=7;ctx.beginPath();ctx.arc(e.x,e.y,e.radius+(1-a)*520,0,Math.PI*2);ctx.stroke()}else if(e.type==='spark'){e.x+=e.vx*.016;e.y+=e.vy*.016;ctx.fillStyle=e.color;ctx.shadowBlur=15;ctx.shadowColor=e.color;ctx.beginPath();ctx.arc(e.x,e.y,3,0,Math.PI*2);ctx.fill()}ctx.restore()}}
  function drawFloating(){for(const f of game.floating){const a=clamp(f.life/f.maxLife,0,1);ctx.save();ctx.globalAlpha=a;ctx.fillStyle=f.color;ctx.shadowBlur=14;ctx.shadowColor=f.color;ctx.font='900 22px Arial';ctx.textAlign='center';ctx.fillText(f.text,f.x,f.y);ctx.restore()}}
  function drawCenterText(t,s){ctx.save();ctx.fillStyle='rgba(0,0,0,.62)';ctx.fillRect(0,0,MAP_W,MAP_H);ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='900 64px Arial';ctx.fillText(t,MAP_W/2,MAP_H/2-20);ctx.fillStyle='#c6bddf';ctx.font='700 28px Arial';ctx.fillText(s,MAP_W/2,MAP_H/2+35);ctx.restore()}function line(x1,y1,x2,y2){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}

  function makeMissions(){return[{text:'Delete 40 glitch enemies',target:40,reward:120,done:false,read:()=>game.kills},{text:'Reach boss wave 5',target:5,reward:145,done:false,read:()=>game.wave},{text:'Clear 3 perfect waves',target:3,reward:200,done:false,read:()=>game.perfectWaves},{text:'Build 10 EMX towers/tools',target:10,reward:160,done:false,read:()=>game.towers.length+game.tools.length},{text:'Reach wave 12 to unlock harder maps',target:12,reward:260,done:false,read:()=>game.wave}]}
  function checkMissions(){for(const m of game.missions||[]){if(!m.done&&m.read()>=m.target){m.done=true;game.coins+=m.reward;game.score+=m.reward*3;addFloating(`MISSION +${m.reward}`,450,160,'#a8ff24');showToast(`Mission complete: ${m.text}. +${m.reward} coins`,2400);playSound('coin')}}}
  function useAbility(key){unlockAudio();if(!game||game.screen!=='game'||game.gameOver||game.victory)return;const a=game.abilities[key];if(!a||a.cd>0)return;if(key==='emp'){for(const e of game.enemies)e.slow=Math.max(e.slow,5.8);game.effects.push({type:'ring',x:450,y:500,color:'#93e8ff',life:.75,maxLife:.75,radius:60});addFloating('EMP FREEZE',450,500,'#93e8ff');playSound('ice')}if(key==='repair'){const before=game.lives;game.lives=clamp(game.lives+6,0,30);addFloating(`+${game.lives-before} LIVES`,path().at(-1).x,path().at(-1).y,'#a8ff24');playSound('win')}if(key==='overdrive'){game.overdrive=10;addFloating('OVERDRIVE',450,120,'#ff38f8');playSound('wave')}if(key==='mine'){const p=path()[Math.floor(path().length/2)];game.tools.push({id:game.nextToolId++,type:'mine',x:p.x,y:p.y});addFloating('MINE ARMED',p.x,p.y,'#ff38f8');playSound('mine')}if(key==='drone'){playSound('drone');for(const e of game.enemies){if(e.alive)damageEnemy(e,75,'pierce')}game.effects.push({type:'ring',x:450,y:500,color:'#a8ff24',life:.65,maxLife:.65,radius:20});addFloating('DRONE SWARM',450,500,'#a8ff24')}a.cd=a.max;updateUI()}
  function updateCooldowns(dt){Object.values(game.abilities).forEach(a=>a.cd=Math.max(0,a.cd-dt))}
  function formatCooldown(a){return a.cd<=0?'Ready':`${Math.ceil(a.cd)}s`}

  function selectTowerType(key){unlockAudio();playSound('tap');const t=towerTypes[key];if(!t)return;if(game.coins<t.cost){showToast('Not enough coins for that tower.');return}game.selectedType=game.selectedType===key?null:key;game.selectedTool=null;game.selectedTowerId=null;$('towerPanel').classList.add('hidden');updateUI()}
  function selectToolMode(key){unlockAudio();playSound('tap');const costs={barrier:135,boost:170,scrap:0};if(key!=='scrap'&&game.coins<costs[key]){showToast('Not enough coins for that tool.');return}game.selectedTool=game.selectedTool===key?null:key;game.selectedType=null;game.selectedTowerId=null;$('towerPanel').classList.add('hidden');updateUI()}
  function setDockMode(mode){dockMode=mode;['Towers','Tools','Abilities'].forEach(n=>{const el=$(`dock${n}Tab`);if(el)el.classList.toggle('active',dockMode===n.toLowerCase())});buildQuickDock()}
  function buildQuickDock(){
    const wrap=$('quickDockGrid');if(!wrap)return;wrap.innerHTML='';
    if(dockMode==='towers'){
      Object.values(towerTypes).forEach(t=>{const btn=document.createElement('button');btn.className='dock-item';btn.dataset.tower=t.key;btn.innerHTML=`<strong>${t.icon} ${t.name}</strong><small>${t.cost} coins • tap map to place</small>`;btn.onclick=()=>selectTowerType(t.key);wrap.appendChild(btn)});
    }else if(dockMode==='tools'){
      const tools=[['barrier','🛡️ Barrier','135 coins • path slow field'],['boost','💠 Boost','170 coins • tower buff pad'],['scrap','♻️ Scrap','tap placed tool to refund']];
      tools.forEach(([key,label,desc])=>{const btn=document.createElement('button');btn.className='dock-item';btn.dataset.tool=key;btn.innerHTML=`<strong>${label}</strong><small>${desc}</small>`;btn.onclick=()=>selectToolMode(key);wrap.appendChild(btn)});
    }else{
      const list=[['emp','🧊 EMP','freeze enemies'],['repair','💚 Repair','restore core lives'],['overdrive','⚡ Overdrive','buff all towers'],['mine','💣 Mine','instant path trap'],['drone','🛸 Drone','hit all enemies']];
      list.forEach(([key,label,desc])=>{const btn=document.createElement('button');btn.className='dock-item';btn.dataset.ability=key;btn.innerHTML=`<strong>${label}</strong><small>${desc}</small>`;btn.onclick=()=>useAbility(key);wrap.appendChild(btn)});
    }
    updateQuickDockState();
  }
  function updateQuickDockState(){
    const wrap=$('quickDockGrid');if(!wrap||!game)return;
    wrap.querySelectorAll('.dock-item').forEach(btn=>{
      const tower=btn.dataset.tower,tool=btn.dataset.tool,ability=btn.dataset.ability;
      if(tower){const t=towerTypes[tower];btn.classList.toggle('selected',game.selectedType===tower);btn.disabled=game.coins<t.cost;}
      if(tool){const costs={barrier:135,boost:170,scrap:0};btn.classList.toggle('selected',game.selectedTool===tool);btn.disabled=tool!=='scrap'&&game.coins<costs[tool];}
      if(ability){const a=game.abilities[ability];btn.disabled=!a||a.cd>0||game.screen!=='game';btn.classList.toggle('ready',!!a&&a.cd<=0);const small=btn.querySelector('small');if(small&&a)small.textContent=a.cd<=0?'Ready':`${Math.ceil(a.cd)}s cooldown`;}
    });
  }

  function buildTowerButtons(){const wrap=$('towerButtons');wrap.innerHTML='';Object.values(towerTypes).forEach(t=>{const btn=document.createElement('button');btn.className='tower-btn';btn.dataset.tower=t.key;btn.innerHTML=`<strong>${t.icon} ${t.name}</strong><small>${t.desc}<br>${t.cost} coins</small>`;btn.onclick=()=>selectTowerType(t.key);wrap.appendChild(btn)})}
  function buildLevelButtons(){const wrap=$('levelButtons');if(!wrap)return;wrap.innerHTML='';Object.values(levels).forEach((l,i)=>{const locked=game.levelUnlocked<i;const btn=document.createElement('button');btn.className='level-btn '+(game.levelKey===l.key?'selected':'');btn.disabled=locked;btn.innerHTML=`<strong>${l.icon} ${l.name}</strong><small>${locked?'Unlock by surviving more waves':l.desc}</small>`;btn.onclick=()=>{unlockAudio();if(locked)return;game.levelKey=l.key;playSound('tap');if(game.screen==='game'&&!game.waveActive&&!game.towers.length&&!game.enemies.length){game.lives=l.lives;game.coins=l.startCoins}buildLevelButtons();updateUI();showToast(`${l.name} selected.`)};wrap.appendChild(btn)})}
  function updateTowerButtonState(){document.querySelectorAll('.tower-btn').forEach(btn=>{const key=btn.dataset.tower,t=towerTypes[key];btn.classList.toggle('selected',game.selectedType===key);btn.disabled=game.coins<t.cost})}
  function updateToolButtons(){[['barrierToolBtn','barrier'],['boostToolBtn','boost'],['scrapToolBtn','scrap']].forEach(([id,k])=>{const b=$(id);if(!b)return;b.classList.toggle('selected',game.selectedTool===k)})}
  function updateAbilitiesUI(){[['emp','empText','empBtn'],['repair','repairText','repairBtn'],['overdrive','overdriveText','overdriveBtn'],['mine','mineText','mineBtn'],['drone','droneText','droneBtn']].forEach(([k,t,b])=>{const a=game.abilities[k];if(!$(t))return;$(t).textContent=formatCooldown(a);$(b).disabled=a.cd>0||game.screen!=='game';$(b).classList.toggle('ready',a.cd<=0&&game.screen==='game')})}
  function updateMissionsUI(){const w=$('missionList');if(!w)return;w.innerHTML=(game.missions||[]).map(m=>`<div class="mission-item ${m.done?'done':''}"><strong>${m.done?'✅':'🎯'} ${m.text}</strong><span>${Math.min(m.target,m.read())}/${m.target}</span></div>`).join('')}
  function updateStatusText(){if(game.gameOver||game.victory)return;if(game.selectedTool){$('statusText').textContent=game.selectedTool==='barrier'?'Tap the path to place a Barrier Gate.':game.selectedTool==='boost'?'Tap near towers to place a Boost Pad.':'Tap a field tool to scrap it.'}else if(game.selectedType){const t=towerTypes[game.selectedType];$('statusText').textContent=`${t.icon} ${t.name} selected. Tap an empty spot away from the path.`}else if(game.selectedTowerId){const t=getSelectedTower();if(t)$('statusText').textContent=`${towerTypes[t.type].name} selected. Upgrade, mod, or sell it.`}else if(!game.waveActive){$('statusText').textContent=`${level().icon} ${level().name}: Build towers/tools, then start the wave.`}else $('statusText').textContent='Wave running — towers attack automatically.'}
  function updateUI(refresh=true){if(!game)return;$('waveText').textContent=game.waveActive?`${game.wave}/${MAX_WAVES}`:`${Math.min(game.wave+1,MAX_WAVES)}/${MAX_WAVES}`;$('livesText').textContent=game.lives;$('coinsText').textContent=game.coins;$('scoreText').textContent=game.score;$('startWaveBtn').disabled=game.waveActive||game.gameOver||game.victory;$('startWaveBtn').textContent=game.waveActive?'Wave Running':game.wave>=MAX_WAVES?'Complete':'Start Wave';$('pauseBtn').textContent=game.paused?'Resume':'Pause';$('speedBtn').textContent=`${game.speed}x Speed`;if($('soundBtn'))$('soundBtn').textContent=audioMuted?'🔇 Sound':'🔊 Sound';updateAbilitiesUI();updateMissionsUI();updateToolButtons();updateQuickDockState();if(refresh)updateTowerButtonState();if(game.selectedTowerId)showTowerPanel();updateStatusText()}

  function showHowToPlay(){openModal(`<p class="eyebrow">How To Play</p><h2>Full EMX Tower Defense</h2><div class="guide-grid"><div class="guide-card"><h3>1. Pick a landscape</h3><p>Choose Neon Circuit, Frost Rift, Solar Dunes, or Void Core. Each map has a different path, vibe, bonus, and difficulty.</p></div><div class="guide-card"><h3>2. Build towers + tools</h3><p>Place towers off the path. Use Barrier Gates on the path, Boost Pads near towers, and Scrap Mode to remove field tools.</p></div><div class="guide-card"><h3>3. Upgrade to Level 5</h3><p>Tap any tower to upgrade. At level 3 it rolls a bonus mod: range, damage, or speed.</p></div><div class="guide-card"><h3>4. Use abilities</h3><p>EMP Freeze, Repair, Overdrive, EMX Mine, and Drone Swarm all have their own animations and sounds.</p></div><div class="guide-card"><h3>5. Survive bosses</h3><p>Boss waves happen every 5 waves. Beat wave 30 to save the EMX Core.</p></div></div>`)}
  function showTowerGuide(){const cards=Object.values(towerTypes).map(t=>`<div class="guide-card"><h3>${t.icon} ${t.name}</h3><p><strong>${t.cost} coins.</strong> ${t.desc} Range ${t.range}, damage ${t.damage}. Unique ${t.effect} attack sound/animation.</p></div>`).join('');openModal(`<p class="eyebrow">Tower Guide</p><h2>EMX Defense Towers</h2><div class="guide-grid">${cards}</div>`)}
  function showLevels(){const cards=Object.values(levels).map(l=>`<div class="guide-card"><h3>${l.icon} ${l.name}</h3><p>${l.desc}<br><strong>Start:</strong> ${l.startCoins} coins / ${l.lives} lives. <strong>Reward:</strong> ${Math.round(l.reward*100)}%.</p></div>`).join('');openModal(`<p class="eyebrow">Landscaped Levels</p><h2>Different Battlefields</h2><div class="guide-grid">${cards}</div>`)}
  function showWorkshop(){openModal(`<p class="eyebrow">Tools + Upgrades</p><h2>Full Upgrade System</h2><div class="guide-grid"><div class="guide-card"><h3>🛡️ Barrier Gate</h3><p>Costs 135. Place on the path. Creates a slow zone for enemies.</p></div><div class="guide-card"><h3>💠 Boost Pad</h3><p>Costs 170. Place off the path near towers to increase tower damage and fire rate.</p></div><div class="guide-card"><h3>⬆️ Tower Levels</h3><p>Towers now upgrade from L1 to L5. Level 3 adds a random Range, Damage, or Speed mod.</p></div><div class="guide-card"><h3>🔊 Sound pass</h3><p>Every click, placement, upgrade, tower attack, mine, drone, win, and lose event has its own sound file.</p></div></div>`)}
  function resetBest(){localStorage.removeItem(SAVE_KEY);loadBest();openModal('<h2>Best scores reset.</h2><p>Your EMX defense records were cleared.</p>')}
  function togglePause(){unlockAudio();if(game.screen!=='game')return;game.paused=!game.paused;playSound('tap');updateUI()}function toggleSpeed(){unlockAudio();game.speed=game.speed===1?2:game.speed===2?3:1;playSound('tap');updateUI()}function toggleSound(){unlockAudio();audioMuted=!audioMuted;if(!audioMuted)playSound('tap',.22);updateUI()}function goHome(){unlockAudio();saveProgress();game.running=false;game.paused=false;closeModal();showScreen('menu');playSound('tap')}
  function wireEvents(){$('playBtn').onclick=()=>startNewGame(game.levelKey);$('howBtn').onclick=()=>{unlockAudio();playSound('tap');showHowToPlay()};$('towerGuideBtn').onclick=()=>{unlockAudio();playSound('tap');showTowerGuide()};$('levelsBtn').onclick=()=>{unlockAudio();playSound('tap');showLevels()};$('workshopBtn').onclick=()=>{unlockAudio();playSound('tap');showWorkshop()};$('resetBestBtn').onclick=()=>{unlockAudio();playSound('tap');resetBest()};$('startWaveBtn').onclick=startWave;$('pauseBtn').onclick=togglePause;$('speedBtn').onclick=toggleSpeed;$('soundBtn').onclick=toggleSound;$('homeBtn').onclick=goHome;$('empBtn').onclick=()=>useAbility('emp');$('repairBtn').onclick=()=>useAbility('repair');$('overdriveBtn').onclick=()=>useAbility('overdrive');$('mineBtn').onclick=()=>useAbility('mine');$('droneBtn').onclick=()=>useAbility('drone');$('dockTowersTab').onclick=()=>{unlockAudio();playSound('tap');setDockMode('towers')};$('dockToolsTab').onclick=()=>{unlockAudio();playSound('tap');setDockMode('tools')};$('dockAbilitiesTab').onclick=()=>{unlockAudio();playSound('tap');setDockMode('abilities')};$('barrierToolBtn').onclick=()=>selectToolMode('barrier');$('boostToolBtn').onclick=()=>selectToolMode('boost');$('scrapToolBtn').onclick=()=>selectToolMode('scrap');$('upgradeTowerBtn').onclick=upgradeSelectedTower;$('sellTowerBtn').onclick=sellSelectedTower;$('closeTowerPanelBtn').onclick=()=>{game.selectedTowerId=null;$('towerPanel').classList.add('hidden');updateUI()};$('modalClose').onclick=closeModal;$('modal').onclick=(e)=>{if(e.target.id==='modal')closeModal()};canvas.addEventListener('pointerdown',onCanvasPointerDown,{passive:false});canvas.addEventListener('pointermove',onCanvasPointerMove,{passive:false});canvas.addEventListener('pointerup',onCanvasPointerUp,{passive:false});canvas.addEventListener('pointercancel',()=>{game.pointer.active=false});document.addEventListener('click',unlockAudio,{once:true})}
  function init(){game=makeGame('neon');loadAudio();buildTowerButtons();buildLevelButtons();buildQuickDock();wireEvents();loadBest();setTimeout(()=>$('boot').classList.add('done'),1300);requestAnimationFrame(gameLoop)}
  init();
})();
