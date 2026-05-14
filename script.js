(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const canvas = $('gameCanvas');
  const ctx = canvas.getContext('2d');
  const W = 900, H = 1000;
  const saveKey = 'emxCoreDefenseV3Save';
  const rand = (a,b)=>a+Math.random()*(b-a);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const choice=(arr)=>arr[Math.floor(Math.random()*arr.length)];
  const todaySeed = () => new Date().toISOString().slice(0,10).replaceAll('-','');

  const baseSave = {bestWave:0,bestScore:0,shards:0,stars:{grid:0,forest:0,desert:0,storm:0,lab:0,reactor:0}, lab:{coins:0,rate:0,lives:0,cooldown:0,cache:0,crit:0}, meta:{coins:0,damage:0,rate:0,lives:0,cooldown:0,economy:0,cache:0,crit:0,shards:0}, achievements:{}, settings:{sound:true,music:true,vibrate:true,reduced:false}};
  let save = loadSave();

  const LEVELS = [
    {key:'grid', name:'EMX Core Grid', desc:'Fast 15-wave starter sprint with balanced neon lanes and a final boss at Wave 15.', unlock:0, lives:25, coins:430, waves:15, color:'#72ff15', bg:'grid', mods:['15-wave sprint','Layered enemies','Final boss'], path:[[80,140],[770,140],[770,310],[140,310],[140,520],[820,520],[820,720],[105,720],[105,880],[790,880]], enemies:['layer1','layer2','glitch','runner','shielded','tank']},
    {key:'forest', name:'Glitch Forest', desc:'15-wave split-lane map with camo pressure, healers, and punchier rewards.', unlock:3, lives:24, coins:455, waves:15, color:'#2bff9c', bg:'forest', mods:['15-wave sprint','Split lane','Camo'], path:[[75,120],[790,120],[790,255],[470,255],[470,405],[135,405],[135,595],[815,595],[815,760],[105,760],[105,895],[790,895]], altPath:[[75,190],[310,190],[310,350],[790,350],[790,505],[510,505],[510,670],[790,670],[790,835]], enemies:['layer2','layer3','runner','swarm','healer','camo','shielded']},
    {key:'desert', name:'Cyber Desert', desc:'15-wave speed test. Runners and armor arrive earlier, but coins scale faster.', unlock:6, lives:22, coins:485, waves:15, color:'#ffd65a', bg:'desert', mods:['15-wave sprint','Fast enemies','Armor'], path:[[70,190],[820,190],[820,360],[215,360],[215,535],[805,535],[805,705],[150,705],[150,870],[790,870]], enemies:['fast','runner','layer3','shielded','tank','splitter']},
    {key:'storm', name:'Purple Storm City', desc:'15-wave aerial/camo map with storm-speed pacing and bigger end-round payouts.', unlock:9, lives:24, coins:505, waves:15, color:'#ff38f8', bg:'storm', mods:['15-wave sprint','Flying enemies','Camo'], path:[[80,115],[805,115],[805,290],[100,290],[100,455],[805,455],[805,640],[100,640],[100,825],[790,825]], enemies:['layer2','fast','camo','flyer','flyer','shielded','emp']},
    {key:'lab', name:'Overclock Lab', desc:'Elite 20-wave experimental battlefield with extra boss checks at Waves 5, 10, 15, and 20.', unlock:12, lives:26, coins:545, waves:20, color:'#55d7ff', bg:'lab', mods:['20 elite waves','Boss heavy','EMP'], path:[[85,105],[460,105],[460,250],[810,250],[810,420],[270,420],[270,570],[815,570],[815,745],[95,745],[95,890],[790,890]], enemies:['layer3','shielded','tank','emp','healer','splitter','fast','camo']},
    {key:'reactor', name:'Final Core Reactor', desc:'Elite 20-wave double entrance finale with compressed difficulty and the Final Glitch King.', unlock:16, lives:28, coins:585, waves:20, color:'#a84cff', bg:'reactor', mods:['20 elite waves','Double entrance','Final boss'], path:[[75,145],[800,145],[800,300],[115,300],[115,500],[815,500],[815,690],[155,690],[155,875],[795,875]], altPath:[[75,245],[310,245],[310,410],[805,410],[805,600],[435,600],[435,765],[795,765]], enemies:['layer3','fast','camo','flyer','shielded','tank','healer','emp','splitter']}
  ];

  const TOWERS = {
    flame:{icon:'🔥',name:'Flame Turret',cost:90,color:'#ff6b2c',hit:'burn',role:'damage',desc:'Burns enemies over time.',branchA:['Inferno Beam','Longer burn, better boss DPS'],branchB:['Napalm Burst','Splash fire explosions'],sfx:'flame'},
    tesla:{icon:'⚡',name:'Tesla Coil',cost:125,color:'#55d7ff',hit:'zap',role:'damage',desc:'Chains electric damage.',branchA:['Chain Storm','More chain jumps'],branchB:['EMP Tesla','Slows and stuns'],sfx:'zap'},
    cryo:{icon:'❄️',name:'Cryo Blaster',cost:110,color:'#9deaff',hit:'slow',role:'damage',desc:'Slows normal enemies. Fast glitches resist it.',branchA:['Arctic Lock','Heavy slows'],branchB:['Frost Shards','More damage to runners'],sfx:'ice'},
    venom:{icon:'☠️',name:'Venom Sprayer',cost:100,color:'#b2ff37',hit:'poison',role:'damage',desc:'Poison stacks damage.',branchA:['Toxic Cloud','Wider poison radius'],branchB:['Corrosive Venom','Ignores armor'],sfx:'poison'},
    rocket:{icon:'🚀',name:'Rocket Node',cost:155,color:'#ff3f82',hit:'splash',role:'damage',desc:'Splash explosions. Great against layers.',branchA:['Cluster Rockets','Bigger splash'],branchB:['Boss Breaker','Huge boss damage'],sfx:'rocket'},
    shadow:{icon:'🌑',name:'Shadow Sniper',cost:180,color:'#b36cff',hit:'pierce',role:'damage',desc:'Long range boss damage and natural camo detection.',branchA:['Void Rail','Pierce armor'],branchB:['Phantom Crit','High crit chance'],sfx:'shadow'},
    anti:{icon:'🎯',name:'Anti-Air Prism',cost:135,color:'#ffffff',hit:'laser',role:'damage',desc:'Best against flying drones.',branchA:['Sky Net','Huge anti-air range'],branchB:['Prism Scanner','Hits ground and reveals camo'],sfx:'laser'},
    hub:{icon:'💠',name:'EMX Hub',cost:160,color:'#55d7ff',hit:'support',role:'support',desc:'Support node that buffs nearby towers.',branchA:['Overclock Aura','Bigger aura and stronger attack-speed buff'],branchB:['Scanner Hub','Reveals camo and boosts nearby range'],sfx:'upgrade'},
    miner:{icon:'💰',name:'Crypto Miner',cost:145,color:'#ffd65a',hit:'economy',role:'economy',desc:'Economy node that generates coins after each wave.',branchA:['Yield Farm','More coins per wave'],branchB:['Shard Rig','Small chance to mine Core Shards'],sfx:'coin'}
  };
  const ENEMIES = {
    layer1:{name:'Neon Blue Layer',hp:34,speed:76,reward:7,color:'#55d7ff',score:28,layer:1},
    layer2:{name:'Neon Green Layer',hp:58,speed:68,reward:12,color:'#72ff15',score:45,layer:2,splitsTo:'layer1'},
    layer3:{name:'Purple Multi-Layer',hp:96,speed:58,reward:20,color:'#b026ff',score:80,layer:3,splitsTo:'layer2'},
    glitch:{name:'Glitch Creep',hp:72,speed:58,reward:16,color:'#ff38f8',score:55}, runner:{name:'Runner Glitch',hp:45,speed:105,reward:18,color:'#a8ff24',score:70,fast:true,slowImmune:true},
    fast:{name:'Hyper Fast Glitch',hp:62,speed:126,reward:24,color:'#d7ff4c',score:105,fast:true,slowImmune:true},
    camo:{name:'Camo Glitch',hp:78,speed:70,reward:30,color:'#cbb7ff',score:135,camo:true},
    shielded:{name:'Shielded Layer',hp:150,speed:46,reward:34,color:'#55d7ff',armor:10,shielded:true,score:140},
    shield:{name:'Shield Core',hp:130,speed:48,reward:26,color:'#55d7ff',armor:6,score:100}, swarm:{name:'Swarm Bug',hp:25,speed:82,reward:8,color:'#baffff',score:32},
    flyer:{name:'Flying Drone',hp:85,speed:72,reward:28,color:'#ffffff',flying:true,score:130}, tank:{name:'Tank Core',hp:260,speed:32,reward:42,color:'#ffd65a',armor:4,score:190},
    healer:{name:'Healer Unit',hp:120,speed:45,reward:35,color:'#72ff15',healer:true,score:150}, emp:{name:'EMP Warden',hp:150,speed:50,reward:38,color:'#a84cff',emp:true,score:165}, splitter:{name:'Splitter Core',hp:125,speed:55,reward:32,color:'#ff8d38',split:true,score:150},
    boss:{name:'Boss Core',hp:900,speed:31,reward:140,color:'#ff4f7a',armor:8,boss:true,score:900}, final:{name:'Final Glitch King',hp:2200,speed:27,reward:300,color:'#ff38f8',armor:10,boss:true,healer:true,emp:true,score:2500}
  };
  const META_UPGRADES = [
    {key:'coins',name:'Startup Cache',desc:'+50 starting coins per rank. Helps players reach upgraded towers within 15 waves.',cost:[2,4,7,11,16]},
    {key:'damage',name:'Global Damage Firmware',desc:'+3% damage for every attack tower per rank.',cost:[3,6,10,15,22]},
    {key:'rate',name:'Overclocked Towers',desc:'+4% fire rate per rank for all attack towers.',cost:[3,5,8,12,18]},
    {key:'lives',name:'Core Armor',desc:'+3 core lives per rank.',cost:[3,5,9,14,20]},
    {key:'cooldown',name:'Ability Cooling',desc:'Abilities recharge 10% faster per rank.',cost:[2,4,8,13,19]},
    {key:'economy',name:'Reward Multiplier',desc:'+8% coin rewards and miner income per rank.',cost:[3,6,10,15,22]},
    {key:'cache',name:'Cache Magnet',desc:'Bonus caches appear more often during active waves.',cost:[2,5,9,13,18]},
    {key:'crit',name:'Critical Firmware',desc:'+3% tower crit chance per rank.',cost:[3,6,10,15,22]},
    {key:'shards',name:'Shard Amplifier',desc:'+12% post-game Core Shard rewards per rank.',cost:[4,7,12,18,25]}
  ];
  const LAB = META_UPGRADES;
  const ACH = [
    {key:'firstWin',name:'Core Online',desc:'Win any campaign map.',check:()=>totalStars()>0}, {key:'fiveStars',name:'Campaign Climber',desc:'Earn 5 total stars.',check:()=>totalStars()>=5},
    {key:'bossSlayer',name:'Boss Slayer',desc:'Defeat 5 bosses total.',check:()=>stats.bosses>=5}, {key:'towerMaster',name:'Tower Master',desc:'Place 50 towers total.',check:()=>stats.towers>=50},
    {key:'million',name:'Neon Scorer',desc:'Reach 50,000 lifetime score.',check:()=>stats.score>=50000}, {key:'reactor',name:'Reactor Cleared',desc:'Earn stars on Final Core Reactor.',check:()=>save.stars.reactor>0}
  ];

  const TARGET_MODES = ['first','last','strongest','closest'];
  const TARGET_LABELS = {first:'First',last:'Last',strongest:'Strongest',closest:'Closest'};
  const ABILITY_META = {
    emp:{name:'🧊 EMP Freeze',cd:28}, repair:{name:'💚 Repair',cd:38}, overdrive:{name:'⚡ Overdrive',cd:33},
    mine:{name:'💣 Mine',cd:14}, drone:{name:'🛸 Drone',cd:30}, pulse:{name:'💥 Core Pulse',cd:42}
  };


  const SEND_GLITCHES = [
    {key:'layer1', icon:'🔵', name:'Blue Glitch Pack', cost:45, eco:3, count:5, cooldown:1.2, power:5, desc:'Cheap eco build.'},
    {key:'layer2', icon:'🟢', name:'Green Layer Stack', cost:90, eco:5, count:4, cooldown:1.8, power:9, desc:'Good pressure + eco.'},
    {key:'runner', icon:'💨', name:'Runner Rush', cost:130, eco:4, count:5, cooldown:2.4, power:13, desc:'Fast pressure.'},
    {key:'layer3', icon:'🟣', name:'Purple Split Pack', cost:185, eco:2, count:4, cooldown:3.0, power:18, desc:'Layered pressure.'},
    {key:'camo', icon:'👁️', name:'Camo Glitches', cost:240, eco:-4, count:3, cooldown:4.4, power:24, desc:'Punishes no scanners.'},
    {key:'shielded', icon:'🛡️', name:'Shield Core Push', cost:290, eco:-8, count:3, cooldown:5.2, power:34, desc:'High-damage check.'},
    {key:'tank', icon:'🟡', name:'Tank Core', cost:420, eco:-14, count:2, cooldown:6.6, power:52, desc:'Late-game kill push.'},
    {key:'boss', icon:'👑', name:'Boss Core Send', cost:780, eco:-28, count:1, cooldown:14, power:92, desc:'All-in finisher.'}
  ];
  const BATTLE_BOOSTS = {
    tower:{name:'Tower Overdrive', icon:'⚡', uses:3, duration:5},
    surge:{name:'Glitch Surge', icon:'🧬', uses:3, duration:5}
  };


  const WAVE_BLUEPRINTS = [
    {from:1,to:1,name:'Boot Lane',groups:[{type:'layer1',count:8,spacing:.42},{type:'glitch',count:2,spacing:.58}]},
    {from:2,to:3,name:'Layer Pop Rush',groups:[{type:'layer1',count:7,spacing:.34},{type:'layer2',count:5,spacing:.48},{type:'runner',count:2,spacing:.54}]},
    {from:4,to:4,name:'Shield Check',groups:[{type:'layer2',count:7,spacing:.40},{type:'shielded',count:2,spacing:.78},{type:'runner',count:4,spacing:.36}]},
    {from:5,to:5,name:'Minor Boss I',groups:[{type:'layer2',count:8,spacing:.36},{type:'shielded',count:3,spacing:.62},{type:'runner',count:5,spacing:.32}]},
    {from:6,to:7,name:'BTD Rush',groups:[{type:'layer3',count:4,spacing:.52},{type:'fast',count:6,spacing:.30},{type:'swarm',count:7,spacing:.20}]},
    {from:8,to:9,name:'Special Forces',groups:[{type:'layer3',count:6,spacing:.46},{type:'camo',count:4,spacing:.56},{type:'flyer',count:3,spacing:.64},{type:'shielded',count:3,spacing:.68}]},
    {from:10,to:10,name:'Minor Boss II',groups:[{type:'layer3',count:7,spacing:.40},{type:'fast',count:7,spacing:.28},{type:'camo',count:4,spacing:.52},{type:'tank',count:2,spacing:.78}]},
    {from:11,to:12,name:'Overclock Swarm',groups:[{type:'layer3',count:8,spacing:.38},{type:'fast',count:7,spacing:.27},{type:'shielded',count:5,spacing:.56},{type:'swarm',count:8,spacing:.18}]},
    {from:13,to:14,name:'Pre-Final Surge',groups:[{type:'layer3',count:9,spacing:.35},{type:'fast',count:8,spacing:.25},{type:'camo',count:5,spacing:.48},{type:'tank',count:3,spacing:.68}]},
    {from:15,to:15,name:'Final Boss Core',groups:[{type:'layer3',count:10,spacing:.32},{type:'shielded',count:6,spacing:.50},{type:'fast',count:8,spacing:.24},{type:'tank',count:3,spacing:.64}]},
    {from:16,to:19,name:'Elite Reactor Surge',groups:[{type:'layer3',count:11,spacing:.32},{type:'fast',count:9,spacing:.24},{type:'camo',count:6,spacing:.45},{type:'shielded',count:6,spacing:.50},{type:'tank',count:3,spacing:.62}]},
    {from:20,to:999,name:'Elite Final Boss Core',groups:[{type:'layer3',count:12,spacing:.30},{type:'fast',count:10,spacing:.22},{type:'camo',count:7,spacing:.42},{type:'shielded',count:7,spacing:.48},{type:'tank',count:4,spacing:.58}]}
  ];

  class WaveManager {
    constructor(level, mode){this.level=level;this.mode=mode;this.maxWaves=mode==='Endless'?999:(level.waves||15);}
    templateFor(wave){return WAVE_BLUEPRINTS.find(w=>wave>=w.from&&wave<=w.to)||WAVE_BLUEPRINTS[WAVE_BLUEPRINTS.length-1];}
    getWave(wave){
      const tpl=this.templateFor(wave);
      const mobile=isMobile();
      const levelPool=this.level.enemies||['layer1','layer2','glitch'];
      const maxWaves=this.maxWaves===999?Math.max(20,wave+5):this.maxWaves;
      const progress=clamp(wave/maxWaves,0,1.35);
      const elite=this.maxWaves>=20;
      const scale=(mobile ? .74 : 1) * (elite ? 1.06 : .96);
      const pressure=this.mode==='Endless' ? Math.min(3.15,1+wave*.05) : (0.88 + progress*1.32 + wave*.015);
      const spacingMul=clamp(1-progress*.26,.66,1);
      const groups=[];
      for(const g of tpl.groups){
        let type=levelPool.includes(g.type)?g.type:g.type;
        if(wave<4&&['tank','healer','emp','flyer','camo','shielded','layer3','fast'].includes(type)) type=wave<3?'layer1':'layer2';
        let count=Math.max(1,Math.round(g.count*scale*pressure));
        if(mobile&&wave>=7)count=Math.min(count, type==='swarm'?8:11);
        if(mobile&&this.maxWaves<=15&&wave>=12)count=Math.min(count, type==='tank'?3:12);
        groups.push({type,count,spacing:Math.max(.18,g.spacing*spacingMul)});
      }
      if(wave>=4&&levelPool.includes('camo')&&(wave===8||wave===12||wave%4===0))groups.push({type:'camo',count:mobile?2:3,spacing:.60});
      if(wave>=6&&levelPool.includes('flyer')&&(wave===9||wave%3===0))groups.push({type:'flyer',count:mobile?2:4,spacing:.58});
      if(wave>=8&&levelPool.includes('healer')&&(wave%4===1||wave>=14))groups.push({type:'healer',count:mobile?1:2,spacing:.92});
      const finalWave=this.maxWaves!==999&&wave>=this.maxWaves;
      const bossWave=finalWave || wave%5===0;
      if(bossWave)groups.push({type:finalWave?'final':'boss',count:1,spacing:.95});
      return {wave,name:tpl.name,groups,finalWave,bossWave};
    }
    buildQueue(wave, plan=this.getWave(wave)){
      const queue=[];
      let time=.12;
      const altChance=this.level.altPath ? .36 : 0;
      const maxQueue=isMobile()?58:94;
      for(const group of plan.groups){
        for(let i=0;i<group.count&&queue.length<maxQueue;i++){
          queue.push({type:group.type,delay:time,alt:Math.random()<altChance,spacing:group.spacing});
          time+=group.spacing;
        }
        time+=Math.min(.76,group.spacing*1.55);
      }
      return queue.sort((a,b)=>a.delay-b.delay);
    }
    describe(plan){return plan.groups.map(g=>`${g.count} ${ENEMIES[g.type]?.name||g.type}`).join(' • ');}
  }

  let stats = Object.assign({bosses:0,towers:0,score:0,wins:0}, save.stats || {});

  let game = null, last = performance.now(), toastTimer = 0, dockTab = 'towers', audioUnlocked = false, audioCtx = null, resultAnimFrame = 0;
  let uiTimer = 0, fxBudgetTimer = 0, frameNow = 0, staticCanvas = null, staticCtx = null, staticKey = '';
  let lastSoundAt = {};
  const PERF = { maxEnemies: 44, maxProjectiles: 42, maxEffects: 40, maxFloating: 20, uiHz: 5, soundGap: 110 };
  const perfActive = () => !!(game && (game.perfMode || save.settings.reduced || isMobile()));
  const sfx = {};
  const soundGate = {};
  const perf = { ui: 0, dock: 0, frames: 0, autoLowFx: false };
  const isMobile = () => matchMedia('(max-width: 900px), (pointer: coarse)').matches;
  const lowFx = () => !!(save.settings.reduced || perf.autoLowFx || isMobile() || (game && game.perfMode));
  const capArray = (arr, max) => arr.length > max ? arr.slice(arr.length - max) : arr;


  function loadSave(){try{return merge(JSON.parse(localStorage.getItem(saveKey)||'{}'), baseSave)}catch{return JSON.parse(JSON.stringify(baseSave))}}
  function merge(a,b){const out=Array.isArray(b)?[]:{};for(const k in b){out[k]=typeof b[k]==='object'&&b[k]!==null&&!Array.isArray(b[k])?merge(a?.[k]||{},b[k]):(a?.[k]??b[k])}for(const k in a||{}) if(!(k in out)) out[k]=a[k]; return out;}
  function persist(){save.stats=stats;localStorage.setItem(saveKey,JSON.stringify(save)); updateMenu();}
  function totalStars(){return Object.values(save.stars||{}).reduce((a,b)=>a+(b||0),0)}
  function metaRank(k){return (save.meta&&save.meta[k]!==undefined?save.meta[k]:(save.lab&&save.lab[k])||0)||0}
  function labRank(k){return metaRank(k)}
  function buyMetaUpgrade(item){const r=metaRank(item.key), next=item.cost[r]; if(next===undefined||save.shards<next)return false; save.shards-=next; save.meta=save.meta||{}; save.meta[item.key]=r+1; if(save.lab&&item.key in save.lab)save.lab[item.key]=r+1; playSound('upgrade'); persist(); return true}
  function coinMultiplier(){return 1 + metaRank('economy')*.08 + ((game && game.maxWaves<=15) ? .08 : .04)}
  function levelByKey(k){return LEVELS.find(l=>l.key===k)||LEVELS[0]}
  function unlocked(level){return totalStars()>=level.unlock}

  window.addEventListener('load',()=>setTimeout(()=>$('boot').classList.add('done'),650));
  document.addEventListener('click',(e)=>{const go=e.target.closest('[data-go]'); if(go) showScreen(go.dataset.go);});

  function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===id)); if(id==='menuScreen'){if(game)game.paused=true; updateMenu();} if(id==='mapScreen') renderMaps(); if(id==='labScreen') renderLab(); if(id==='achievementScreen') renderAchievements(); window.scrollTo({top:0,behavior:'instant'});}
  function updateMenu(){ $('bestWaveText').textContent=save.bestWave||0; $('bestScoreText').textContent=save.bestScore||0; $('shardText').textContent=save.shards||0; $('starsText').textContent=totalStars(); }

  $('campaignBtn').onclick=()=>{playSound('tap'); showScreen('mapScreen');};
  $('endlessBtn').onclick=()=>{playSound('tap'); startGame('grid','Endless');};
  $('battleBtn').onclick=()=>{playSound('tap'); startGame('storm','Battles Bot');};
  $('dailyBtn').onclick=()=>{playSound('tap'); const idx=Number(todaySeed())%LEVELS.length; startGame(LEVELS[idx].key,'Daily Challenge');};
  $('labBtn').onclick=()=>{playSound('tap'); showScreen('labScreen');};
  $('achievementsBtn').onclick=()=>{playSound('tap'); showScreen('achievementScreen');};
  $('guideBtn').onclick=()=>openGuide();
  $('settingsBtn').onclick=()=>openSettings();
  $('gameMenuBtn').onclick=()=>{playSound('tap'); game.paused=true; showScreen('mapScreen');};
  $('homeBtn').onclick=()=>{playSound('tap'); game.paused=true; showScreen('menuScreen');};
  $('modalClose').onclick=closeModal;

  function renderMaps(){const grid=$('mapGrid');grid.innerHTML='';LEVELS.forEach((l,i)=>{const stars=save.stars[l.key]||0;const isOpen=unlocked(l);const card=document.createElement('div');card.className='map-card glass';card.innerHTML=`<div class="card-row"><h3>${isOpen?'':'🔒 '}${l.name}</h3><span class="tag">${'⭐'.repeat(stars)||'No stars'}</span></div><p>${l.desc}</p><div class="tag-row">${l.mods.map(m=>`<span class="tag">${m}</span>`).join('')}<span class="tag">${l.waves} waves</span></div><br><button class="big-btn ${isOpen?'primary':''}" ${isOpen?'':'disabled'}>${isOpen?'Play Level':`Need ${l.unlock} stars`}</button>`;card.querySelector('button').onclick=()=>startGame(l.key,'Campaign');grid.appendChild(card);});}
  function renderLab(){
    const grid=$('labGrid');grid.innerHTML='';
    LAB.forEach(item=>{
      const r=metaRank(item.key);const next=item.cost[r];
      const card=document.createElement('div');card.className='lab-card glass';
      card.innerHTML=`<h3>${item.name} <span class="tag">Rank ${r}/5</span></h3><p>${item.desc}</p><div class="meta-progress"><i style="width:${Math.round(r/5*100)}%"></i></div><div class="card-row"><span class="tag">Core Shards: ${save.shards}</span><button class="big-btn primary" ${next===undefined||save.shards<next?'disabled':''}>${next===undefined?'MAX':`Upgrade ${next} shards`}</button></div>`;
      card.querySelector('button').onclick=()=>{if(buyMetaUpgrade(item))renderLab();};
      grid.appendChild(card);
    });
  }
  function renderAchievements(){checkAchievements();const grid=$('achievementGrid');grid.innerHTML='';ACH.forEach(a=>{const done=!!save.achievements[a.key];const card=document.createElement('div');card.className='achievement-card glass';card.innerHTML=`<h3>${done?'✅':'⬛'} ${a.name}</h3><p>${a.desc}</p><span class="tag">${done?'Claimed +2 shards':'Locked'}</span>`;grid.appendChild(card);});}
  function checkAchievements(){ACH.forEach(a=>{if(!save.achievements[a.key]&&a.check()){save.achievements[a.key]=true;save.shards+=2;showToast(`Achievement unlocked: ${a.name} +2 shards`);}});persist();}

  function startGame(levelKey, mode){
    unlockAudio();
    const level=levelByKey(levelKey);
    const labCoins=metaRank('coins')*50 + metaRank('economy')*12, labLives=metaRank('lives')*3;
    game={
      mode,levelKey,level,wave:1,maxWaves:mode==='Endless'?999:level.waves,
      lives:level.lives+labLives,coins:level.coins+labCoins,score:0,kills:0,bossKills:0,
      towers:[],enemies:[],projectiles:[],effects:[],floating:[],tools:[],crates:[],
      spawnQueue:[],spawnTimer:0,wavePlan:null,waveActive:false,paused:false,speed:1,
      selectedType:null,selectedTool:null,selectedTowerId:null,
      nextEnemyId:1,nextTowerId:1,nextProjectileId:1,nextToolId:1,
      abilities:{emp:0,repair:0,overdrive:0,mine:0,drone:0,pulse:0},
      overdrive:0,perfect:true,combo:0,comboTimer:0,cacheTimer:8,shake:0,uiTimer:0,
      perfWarned:false,shakeCap:0,message:'Pick a tower, then tap the field.',uiDirty:true,perfMode:false,
      turboBonus:0,pulseReady:false,waveManager:null,runStartedAt:performance.now(),coinMul:1+metaRank('economy')*.08,shardMul:1+metaRank('shards')*.12
    };
    game.waveManager=new WaveManager(level,mode);
    if(mode==='Battles Bot'){
      game.maxWaves=20;
      game.waveManager.maxWaves=20;
      game.lives=30+labLives;
      game.coins=650+labCoins;
      game.battle=createBattleState();
      game.message='Battles mode: defend your core, build eco, send glitches, and knock out the bot core.';
    }
    dockTab=mode==='Battles Bot'?'send':'towers'; staticKey=''; showScreen('gameScreen');
    $('levelNameText').textContent=level.name; $('modeText').textContent=mode;
    renderDock(); updateUI();
  }

  $('dockTowersTab').onclick=()=>{dockTab='towers';renderDock();playSound('tap')}; $('dockToolsTab').onclick=()=>{dockTab='tools';renderDock();playSound('tap')}; $('dockAbilitiesTab').onclick=()=>{dockTab='abilities';renderDock();playSound('tap')}; $('dockSendTab').onclick=()=>{dockTab='send';renderDock();playSound('tap')};
  $('startWaveBtn').onclick=()=>startWave(); $('pauseBtn').onclick=()=>{game.paused=!game.paused;updateUI();playSound('tap')}; $('speedBtn').onclick=()=>{const maxSpeed=isMobile()?2:3;game.speed=game.speed>=maxSpeed?1:game.speed+1;game.perfMode=shouldPerfMode(); if(game.speed>1){game.turboBonus=Math.max(game.turboBonus||0, game.wave); showToast('Turbo mode: smoother fast-forward + bonus coins.');} updateUI();playSound('tap')}; $('soundBtn').onclick=()=>{save.settings.sound=!save.settings.sound;persist();updateUI();unlockAudio();playSound('tap')};
  $('upgradeTowerBtn').onclick=()=>upgradeTower(); $('sellTowerBtn').onclick=()=>sellTower(); $('branchTowerBtn').onclick=()=>openBranchModal(); $('targetModeBtn').onclick=()=>cycleTargetMode(); $('closeTowerPanelBtn').onclick=()=>{game.selectedTowerId=null;$('towerPanel').classList.add('hidden')};

  function renderDock(){
    document.querySelectorAll('.dock-tab').forEach(b=>b.classList.remove('active'));
    $('dock'+dockTab[0].toUpperCase()+dockTab.slice(1)+'Tab')?.classList.add('active');
    const grid=$('quickDockGrid'); grid.innerHTML=''; if(!game)return;
    if(dockTab==='towers'){
      Object.entries(TOWERS).forEach(([key,t])=>{
        const tag=t.role==='support'?' • Buff':t.role==='economy'?' • Income':'';
        const cls=t.role==='support'?'support-node':t.role==='economy'?'economy-node':'';
        const btn=dockButton(`${t.icon} ${t.name}`,`${t.cost} coins${tag}`,game.selectedType===key,cls);
        btn.onclick=()=>{game.selectedType=key;game.selectedTool=null;game.selectedTowerId=null;$('towerPanel').classList.add('hidden');game.message=`Place ${t.name}.`;updateUI();playSound('tap')};
        grid.appendChild(btn);
      });
    }
    if(dockTab==='tools'){
      [{k:'barrier',n:'🛡️ Barrier',d:'135 coins'},{k:'boost',n:'💠 Boost Pad',d:'170 coins'},{k:'scrap',n:'♻️ Scrap',d:'Remove tool'}].forEach(t=>{
        const b=dockButton(t.n,t.d,game.selectedTool===t.k);
        b.onclick=()=>{game.selectedTool=t.k;game.selectedType=null;game.message=t.k==='scrap'?'Tap a tool to remove it.':`Place ${t.n}.`;updateUI();playSound('tap')};
        grid.appendChild(b);
      });
    }
    if(dockTab==='abilities'){
      Object.entries(ABILITY_META).forEach(([k,m])=>{
        const cd=Math.max(0,game.abilities[k]||0);
        const pct=clamp((1-cd/m.cd)*100,0,100);
        const b=dockButton(m.name,cd>0?`${Math.ceil(cd)}s`:'Ready',false,'ability-item'+(cd<=0?' ready':''));
        b.style.setProperty('--p', pct.toFixed(0));
        b.insertAdjacentHTML('afterbegin','<i class="cool-ring"></i>');
        b.disabled=cd>0;
        b.onclick=()=>useAbility(k);
        grid.appendChild(b);
      });
    }
    if(dockTab==='send'){
      if(!game.battle || !game.battle.active){
        const info=document.createElement('div');
        info.className='battle-log';
        info.textContent='Send Glitches unlocks inside EMX Battles Bot mode.';
        grid.appendChild(info);
        return;
      }
      const boosts=document.createElement('div');
      boosts.className='battle-boosts';
      boosts.innerHTML=`<button class="battle-boost" id="towerBoostBtn"><strong>⚡ Tower Overdrive</strong><span>${game.battle.boosts.tower} uses • ${Math.ceil(game.battle.towerBoostTimer||0)}s active</span></button><button class="battle-boost" id="surgeBoostBtn"><strong>🧬 Glitch Surge</strong><span>${game.battle.boosts.surge} uses • ${Math.ceil(game.battle.glitchSurgeTimer||0)}s active</span></button>`;
      grid.appendChild(boosts);
      setTimeout(()=>{
        const tb=$('towerBoostBtn'), gb=$('surgeBoostBtn');
        if(tb){tb.disabled=game.battle.boosts.tower<=0||game.battle.towerBoostTimer>0;tb.onclick=()=>useBattleBoost('tower')}
        if(gb){gb.disabled=game.battle.boosts.surge<=0||game.battle.glitchSurgeTimer>0;gb.onclick=()=>useBattleBoost('surge')}
      });
      SEND_GLITCHES.forEach(item=>{
        const cd=Math.max(0,game.battle.sendCooldowns[item.key]||0);
        const ratio=clamp(cd/item.cooldown,0,1);
        const b=dockButton(`${item.icon} ${item.name}`,`${item.cost} coins • ${item.desc}`,false,`send-item ${item.eco>=0?'eco-up':'eco-down'}`);
        b.style.setProperty('--cool', ratio.toFixed(2));
        b.insertAdjacentHTML('afterbegin',`<i class="cooldown-sweep"></i><b class="eco-tag">${item.eco>=0?'+':''}${item.eco} eco</b>`);
        b.disabled=cd>0||game.coins<item.cost;
        b.onclick=()=>sendGlitch(item.key);
        grid.appendChild(b);
      });
      const log=document.createElement('div');
      log.className='battle-log';
      log.textContent=game.battle.log[0]||'Build eco with cheap sends, then punish with camo/shield/tank sends.';
      grid.appendChild(log);
    }
  }
  function dockButton(name, sub, active, extra=''){
    const b=document.createElement('button');
    b.className='dock-item'+(active?' active':'')+(extra?' '+extra:'');
    b.innerHTML=`<span class="dock-label">${name}</span><span>${sub}</span>`;
    return b;
  }



  function createBattleState(){
    return {
      active:true,
      playerEco:250,
      opponentEco:250,
      ecoTimer:6,
      opponentLives:30,
      opponentCoins:650,
      opponentTowers:2,
      opponentPressure:0,
      opponentShield:14,
      botTimer:3.2,
      botBuildTimer:7.5,
      resolveTimer:1.05,
      sendCooldowns:{},
      boosts:{tower:3,surge:3},
      towerBoostTimer:0,
      glitchSurgeTimer:0,
      surgeMultiplier:1,
      log:['Battles started — send cheap glitches to build eco.']
    };
  }
  function battleLog(msg){
    if(!game?.battle)return;
    game.battle.log.unshift(msg);
    game.battle.log=game.battle.log.slice(0,4);
    game.message=msg;
  }
  function updateBattle(dt){
    const b=game?.battle;
    if(!b||!b.active)return;
    b.ecoTimer-=dt;
    b.botTimer-=dt;
    b.botBuildTimer-=dt;
    b.resolveTimer-=dt;
    b.towerBoostTimer=Math.max(0,b.towerBoostTimer-dt);
    b.glitchSurgeTimer=Math.max(0,b.glitchSurgeTimer-dt);
    b.surgeMultiplier=b.glitchSurgeTimer>0?1.5:1;
    for(const k in b.sendCooldowns)b.sendCooldowns[k]=Math.max(0,b.sendCooldowns[k]-dt);
    if(b.ecoTimer<=0){
      b.ecoTimer+=6;
      const income=Math.max(0,Math.round(b.playerEco));
      game.coins+=income;
      game.score+=Math.round(income*.8);
      b.opponentCoins+=Math.max(0,Math.round(b.opponentEco));
      addFloating(`ECO +${income}`,455,120,'#a8ff24');
      playSound('coin',.18);
    }
    if(b.botBuildTimer<=0){
      b.botBuildTimer=rand(6.5,10.5);
      if(b.opponentCoins>180){b.opponentCoins-=160;b.opponentTowers++;battleLog(`Bot built tower ${b.opponentTowers}. Send stronger glitches.`)}
    }
    if(b.botTimer<=0){
      botSendGlitches();
      b.botTimer=clamp(rand(3.6,6.2)-game.wave*.08,2.4,6.2);
    }
    if(b.resolveTimer<=0){
      b.resolveTimer=.9;
      resolveOpponentBoard();
    }
  }
  function sendGlitch(key){
    const b=game?.battle, item=SEND_GLITCHES.find(x=>x.key===key);
    if(!b||!item)return;
    if((b.sendCooldowns[key]||0)>0)return showToast('Send is cooling down.');
    if(game.coins<item.cost)return showToast('Not enough coins.');
    game.coins-=item.cost;
    b.playerEco=Math.max(0,b.playerEco+item.eco);
    b.sendCooldowns[key]=item.cooldown;
    const boost=b.surgeMultiplier||1;
    const waveScale=1+game.wave*.055;
    b.opponentPressure+=item.power*boost*waveScale;
    b.opponentShield=Math.max(0,b.opponentShield-item.power*.18*boost);
    game.score+=Math.round(item.power*16);
    addFloating(`${item.icon} SENT`,450,185,item.eco>=0?'#a8ff24':'#ff4f7a');
    battleLog(`${item.name} sent • eco ${item.eco>=0?'+':''}${item.eco} • pressure ${Math.round(b.opponentPressure)}`);
    playSound(item.key==='boss'?'blast':'wave',.28);
    updateUI();
  }
  function useBattleBoost(kind){
    const b=game?.battle;
    if(!b||b.boosts[kind]<=0)return;
    if(kind==='tower'){
      b.boosts.tower--;
      b.towerBoostTimer=BATTLE_BOOSTS.tower.duration;
      game.overdrive=Math.max(game.overdrive,5);
      addFloating('BATTLE OVERDRIVE',450,150,'#ffd65a');
      battleLog('Tower Overdrive active: all friendly towers fire faster for 5s.');
      playSound('upgrade',.42);
    }
    if(kind==='surge'){
      b.boosts.surge--;
      b.glitchSurgeTimer=BATTLE_BOOSTS.surge.duration;
      b.opponentPressure*=1.18;
      addFloating('GLITCH SURGE',450,150,'#ff38f8');
      battleLog('Glitch Surge active: your sent glitches hit the bot board harder for 5s.');
      playSound('nova',.42);
    }
    updateUI();renderDock();
  }
  function botSendGlitches(){
    const b=game?.battle;if(!b)return;
    const pool=game.wave<4?['layer1','layer1','runner']:(game.wave<9?['layer1','layer2','runner','shielded']:['layer2','runner','layer3','camo','shielded','fast']);
    const type=choice(pool);
    const count=type==='shielded'||type==='camo'?2:(type==='layer3'?3:4);
    for(let i=0;i<count;i++){
      game.spawnQueue.push({type,delay:.12+i*.34,alt:Math.random()<.24,spacing:.34,bot:true});
    }
    game.spawnQueue.sort((a,b)=>a.delay-b.delay);
    game.spawnTimer=Math.min(game.spawnTimer||.12,.12);
    b.opponentEco=Math.max(120,b.opponentEco+(type==='layer1'?3:type==='layer2'?4:type==='runner'?3:-4));
    battleLog(`Bot sent ${count} ${ENEMIES[type]?.name||type}. Defend your lane.`);
    playSound('wave',.16);
  }
  function resolveOpponentBoard(){
    const b=game?.battle;if(!b||b.opponentPressure<=0)return;
    const defense=12+b.opponentTowers*9+b.opponentShield*.22;
    const surge=b.glitchSurgeTimer>0?1.35:1;
    const leak=Math.max(0,(b.opponentPressure*surge-defense)*.055);
    const chip=Math.max(0.08,b.opponentPressure*.012);
    const dmg=leak>0?Math.ceil(leak): (Math.random()<.28?1:0);
    if(dmg>0){
      b.opponentLives-=dmg;
      b.opponentShield=Math.max(0,b.opponentShield-dmg*.8);
      addFloating(`BOT -${dmg}`,720,112,'#ff38f8');
      playSound('coin',.08);
      if(b.opponentLives<=0){
        b.opponentLives=0;
        battleLog('Bot core breached — EMX Battles win.');
        endGame(true);
        return;
      }
    }
    b.opponentPressure=Math.max(0,b.opponentPressure-defense*.025-chip);
    b.opponentShield=Math.min(24,b.opponentShield+.28+b.opponentTowers*.015);
  }

  function startWave(){
    if(!game||game.waveActive||game.lives<=0)return;
    unlockAudio();
    game.waveActive=true; game.perfect=true;
    game.wavePlan=game.waveManager.getWave(game.wave);
    game.spawnQueue=game.waveManager.buildQueue(game.wave,game.wavePlan);
    game.spawnTimer=.12;
    game.message=`${game.wavePlan.name}: ${game.waveManager.describe(game.wavePlan)}`;
    playSound('wave');
    updateUI();
  }
  function makeWave(wave){
    if(!game.waveManager)game.waveManager=new WaveManager(game.level,game.mode);
    const plan=game.waveManager.getWave(wave);
    return game.waveManager.buildQueue(wave,plan);
  }
  function makeEnemyObject(type,data,path,x,y,pathIndex=0,progress=0,scale=1){
    const hp=Math.max(1,Math.round(data.hp*scale));
    return {id:game.nextEnemyId++,type,name:data.name,x,y,pathIndex,path,progress,hp,maxHp:hp,speed:data.speed*(game.level.bg==='desert'?1.08:1),reward:data.reward,score:data.score,color:data.color,armor:data.armor||0,flying:!!data.flying,healer:!!data.healer,emp:!!data.emp,split:!!data.split,boss:!!data.boss,layer:data.layer||0,splitsTo:data.splitsTo||null,shielded:!!data.shielded,fast:!!data.fast,camo:!!data.camo,slowImmune:!!data.slowImmune,alive:true,slow:0,burn:0,poison:0,stun:0,statusEffects:[]};
  }
  function spawnEnemy(item){
    const data=ENEMIES[item.type]||ENEMIES.layer1;
    const scale=1+game.wave*.10+(game.mode==='Endless'?game.wave*.022:0);
    const path=item.alt&&game.level.altPath?game.level.altPath:game.level.path;
    const e=makeEnemyObject(item.type,data,path,path[0][0],path[0][1],0,0,scale);
    game.enemies.push(e);
    if(e.camo&&game.wave<7)addFloating('CAMO',e.x+38,e.y-18,'#cbb7ff');
    if(e.boss){game.shake=.7;addFloating('BOSS WARNING',450,90,'#ff4f7a');playSound('blast');}
  }
  function spawnLayerChildren(parent){
    if(!parent.splitsTo||game.enemies.length>=PERF.maxEnemies-2)return;
    const data=ENEMIES[parent.splitsTo]; if(!data)return;
    const count=game.perfMode?1:2;
    const scale=1+game.wave*.055;
    for(let i=0;i<count&&game.enemies.length<PERF.maxEnemies;i++){
      const child=makeEnemyObject(parent.splitsTo,data,parent.path,parent.x+rand(-12,12),parent.y+rand(-12,12),parent.pathIndex,parent.progress,scale);
      child.slow=Math.max(0,parent.slow*.6); child.stun=Math.max(0,parent.stun*.35);
      game.enemies.push(child);
    }
    addFloating(`LAYER POP ×${count}`,parent.x,parent.y-34,parent.color);
  }



  function loop(now){const raw=Math.min(.05,(now-last)/1000);last=now;if(raw>.045&&game&&!game.perfWarned){perf.autoLowFx=true;game.perfWarned=true;showToast('Performance mode enabled for smoother battle.',1800)} if(game&&!game.paused){game.perfMode=shouldPerfMode(); update(Math.min(.085, raw * game.speed));} if(document.visibilityState!=='hidden') draw(); requestAnimationFrame(loop);} requestAnimationFrame(loop);
  function shouldPerfMode(){return !!(game && (save.settings.reduced || perf.autoLowFx || (isMobile() && (game.wave>=7 || game.speed>1 || game.enemies.length>22 || game.projectiles.length>30)) || game.enemies.length>36 || game.projectiles.length>40));}
  function update(dt){if(!game)return; if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').classList.add('hidden')} const cdMul=1+labRank('cooldown')*.10; for(const k in game.abilities) game.abilities[k]=Math.max(0,game.abilities[k]-dt*cdMul); game.overdrive=Math.max(0,game.overdrive-dt); game.shake=Math.max(0,game.shake-dt); updateBattle(dt); updateSpawn(dt); updateEnemies(dt); updateTools(dt); updateTowers(dt); updateProjectiles(dt); updateCrates(dt); updateEffects(dt); checkWaveEnd(); game.uiTimer=(game.uiTimer||0)+dt; const uiGap=game.perfMode ? .24 : .14; if(game.uiTimer>uiGap){game.uiTimer=0; updateUI(false);}}
  function updateSpawn(dt){if((!game.waveActive && !(game.battle&&game.battle.active))||!game.spawnQueue.length)return; game.spawnTimer-=dt; let spawned=0; while(game.spawnQueue.length&&game.spawnTimer<=0){if(game.enemies.length>=PERF.maxEnemies || (game.perfMode&&spawned>=2)){game.spawnTimer=game.perfMode ? .28 : .18;break;}const item=game.spawnQueue.shift();spawnEnemy(item); spawned++; const next=game.spawnQueue[0]; game.spawnTimer=next?Math.max(game.perfMode ? .18 : .11,next.delay-item.delay):999;}}
  function applyStatus(e,type,opts={}){
    if(!e||!e.alive)return;
    if(type==='frozen'&&e.slowImmune){if(Math.random()<.1)addFloating('FAST RESIST',e.x,e.y-34,'#d7ff4c');return;}
    e.statusEffects=e.statusEffects||[];
    const existing=e.statusEffects.find(s=>s.type===type);
    const data={
      type,
      remaining:opts.duration??2,
      duration:opts.duration??2,
      magnitude:opts.magnitude??0,
      dps:opts.dps??0,
      tick:0,
      color:opts.color||'#fff'
    };
    if(existing){
      existing.remaining=Math.max(existing.remaining,data.remaining);
      existing.duration=Math.max(existing.duration,data.duration);
      existing.magnitude=Math.max(existing.magnitude||0,data.magnitude||0);
      existing.dps=Math.max(existing.dps||0,data.dps||0);
      existing.color=data.color;
    }else e.statusEffects.push(data);
  }
  function getStatus(e,type){return (e.statusEffects||[]).find(s=>s.type===type&&s.remaining>0)}
  function updateStatusEffects(e,dt){
    if(!e.statusEffects)e.statusEffects=[];
    for(const s of e.statusEffects){
      s.remaining-=dt;
      if((s.type==='burn'||s.type==='venom')&&s.dps>0){
        s.tick=(s.tick||0)+dt;
        while(s.tick>=1&&e.alive){
          s.tick-=1;
          damageEnemy(e,s.dps,s.type==='venom'?'dotVenom':'dotBurn',true);
        }
      }
    }
    e.statusEffects=e.statusEffects.filter(s=>s.remaining>0);
  }
  function enemySpeedMultiplier(e){
    let mult=1;
    const frozen=getStatus(e,'frozen');
    if(frozen&&!e.slowImmune)mult*=clamp(1-(frozen.magnitude||.45),.18,1);
    if(e.slow>0&&!e.slowImmune)mult*=.45;
    return clamp(mult,.18,1);
  }
  function coreDamage(e){
    if(e.boss)return e.type==='final'?12:6;
    if(e.layer)return e.layer;
    if(e.type==='tank')return 4;
    if(e.shielded)return 3;
    if(e.type==='splitter')return 2;
    return Math.max(1,Math.min(3,Math.ceil((e.maxHp||1)/130)));
  }
  function updateEnemies(dt){
    for(const e of game.enemies){
      if(!e.alive)continue;
      updateStatusEffects(e,dt);
      if(!e.alive)continue;
      if(e.slow>0)e.slow-=dt;
      if(e.stun>0){e.stun-=dt;continue;}
      if(e.healer&&Math.random()<.025){
        for(const o of game.enemies){
          if(o!==e&&o.alive&&Math.hypot(o.x-e.x,o.y-e.y)<120)o.hp=Math.min(o.maxHp,o.hp+18*dt);
        }
      }
      if(e.emp&&Math.random()<.006){
        const t=nearestTower(e.x,e.y,120);
        if(t){t.disabled=2.2;addFloating('EMP',t.x,t.y-20,'#a84cff');}
      }
      moveEnemy(e,e.speed*enemySpeedMultiplier(e)*dt);
      if(e.pathIndex>=e.path.length-1){
        e.alive=false;
        const loss=coreDamage(e);
        game.lives-=loss;
        game.perfect=false;
        game.shake=.35;
        addFloating(`-${loss} LIFE${loss>1?'S':''}`,780,850,'#ff4f7a');
        playSound('lose',.25);
        if(game.lives<=0)endGame(false);
      }
    }
    game.enemies=game.enemies.filter(e=>e.alive);
  }
  function moveEnemy(e,dist){while(dist>0&&e.pathIndex<e.path.length-1){const a=e.path[e.pathIndex],b=e.path[e.pathIndex+1],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),remain=len-e.progress;if(dist<remain){e.progress+=dist;e.x=a[0]+dx*(e.progress/len);e.y=a[1]+dy*(e.progress/len);dist=0}else{dist-=remain;e.pathIndex++;e.progress=0;if(e.pathIndex<e.path.length-1){e.x=e.path[e.pathIndex][0];e.y=e.path[e.pathIndex][1];}}}}
  function updateTowers(dt){
    updateSupportNodes(dt);
    for(const t of game.towers){
      const d=TOWERS[t.type];
      if(d.role==='support'||d.role==='economy')continue;
      if(t.disabled>0){t.disabled-=dt;continue}
      const s=tStats(t); t.cooldown-=dt;
      if(t.cooldown<=0){
        const target=findTarget(t,s.range);
        if(target){shoot(t,target,s); t.cooldown=1/s.rate;}
      }
    }
  }
  function updateSupportNodes(dt){
    for(const t of game.towers){t.supported=false;t.camoReveal=false;t.rangeBoosted=false;t.supportRate=0;}
    for(const hub of game.towers){
      if(hub.type!=='hub')continue;
      const s=tStats(hub), r2=s.range*s.range;
      for(const t of game.towers){
        if(t===hub||TOWERS[t.type].role!=='damage')continue;
        const dx=t.x-hub.x,dy=t.y-hub.y;
        if(dx*dx+dy*dy<=r2){t.supported=true;t.supportRate=Math.max(t.supportRate||0,s.auraRate||.13);if(s.camoReveal)t.camoReveal=true;if(hub.branch==='B')t.rangeBoosted=true;}
      }
      hub.pulse=(hub.pulse||0)+dt;
      if(hub.pulse>.9&&!game.perfMode&&!save.settings.reduced){hub.pulse=0;addExplosion(hub.x,hub.y,TOWERS.hub.color,Math.min(70,s.range*.45));}
    }
  }
  function tStats(t){
    const d=TOWERS[t.type], lvl=t.level;
    if(d.role==='support'){
      let range=132+lvl*24, auraRate=.08+lvl*.035, camoReveal=lvl>=4;
      if(t.branch==='A'){range+=58;auraRate+=.12}
      if(t.branch==='B'){range+=28;camoReveal=true}
      return{damage:0,range,rate:0,hit:d.hit,auraRate,camoReveal};
    }
    if(d.role==='economy'){
      let income=18+lvl*9;
      if(t.branch==='A')income*=1.55;
      if(t.branch==='B')income*=1.15;
      return{damage:0,range:0,rate:0,hit:d.hit,income:Math.round(income),shardChance:t.branch==='B'?Math.min(.08+lvl*.015,.16):0};
    }
    let damage=(24+lvl*12)*(t.type==='rocket'?1.55:t.type==='shadow'?1.85:1)*(1+metaRank('damage')*.03);
    let range=145+lvl*14+(t.type==='shadow'?90:0)+(t.type==='anti'?50:0);
    let rate=(.78+lvl*.11+(t.type==='tesla' ? .35 : 0))*(1+labRank('rate')*.04)*(game.overdrive>0?1.85:1)*((game.battle&&game.battle.towerBoostTimer>0)?2.0:1);
    if(t.branch==='A'){
      if(t.type==='flame')damage*=1.25;if(t.type==='tesla')damage*=1.05,range+=25;if(t.type==='cryo')range+=40;if(t.type==='rocket')range+=12;if(t.type==='shadow')damage*=1.35;if(t.type==='anti')range+=80
    }
    if(t.branch==='B'){
      if(t.type==='rocket')damage*=2.2;if(t.type==='shadow')rate*=1.2;if(t.type==='flame')range+=15;if(t.type==='venom')damage*=1.25;if(t.type==='anti')damage*=1.28;if(t.type==='cryo')damage*=1.18
    }
    if(t.boosted)rate*=1.15;
    if(t.supported)rate*=1+(t.supportRate||.13);
    if(t.rangeBoosted)range+=24;
    if(game&&game.perfMode){damage*=1.24;rate*=.76;}
    return{damage,range,rate,hit:d.hit};
  }
  function canTowerSeeEnemy(t,e){return !e.camo||t.type==='shadow'||(t.type==='anti'&&t.branch==='B')||!!t.camoReveal;}
  function findTarget(t,range){
    let best=null,bestScore=-Infinity,r2=range*range,mode=t.targetMode||'first';
    if(mode==='closest')bestScore=Infinity;
    for(const e of game.enemies){
      if(!e.alive)continue;
      if(!canTowerSeeEnemy(t,e))continue;
      if(e.flying && !(t.type==='anti'||t.type==='tesla'||t.type==='shadow'||t.branch==='B'))continue;
      const dx=e.x-t.x,dy=e.y-t.y,d2=dx*dx+dy*dy;
      if(d2>r2)continue;
      const prog=e.pathIndex*10000+e.progress+(e.boss?900:0);
      let score=prog;
      if(mode==='last')score=-prog;
      if(mode==='strongest')score=e.hp+e.maxHp*.25+e.armor*30+(e.boss?5000:0)+(e.shielded?350:0);
      if(mode==='closest')score=d2;
      const better=mode==='closest'?score<bestScore:score>bestScore;
      if(better){bestScore=score;best=e;}
    }
    return best;
  }
  function shoot(t,e,s){
    const d=TOWERS[t.type]; playSound(d.sfx,.18);
    const crit=Math.random()<(.06+labRank('crit')*.03+(t.branch==='B'&&t.type==='shadow' ? .16 : 0));
    let dmg=s.damage*(crit?1.85:1);
    if(e.boss&&t.type==='rocket'&&t.branch==='B')dmg*=1.8;
    if(e.fast&&t.type==='cryo'&&t.branch==='B')dmg*=1.35;
    if(game.projectiles.length<PERF.maxProjectiles){
      game.projectiles.push(createProjectile(t,e,s,dmg,crit));
    }else{
      if(t.type==='rocket')explodeAt(e.x,e.y,t.branch==='A'?118:86,dmg,'splash',d.color);
      else damageEnemy(e,dmg,s.hit);
    }
    if(crit)addFloating('CRIT',e.x,e.y-30,'#ffd65a');
  }
  function createProjectile(t,e,s,dmg,crit){
    const d=TOWERS[t.type];
    const dx=e.x-t.x,dy=e.y-t.y,dist=Math.hypot(dx,dy)||1;
    const branch=t.branch;
    const p={
      id:game.nextProjectileId++,x:t.x,y:t.y,vx:dx/dist,vy:dy/dist,targetId:e.id,
      damage:dmg,color:d.color,hit:s.hit,type:t.type,branch,crit,
      speed:t.type==='shadow'?1080:t.type==='rocket'?560:t.type==='tesla'?760:650,
      life:t.type==='shadow'?.82:t.type==='rocket'?2.2:1.55,
      pierce:1,hits:[],blastRadius:0,chainRange:0,maxChains:0,homing:t.type==='rocket'||t.type==='flame'||t.type==='cryo'||t.type==='venom'
    };
    if(t.type==='shadow'){p.pierce=branch==='A'?5:3;p.homing=false;p.life=.95;}
    if(t.type==='anti'){p.pierce=branch==='B'?3:2;p.homing=false;p.speed=920;p.life=1.05;}
    if(t.type==='flame'){p.pierce=branch==='A'?2:1;p.blastRadius=branch==='B'?68:0;p.life=1.25;}
    if(t.type==='venom'){p.pierce=branch==='A'?3:2;p.blastRadius=branch==='A'?54:0;p.life=1.45;}
    if(t.type==='cryo'){p.pierce=branch==='B'?2:1;p.blastRadius=branch==='A'?58:0;}
    if(t.type==='rocket'){p.pierce=1;p.blastRadius=branch==='A'?120:88;p.life=2.4;}
    if(t.type==='tesla'){p.pierce=1;p.chainRange=branch==='A'?170:135;p.maxChains=game.perfMode?2:(branch==='A'?6:3);p.life=.85;p.homing=true;}
    return p;
  }
  function enemyRadius(e){return e.boss?26:e.flying?18:e.layer?17:16;}
  function updateProjectiles(dt){
    const enemies=game.enemies;
    for(const p of game.projectiles){
      p.life-=dt;
      if(p.life<=0){
        if(p.blastRadius>0)explodeAt(p.x,p.y,p.blastRadius,p.damage*.72,p.hit,p.color);
        p.dead=true;continue;
      }
      if(p.homing&&p.targetId){
        const target=enemies.find(e=>e.id===p.targetId&&e.alive);
        if(target){const dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy)||1;p.vx=dx/d;p.vy=dy/d;}
      }
      p.x+=p.vx*p.speed*dt; p.y+=p.vy*p.speed*dt;
      if(p.x<-70||p.x>W+70||p.y<-70||p.y>H+70){p.dead=true;continue;}
      const hitRadius=p.type==='shadow'?13:p.type==='rocket'?20:17;
      for(const e of enemies){
        if(!e.alive||p.hits.includes(e.id))continue;
        if(e.flying&&!(p.type==='anti'||p.type==='tesla'||p.type==='shadow'||p.branch==='B'))continue;
        const dx=e.x-p.x,dy=e.y-p.y;
        if(dx*dx+dy*dy>(hitRadius+enemyRadius(e))**2)continue;
        hitProjectileEnemy(p,e);
        if(p.dead)break;
      }
    }
    game.projectiles=game.projectiles.filter(p=>!p.dead).slice(-PERF.maxProjectiles);
  }
  function hitProjectileEnemy(p,e){
    p.hits.push(e.id);
    if(p.blastRadius>0){
      explodeAt(e.x,e.y,p.blastRadius,p.damage,p.hit,p.color);
      p.dead=true;
    }else{
      damageEnemy(e,p.damage,p.hit);
      addSpark(e.x,e.y,p.color);
      if(p.type==='tesla')chainLightning(e,p);
      p.pierce--;
      if(p.pierce<=0)p.dead=true;
    }
  }
  function explodeAt(x,y,radius,damage,effect,color){
    addExplosion(x,y,color,radius);
    const r2=radius*radius;
    const targets=game.enemies.slice();
    for(const o of targets){
      if(!o.alive)continue;
      const dx=o.x-x,dy=o.y-y,d2=dx*dx+dy*dy;
      if(d2>r2)continue;
      const falloff=clamp(1-Math.sqrt(d2)/(radius*1.4),.35,1);
      damageEnemy(o,damage*falloff,effect);
    }
  }
  function chainLightning(first,p){
    let current=first;
    const used=new Set(p.hits);
    for(let i=0;i<p.maxChains;i++){
      let best=null,bd=p.chainRange*p.chainRange;
      for(const e of game.enemies){
        if(!e.alive||used.has(e.id))continue;
        const dx=e.x-current.x,dy=e.y-current.y,d2=dx*dx+dy*dy;
        if(d2<bd){bd=d2;best=e;}
      }
      if(!best)break;
      used.add(best.id);p.hits.push(best.id);
      addBeam(current.x,current.y,best.x,best.y,p.color);
      damageEnemy(best,p.damage*(p.branch==='A'?.62:.48),p.branch==='B'?'slow':'zap');
      current=best;
    }
  }
  function addBeam(x,y,x2,y2,color){
    if(game.effects.length>=PERF.maxEffects)return;
    game.effects.push({type:'beam',x,y,x2,y2,color,life:.16,maxLife:.16});
  }
  function damageEnemy(e,amount,effect,dot=false){
    if(!e||!e.alive)return;
    const pierce=['pierce','laser','zap'].includes(effect);
    const venomHit=effect==='poison'||effect==='venom';
    const dotHit=dot||effect==='dotBurn'||effect==='dotVenom';
    let armorTax=dotHit?e.armor*.12:(pierce?e.armor*.2:(venomHit?e.armor*.35:e.armor));
    let real=Math.max(1,Math.round(amount-armorTax));
    if(e.shielded&&amount<65&&!['pierce','laser','splash','zap'].includes(effect)&&!dotHit){
      real=Math.max(1,Math.round(real*.22));
      if(Math.random()<.18)addFloating('SHIELD',e.x,e.y-32,'#55d7ff');
    }
    if(!dotHit){
      if(effect==='burn')applyStatus(e,'burn',{duration:3.2,dps:10+game.wave*.55,color:'#ff6b2c'});
      if(venomHit)applyStatus(e,'venom',{duration:4.4,dps:8+game.wave*.45,color:'#b2ff37'});
      if(effect==='slow')applyStatus(e,'frozen',{duration:2.7,magnitude:.50,color:'#9deaff'});
      if(effect==='zap'&&Math.random()<.22)applyStatus(e,'frozen',{duration:.75,magnitude:.28,color:'#55d7ff'});
    }
    e.hp-=real;
    if(!dotHit&&(!game.perfMode||Math.random()<.16)&&(!save.settings.reduced||Math.random()<.28))addFloating(real,e.x,e.y-20,effect==='laser'?'#fff':e.color);
    if(dotHit&&!game.perfMode&&Math.random()<.18)addFloating(effect==='dotVenom'?'VENOM':'BURN',e.x,e.y-24,effect==='dotVenom'?'#b2ff37':'#ff6b2c');
    if(e.hp<=0)killEnemy(e);
  }
  function killEnemy(e){
    if(!e.alive)return;
    const reward=Math.max(1,Math.round(e.reward*coinMultiplier()));
    e.alive=false;game.kills++;game.combo++;game.comboTimer=2.5;game.coins+=reward;game.score+=e.score+game.combo*3;stats.score+=e.score;
    addFloating(`+$${reward}`,e.x,e.y-42,'#ffd65a');
    if(e.boss){game.bossKills++;stats.bosses++;game.shake=.6;addFloating(e.type==='final'?'FINAL CORE DOWN':'BOSS DOWN',e.x,e.y-62,'#ffd65a');}
    if(e.splitsTo)spawnLayerChildren(e);
    if(e.split){
      for(let i=0;i<(game.perfMode?1:2)&&game.enemies.length<PERF.maxEnemies;i++){
        const data=ENEMIES.swarm;
        const child=makeEnemyObject('swarm',data,e.path,e.x+rand(-8,8),e.y+rand(-8,8),e.pathIndex,e.progress,1);
        game.enemies.push(child);
      }
    }
    addExplosion(e.x,e.y,e.color,e.boss?80:(e.layer?36:28));
    if(game.combo%12===0){const comboReward=Math.round(25*coinMultiplier());game.coins+=comboReward;addFloating(`COMBO ${game.combo} +${comboReward}`,e.x,e.y-55,'#a8ff24');}
    playSound('coin',.12);
  }
  function nearestTower(x,y,r){let best=null,bd=r;for(const t of game.towers){const d=Math.hypot(t.x-x,t.y-y);if(d<bd){best=t;bd=d}}return best;}
  function updateTools(dt){
    for(const t of game.towers)t.boosted=false;
    for(const tool of game.tools){
      if(tool.type==='barrier'){
        for(const e of game.enemies)if(e.alive&&Math.hypot(e.x-tool.x,e.y-tool.y)<100)applyStatus(e,'frozen',{duration:.55,magnitude:.38,color:'#55d7ff'});
      }
      if(tool.type==='boost'){
        for(const t of game.towers)t.boosted=t.boosted||Math.hypot(t.x-tool.x,t.y-tool.y)<120;
      }
      if(tool.type==='mine'){
        for(const e of game.enemies){
          if(e.alive&&Math.hypot(e.x-tool.x,e.y-tool.y)<56){
            tool.dead=true;playSound('mine');explodeAt(tool.x,tool.y,145,175,'splash','#ff38f8');
            break;
          }
        }
      }
    }
    game.tools=game.tools.filter(t=>!t.dead);
  }
  function updateCrates(dt){game.cacheTimer-=dt; const chance=.01+labRank('cache')*.006; if(game.waveActive&&game.cacheTimer<=0&&game.crates.length<2&&Math.random()<chance){let x=rand(90,810),y=rand(120,880),tries=0;while((distPath(x,y)<70||game.towers.some(t=>Math.hypot(t.x-x,t.y-y)<70))&&tries++<50){x=rand(90,810);y=rand(120,880)}game.crates.push({x,y,life:10});game.cacheTimer=rand(6,12);addFloating('CACHE',x,y-20,'#ffd65a')} for(const c of game.crates)c.life-=dt;game.crates=game.crates.filter(c=>c.life>0)}
  function updateEffects(dt){for(const e of game.effects)e.life-=dt;game.effects=capArray(game.effects.filter(e=>e.life>0),PERF.maxEffects);for(const f of game.floating){f.life-=dt;f.y-=36*dt}game.floating=capArray(game.floating.filter(f=>f.life>0),PERF.maxFloating)}
  function collectMinerIncome(){
    let total=0, shards=0;
    for(const t of game.towers){
      if(t.type!=='miner')continue;
      const s=tStats(t); total+=Math.round((s.income||0)*coinMultiplier());
      if(s.shardChance&&Math.random()<s.shardChance)shards++;
    }
    if(total>0){addFloating(`MINERS +${total}`,450,178,'#ffd65a');playSound('coin',.22);}
    if(shards>0){save.shards+=shards;persist();addFloating(`+${shards} SHARD`,450,212,'#a8ff24');}
    return total;
  }
  function checkWaveEnd(){
    if(!game.waveActive)return;
    if(!game.spawnQueue.length&&!game.enemies.length){
      game.waveActive=false;
      const minerIncome=collectMinerIncome();
      const paceBonus=game.maxWaves<=15?32:20;
      let bonus=95+game.wave*(14+paceBonus)+(game.perfect?65:0)+Math.min(160,game.combo*3)+minerIncome;
      if((game.turboBonus||0)===game.wave){bonus+=45+game.wave*6;addFloating('TURBO BONUS',450,145,'#55d7ff');}
      bonus=Math.round(bonus*coinMultiplier());
      game.coins+=bonus;game.score+=bonus*3;
      addFloating(game.perfect?'PERFECT WAVE':'WAVE CLEAR',450,110,game.perfect?'#ffd65a':'#a8ff24');
      showToast(`${game.perfect?'Perfect wave!':'Wave cleared.'} +${bonus} coins`);playSound('win',.55);
      if(game.wave>=game.maxWaves)endGame(true); else game.wave++;
    }
  }
  function endGame(win){
    game.paused=true;
    const cap=game.maxWaves===999?Math.max(game.wave,15):game.maxWaves;
    const stars=win?3:(game.wave>=Math.ceil(cap*.66)?2:game.wave>=Math.ceil(cap*.33)?1:0);
    const baseShard=Math.max(1,Math.floor((Math.min(game.wave,cap)/cap)*5)+stars+(win?3:0));
    const shardReward=Math.max(1,Math.round(baseShard*(game.shardMul||1)));
    const result={win,stars,shardReward,levelName:game.level.name,wave:game.wave,maxWaves:cap,score:Math.floor(game.score),kills:game.kills,bossKills:game.bossKills,perfect:game.perfect,mode:game.mode,seconds:Math.max(1,Math.round((performance.now()-(game.runStartedAt||performance.now()))/1000))};
    save.bestWave=Math.max(save.bestWave,game.wave);save.bestScore=Math.max(save.bestScore,game.score);
    if(game.mode==='Campaign')save.stars[game.levelKey]=Math.max(save.stars[game.levelKey]||0,stars);
    save.shards+=shardReward; stats.wins+=win?1:0; stats.score+=game.score; save.stats=stats; persist(); checkAchievements(); playSound(win?'win':'lose');
    openResultModal(result);
  }
  function openResultModal(r){
    const title=r.win?'🏆 EMX CORE SAVED':'💥 CORE BREACHED';
    const sub=r.win?'Defense complete. Rewards secured.':'The core fell, but your upgrades still matter.';
    const stars=Array.from({length:3},(_,i)=>`<span class="result-star ${i<r.stars?'earned':''}" data-star="${i}">★</span>`).join('');
    const badge=r.maxWaves>=20?'ELITE 20-WAVE RUN':'15-WAVE SPRINT';
    openModal(`<div class="win-card ${r.win?'victory':'defeat'}"><span class="glitch-orb one"></span><span class="glitch-orb two"></span><div class="win-content"><p class="eyebrow">${badge}</p><h2 class="result-title">${title}</h2><p class="result-subtitle">${sub}<br><strong>${r.levelName}</strong> • ${r.mode}</p><div class="star-row">${stars}</div><div class="result-stats"><div class="result-stat"><span>Score</span><b class="tally" data-count="${r.score}">0</b></div><div class="result-stat"><span>Kills</span><b class="tally" data-count="${r.kills}">0</b></div><div class="result-stat"><span>Bosses</span><b class="tally" data-count="${r.bossKills}">0</b></div><div class="result-stat"><span>Wave</span><b><span class="tally" data-count="${r.wave}">0</span>/${r.maxWaves}</b></div></div><div class="reward-strip"><span>+<b class="tally" data-count="${r.shardReward}">0</b> Core Shards</span><span>${r.perfect?'Perfect Core Bonus':'Core Damage Taken'}</span></div><div class="win-actions"><button class="big-btn primary" id="againBtn">Run It Back</button><button class="big-btn" id="mapBtn">Map Select</button><button class="big-btn" id="labGoBtn">Spend Shards</button></div></div></div>`);
    setTimeout(()=>{animateResultTallies();animateStars(r.stars);$('againBtn').onclick=()=>{closeModal();startGame(game.levelKey,game.mode)};$('mapBtn').onclick=()=>{closeModal();showScreen('mapScreen')};$('labGoBtn').onclick=()=>{closeModal();showScreen('labScreen')}});
  }
  function animateResultTallies(){
    const els=[...document.querySelectorAll('#modalBody .tally')];
    const start=performance.now(), duration=760;
    cancelAnimationFrame(resultAnimFrame);
    const step=(now)=>{const t=clamp((now-start)/duration,0,1), eased=1-Math.pow(1-t,3); for(const el of els){const target=Number(el.dataset.count||0); el.textContent=Math.floor(target*eased).toLocaleString();} if(t<1)resultAnimFrame=requestAnimationFrame(step);};
    resultAnimFrame=requestAnimationFrame(step);
  }
  function animateStars(count){
    [...document.querySelectorAll('#modalBody .result-star')].forEach((star,i)=>{
      setTimeout(()=>{star.classList.add('pop'); if(i<count){$('modal').classList.add('result-shake'); setTimeout(()=>$('modal').classList.remove('result-shake'),150);}},220+i*160);
    });
  }

  function useAbility(k){
    if(game.abilities[k]>0)return; unlockAudio();
    const cdBase=ABILITY_META[k]?.cd||30; game.abilities[k]=cdBase;
    if(k==='emp'){
      for(const e of game.enemies){e.stun=Math.max(e.stun,2.2);applyStatus(e,'frozen',{duration:4,magnitude:.58,color:'#55d7ff'});}
      addFloating('EMP FREEZE',450,180,'#55d7ff');addExplosion(450,500,'#55d7ff',180);playSound('nova')
    }
    if(k==='repair'){const amt=5+labRank('lives');game.lives+=amt;addFloating(`+${amt} LIVES`,450,160,'#72ff15');playSound('coin')}
    if(k==='overdrive'){game.overdrive=8;addFloating('OVERDRIVE',450,160,'#ffd65a');playSound('upgrade')}
    if(k==='mine'){game.selectedTool='mine';dockTab='abilities';game.message='Tap the field to place a mine.';playSound('tap')}
    if(k==='drone'){
      const live=game.enemies.filter(x=>x.alive);
      for(let i=0;i<(game.perfMode?5:8);i++){const e=choice(live);if(e)damageEnemy(e,110,'laser');}
      addFloating('DRONE SWARM',450,160,'#fff');playSound('drone')
    }
    if(k==='pulse'){
      for(const e of game.enemies){if(e.alive)damageEnemy(e,e.boss?260:95,'laser')}
      addFloating('CORE PULSE',450,160,'#55d7ff');addExplosion(450,500,'#55d7ff',220);playSound('nova')
    }
    updateUI();renderDock();
  }

  function placeTower(x,y){
    const key=game.selectedType;if(!key)return;const data=TOWERS[key];
    if(game.coins<data.cost)return showToast('Not enough coins.');
    const c=canPlace(x,y);if(!c.ok)return showToast(c.reason);
    game.towers.push({id:game.nextTowerId++,type:key,x,y,level:1,spent:data.cost,cooldown:0,branch:null,disabled:0,boosted:false,supported:false,camoReveal:false,rangeBoosted:false,targetMode:'first'});
    game.coins-=data.cost;stats.towers++;game.selectedType=null;playSound('place');addExplosion(x,y,data.color,25);showToast(`${data.name} placed.`);persist();updateUI();
  }
  function placeTool(type,x,y){if(type==='scrap'){const t=game.tools.find(o=>Math.hypot(o.x-x,o.y-y)<50);if(t){game.tools=game.tools.filter(o=>o!==t);game.coins+=50;playSound('coin');showToast('Tool scrapped. +50 coins')}return} if(type==='mine'){game.tools.push({id:game.nextToolId++,type,x,y});game.selectedTool=null;playSound('mine');showToast('Mine armed.');return} const costs={barrier:135,boost:170}; if(game.coins<costs[type])return showToast('Not enough coins.'); if(type==='barrier'&&distPath(x,y)>60)return showToast('Barrier must touch enemy path.'); if(type==='boost'&&distPath(x,y)<65)return showToast('Boost pad must be off path.'); game.coins-=costs[type];game.tools.push({id:game.nextToolId++,type,x,y});game.selectedTool=null;playSound('place');showToast(type==='barrier'?'Barrier placed.':'Boost pad placed.');}
  function canPlace(x,y){if(x<45||x>855||y<45||y>955)return{ok:false,reason:'Too close to edge.'};if(distPath(x,y)<56)return{ok:false,reason:'Too close to path.'};for(const t of game.towers)if(Math.hypot(t.x-x,t.y-y)<66)return{ok:false,reason:'Too close to another tower.'};return{ok:true}}
  function selectTower(x,y){let best=null,bd=40;for(const t of game.towers){const d=Math.hypot(t.x-x,t.y-y);if(d<bd){best=t;bd=d}} if(!best){game.selectedTowerId=null;$('towerPanel').classList.add('hidden');return} game.selectedTowerId=best.id;showTowerPanel();}
  function selectedTower(){return game.towers.find(t=>t.id===game.selectedTowerId)}
  function showTowerPanel(){
    const t=selectedTower(); if(!t)return; const d=TOWERS[t.type],s=tStats(t),cost=upgradeCost(t),role=d.role;
    $('selectedTowerName').textContent=`${d.icon} ${d.name} L${t.level}${t.branch?' • '+(t.branch==='A'?d.branchA[0]:d.branchB[0]):''}`;
    let statText=`DMG ${Math.round(s.damage)} • RNG ${Math.round(s.range)} • SPD ${s.rate.toFixed(1)}/s`;
    if(role==='support')statText=`AURA ${Math.round(s.range)} • BUFF +${Math.round((s.auraRate||0)*100)}% • ${s.camoReveal?'CAMO SCAN':'NO CAMO SCAN'}`;
    if(role==='economy')statText=`INCOME +${s.income}/wave${s.shardChance?` • SHARD ${Math.round(s.shardChance*100)}%`:''}`;
    $('selectedTowerStats').textContent=`${statText} • Sell ${sellValue(t)}`;
    $('upgradeTowerBtn').textContent=t.level>=5?'Max Level':`Upgrade ${cost}`;$('upgradeTowerBtn').disabled=t.level>=5||game.coins<cost;
    $('branchTowerBtn').disabled=t.level<3||!!t.branch;$('branchTowerBtn').textContent=t.branch?'Branched':'Choose Branch';
    $('targetModeBtn').disabled=role!=='damage';$('targetModeBtn').textContent=role==='damage'?`Target: ${TARGET_LABELS[t.targetMode||'first']}`:'No Target';
    $('towerPanel').classList.remove('hidden');
  }
  function cycleTargetMode(){
    const t=selectedTower(); if(!t||TOWERS[t.type].role!=='damage')return;
    const i=TARGET_MODES.indexOf(t.targetMode||'first');
    t.targetMode=TARGET_MODES[(i+1)%TARGET_MODES.length];
    showToast(`${TOWERS[t.type].name} targeting: ${TARGET_LABELS[t.targetMode]}`);
    playSound('tap');showTowerPanel();
  }
  function upgradeCost(t){return Math.round(TOWERS[t.type].cost*(.65+t.level*.68))} function sellValue(t){return Math.round(t.spent*.65)}
  function upgradeTower(){const t=selectedTower();if(!t||t.level>=5)return;const c=upgradeCost(t);if(game.coins<c)return showToast('Not enough coins.');game.coins-=c;t.spent+=c;t.level++;playSound('upgrade');addExplosion(t.x,t.y,TOWERS[t.type].color,36); if(t.level===3&&!t.branch)openBranchModal();showTowerPanel();updateUI();}
  function sellTower(){const t=selectedTower();if(!t)return;const v=sellValue(t);game.towers=game.towers.filter(o=>o!==t);game.coins+=v;game.selectedTowerId=null;$('towerPanel').classList.add('hidden');playSound('coin');showToast(`Sold for ${v} coins.`);}
  function openBranchModal(){const t=selectedTower(); if(!t||t.branch)return; const d=TOWERS[t.type];openModal(`<h2>Choose ${d.name} Branch</h2><p>This tower becomes more specialized. Choose one path.</p><div class="branch-grid"><button class="branch-card" id="branchA"><h3>${d.branchA[0]}</h3><p>${d.branchA[1]}</p></button><button class="branch-card" id="branchB"><h3>${d.branchB[0]}</h3><p>${d.branchB[1]}</p></button></div>`);setTimeout(()=>{$('branchA').onclick=()=>{t.branch='A';closeModal();showTowerPanel();playSound('upgrade')};$('branchB').onclick=()=>{t.branch='B';closeModal();showTowerPanel();playSound('upgrade')}});}

  canvas.addEventListener('pointerdown',e=>{e.preventDefault();unlockAudio();});
  canvas.addEventListener('pointerup',e=>{e.preventDefault();if(!game||game.paused)return; const p=canvasPoint(e); const crate=game.crates.find(c=>Math.hypot(c.x-p.x,c.y-p.y)<40); if(crate){const reward=Math.round(choice([60,80,100,125])*coinMultiplier());game.coins+=reward;game.score+=reward*4;crate.life=0;addExplosion(crate.x,crate.y,'#ffd65a',35);addFloating(`+${reward}`,crate.x,crate.y,'#ffd65a');playSound('coin');return} if(game.selectedTool)placeTool(game.selectedTool,p.x,p.y); else if(game.selectedType)placeTower(p.x,p.y); else selectTower(p.x,p.y); updateUI();});
  function canvasPoint(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}

  function distPath(x,y){let min=9999;const paths=[game?.level.path||LEVELS[0].path,game?.level.altPath].filter(Boolean);for(const path of paths){for(let i=0;i<path.length-1;i++){const a=path[i],b=path[i+1];const dx=b[0]-a[0],dy=b[1]-a[1],len=dx*dx+dy*dy,t=len?clamp(((x-a[0])*dx+(y-a[1])*dy)/len,0,1):0;min=Math.min(min,Math.hypot(x-(a[0]+dx*t),y-(a[1]+dy*t)));}}return min;}

  function draw(){frameNow=performance.now(); ctx.clearRect(0,0,W,H); if(!game){drawIdle();return} ctx.save(); if(game.shake>0&&!save.settings.reduced&&!game.perfMode)ctx.translate(rand(-4,4)*game.shake,rand(-4,4)*game.shake); drawStaticField(); drawCoreAndIn(); drawTools(); drawTowers(); drawEnemies(); drawProjectiles(); drawCrates(); drawEffects(); drawFloating(); ctx.restore();}
  function drawIdle(){ctx.fillStyle='#050509';ctx.fillRect(0,0,W,H);ctx.fillStyle='#a8ff24';ctx.font='bold 34px Arial';ctx.textAlign='center';ctx.fillText('EMX CORE DEFENSE',W/2,H/2);}

  function drawStaticField(){const key=game.levelKey+'-'+(game.level.altPath?'alt':'main'); if(!staticCanvas||staticKey!==key){staticKey=key;staticCanvas=document.createElement('canvas');staticCanvas.width=W;staticCanvas.height=H;staticCtx=staticCanvas.getContext('2d');const oldCtx=ctx;ctx.save();drawBackground(true);drawPath(game.level.path);if(game.level.altPath)drawPath(game.level.altPath,true);ctx.restore();staticCtx.drawImage(canvas,0,0);ctx.clearRect(0,0,W,H);}ctx.drawImage(staticCanvas,0,0); if(!game.perfMode&&!save.settings.reduced){ctx.globalAlpha=.12;ctx.fillStyle=game.level.color;for(let i=0;i<12;i++){const x=(i*137+frameNow*.012)%W,y=(i*211)%H;ctx.beginPath();ctx.arc(x,y,1+(i%3),0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;}}
  function drawBackground(staticOnly=false){const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'rgba(30,255,70,.08)');g.addColorStop(.5,'rgba(255,56,248,.06)');g.addColorStop(1,'rgba(85,215,255,.04)');ctx.fillStyle='#050509';ctx.fillRect(0,0,W,H);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.strokeStyle='rgba(168,255,36,.07)';ctx.lineWidth=1;const grid=lowFx()?130:65;for(let x=0;x<W;x+=grid){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=grid){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()} const color=game.level.color;ctx.globalAlpha=lowFx() ? .10 : .18;ctx.fillStyle=color;const dots=lowFx()?6:20;for(let i=0;i<dots;i++){const x=(i*137+performance.now()*(lowFx() ? .004 : .012))%W,y=(i*211)%H;ctx.beginPath();ctx.arc(x,y,1+(i%3),0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;}
  function drawPath(path,alt=false){ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=alt?'rgba(168,76,255,.3)':'rgba(114,255,21,.35)';ctx.lineWidth=72;drawPolyline(path);ctx.strokeStyle='rgba(255,255,255,.16)';ctx.lineWidth=46;drawPolyline(path);ctx.strokeStyle='rgba(0,0,0,.78)';ctx.lineWidth=32;drawPolyline(path);ctx.setLineDash([18,14]);ctx.strokeStyle=alt?'#a84cff':'#ff38f8';ctx.lineWidth=4;drawPolyline(path);ctx.setLineDash([])}
  function drawPolyline(path){ctx.beginPath();ctx.moveTo(path[0][0],path[0][1]);for(let i=1;i<path.length;i++)ctx.lineTo(path[i][0],path[i][1]);ctx.stroke();}
  function drawCoreAndIn(){const p=game.level.path, start=p[0], end=p[p.length-1];drawNode(start[0],start[1],'IN','#72ff15');drawNode(end[0],end[1],'CORE','#ff38f8'); if(game.level.altPath)drawNode(game.level.altPath[0][0],game.level.altPath[0][1],'IN','#a84cff');}
  function drawNode(x,y,text,color){ctx.shadowColor=color;ctx.shadowBlur=18;ctx.fillStyle='#090912';ctx.strokeStyle=color;ctx.lineWidth=5;ctx.beginPath();ctx.arc(x,y,34,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle=color;ctx.font='bold 13px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,x,y)}
  function drawTools(){for(const t of game.tools){const color=t.type==='barrier'?'#55d7ff':t.type==='boost'?'#a8ff24':'#ff38f8';ctx.shadowColor=color;ctx.shadowBlur=16;ctx.strokeStyle=color;ctx.lineWidth=3;ctx.fillStyle='rgba(255,255,255,.08)';ctx.beginPath();ctx.arc(t.x,t.y,t.type==='boost'?42:32,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle=color;ctx.font='22px Arial';ctx.textAlign='center';ctx.fillText(t.type==='barrier'?'🛡️':t.type==='boost'?'💠':'💣',t.x,t.y+8)}}
  function drawTowers(){
    for(const t of game.towers){
      const d=TOWERS[t.type], s=tStats(t);
      if(d.role==='support'&&(!lowFx()||game.selectedTowerId===t.id)){
        ctx.globalAlpha=game.selectedTowerId===t.id ? .22 : .08;ctx.strokeStyle=d.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(t.x,t.y,s.range,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
      }
      ctx.shadowColor=d.color;ctx.shadowBlur=lowFx()?0:18;ctx.fillStyle='rgba(10,10,18,.9)';ctx.strokeStyle=t.disabled>0?'#666':d.color;ctx.lineWidth=4;ctx.beginPath();ctx.arc(t.x,t.y,27,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
      if(t.supported){ctx.strokeStyle='#55d7ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(t.x,t.y,33,0,Math.PI*2);ctx.stroke();}
      if(t.camoReveal){ctx.setLineDash([4,4]);ctx.strokeStyle='#cbb7ff';ctx.beginPath();ctx.arc(t.x,t.y,38,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
      ctx.fillStyle='#fff';ctx.font='22px Arial';ctx.textAlign='center';ctx.fillText(d.icon,t.x,t.y+8);ctx.font='bold 11px Arial';ctx.fillStyle='#fff';ctx.fillText(`L${t.level}`,t.x,t.y+44);
      if(t.branch){ctx.fillStyle=t.branch==='A'?'#a8ff24':'#ff38f8';ctx.fillText(t.branch,t.x+24,t.y-22)}
      if(d.role==='economy'){ctx.fillStyle='#ffd65a';ctx.fillText('+$',t.x-24,t.y-22)}
      if(game.selectedTowerId===t.id&&s.range>0){ctx.strokeStyle='rgba(255,255,255,.38)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(t.x,t.y,s.range,0,Math.PI*2);ctx.stroke();}
    }
  }
  function drawEnemies(){
    for(const e of game.enemies){
      const size=e.boss?24:e.flying?16:e.layer?15:14;
      ctx.save();
      if(e.camo)ctx.globalAlpha=.72;
      ctx.shadowColor=e.color;ctx.shadowBlur=lowFx()?0:(e.boss?24:13);ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(e.x,e.y,size,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.globalAlpha=1;
      if(e.layer){ctx.fillStyle='#071010';ctx.font='bold 13px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(e.layer,e.x,e.y+1)}
      if(e.camo){ctx.setLineDash([5,5]);ctx.strokeStyle='#cbb7ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,size+7,0,Math.PI*2);ctx.stroke();ctx.setLineDash([])}
      if(e.shielded){ctx.strokeStyle='#55d7ff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y,size+9,0,Math.PI*2);ctx.stroke()}
      if(e.fast){ctx.fillStyle='#d7ff4c';ctx.font='bold 12px Arial';ctx.fillText('»',e.x+19,e.y-12)}
      if(e.flying){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,22,0,Math.PI*2);ctx.stroke()}
      if(e.healer){ctx.fillStyle='#72ff15';ctx.fillRect(e.x-3,e.y-20,6,12);ctx.fillRect(e.x-8,e.y-15,16,4)}
      if(e.emp){ctx.strokeStyle='#a84cff';ctx.beginPath();ctx.arc(e.x,e.y,25+Math.sin(frameNow/100)*3,0,Math.PI*2);ctx.stroke()}
      drawStatusBadges(e,size);
      ctx.restore();
      drawHp(e);
    }
  }
  function drawStatusBadges(e,size){
    const effects=(e.statusEffects||[]).filter(s=>s.remaining>0);
    if(!effects.length)return;
    ctx.font='bold 11px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    effects.slice(0,3).forEach((s,i)=>{
      const icon=s.type==='burn'?'🔥':s.type==='venom'?'☠':'❄';
      const x=e.x-15+i*15,y=e.y+size+18;
      ctx.fillStyle='rgba(0,0,0,.72)';ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=s.color||'#fff';ctx.fillText(icon,x,y+1);
    });
  }
  function drawHp(e){const w=e.boss?70:38,h=6,x=e.x-w/2,y=e.y-(e.boss?42:30);ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(x,y,w,h);ctx.fillStyle=e.hp/e.maxHp>.5?'#72ff15':e.hp/e.maxHp>.25?'#ffd65a':'#ff4f7a';ctx.fillRect(x,y,w*clamp(e.hp/e.maxHp,0,1),h)}
  function drawProjectiles(){for(const p of game.projectiles){ctx.strokeStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=lowFx()?0:14;ctx.lineWidth=p.type==='shadow'?4:3;ctx.beginPath();ctx.arc(p.x,p.y,p.crit?7:5,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0}}
  function drawCrates(){for(const c of game.crates){ctx.shadowColor='#ffd65a';ctx.shadowBlur=lowFx()?0:18;ctx.fillStyle='#ffd65a';ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(c.x-21,c.y-21,42,42,10);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#111';ctx.font='20px Arial';ctx.textAlign='center';ctx.fillText('⚡',c.x,c.y+7)}}
  function drawEffects(){for(const e of game.effects){const a=clamp(e.life/e.maxLife,0,1);ctx.globalAlpha=a;ctx.strokeStyle=e.color;ctx.fillStyle=e.color;ctx.shadowColor=e.color;ctx.shadowBlur=lowFx()?0:16;if(e.type==='explosion'){ctx.lineWidth=5;ctx.beginPath();ctx.arc(e.x,e.y,e.radius*(1-a),0,Math.PI*2);ctx.stroke()}else if(e.type==='beam'){ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x2,e.y2);ctx.stroke()}else{ctx.beginPath();ctx.arc(e.x,e.y,3,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;ctx.shadowBlur=0}}
  function drawFloating(){for(const f of game.floating){ctx.globalAlpha=clamp(f.life,0,1);ctx.fillStyle=f.color;ctx.font='bold 20px Arial';ctx.textAlign='center';ctx.shadowColor='#000';ctx.shadowBlur=6;ctx.fillText(f.text,f.x,f.y);ctx.globalAlpha=1;ctx.shadowBlur=0}}
  function addSpark(x,y,color){if(game.effects.length>=PERF.maxEffects)return; const n=lowFx()?1:4;for(let i=0;i<n;i++)game.effects.push({type:'spark',x:x+rand(-8,8),y:y+rand(-8,8),color,life:rand(.14,.34),maxLife:.34}); if(game.effects.length>PERF.maxEffects)game.effects=capArray(game.effects,PERF.maxEffects);}
  function addExplosion(x,y,color,radius){if(game.effects.length>=PERF.maxEffects&&lowFx())return; game.effects.push({type:'explosion',x,y,color,radius:lowFx()?radius*.75:radius,life:.34,maxLife:.34});for(let i=0;i<(lowFx()?1:5);i++)addSpark(x+rand(-radius/4,radius/4),y+rand(-radius/4,radius/4),color); if(game.effects.length>PERF.maxEffects)game.effects=capArray(game.effects,PERF.maxEffects)}
  function addFloating(text,x,y,color){if(lowFx()&&game.floating.length>12)return; game.floating.push({text:String(text),x,y,color,life:lowFx() ? .72 : 1.05,maxLife:1.05}); if(game.floating.length>PERF.maxFloating)game.floating=capArray(game.floating,PERF.maxFloating)}

  function setText(id,val){const el=$(id);val=String(val);if(el&&el.textContent!==val)el.textContent=val;}
  function updateUI(full=true){
    if(!game)return;
    const battle=game.battle&&game.battle.active;
    setText('waveText',`${game.wave}/${game.maxWaves===999?'∞':game.maxWaves}`);
    setText('livesText',game.lives);
    setText('coinsText',Math.floor(game.coins));
    setText('scoreText',Math.floor(game.score));
    setText('startWaveBtn',game.waveActive?'Wave Running':(battle?'Start Round':'Start Wave'));
    setText('pauseBtn',game.paused?'Resume':'Pause');
    setText('speedBtn',`${game.speed}x Speed`);
    setText('soundBtn',save.settings.sound?'🔊':'🔇');
    const battleBoost=game.battle?.towerBoostTimer>0?' • Tower boost active':'';
    setText('statusText',game.perfMode?'Performance mode active — heavy wave optimized.':((game.message||'Ready.')+battleBoost));
    if(battle){
      $('battleHud').classList.remove('hidden');
      setText('ecoText',Math.round(game.battle.playerEco));
      setText('ecoTimerText',`${Math.ceil(game.battle.ecoTimer)}s`);
      setText('opponentLivesText',Math.max(0,Math.ceil(game.battle.opponentLives)));
      setText('opponentPressureText',Math.round(game.battle.opponentPressure));
    }else $('battleHud').classList.add('hidden');
    const boss=game.enemies.find(e=>e.boss);
    if(boss){$('bossBar').classList.remove('hidden');$('bossBarFill').style.width=`${clamp(boss.hp/boss.maxHp*100,0,100)}%`;setText('bossBarText',`${boss.name} ${Math.ceil(boss.hp)}/${boss.maxHp}`)}else $('bossBar').classList.add('hidden');
    if(full||dockTab==='abilities'||dockTab==='send')renderDock();
    if(full){renderMissions(); if(game.selectedTowerId)showTowerPanel();}
  }
  function renderMissions(){const m=[{t:'Place 3 towers',d:game.towers.length>=3},{t:'Defeat 25 enemies',d:game.kills>=25},{t:'Clear boss wave',d:game.bossKills>0},{t:'Keep perfect core',d:game.perfect&&game.wave>1}];$('missionList').innerHTML=m.map(x=>`<div class="mission-item ${x.d?'done':''}"><span>${x.t}</span><b>${x.d?'DONE':'ACTIVE'}</b></div>`).join('')}

  function openModal(html){cancelAnimationFrame(resultAnimFrame);$('modal').classList.remove('result-shake');$('modalBody').innerHTML=html;$('modal').classList.remove('hidden')} function closeModal(){cancelAnimationFrame(resultAnimFrame);$('modal').classList.remove('result-shake');$('modal').classList.add('hidden')}
  function openGuide(){playSound('tap');openModal(`<h2>📘 EMX Defense Guide</h2><div class="guide-grid"><p><strong>BTD Layers:</strong> Purple multi-layer glitches pop into green layers, then blue layers. If a bigger layer reaches the core, it costs more lives.</p><p><strong>Projectiles:</strong> Shadow/Prism shots pierce through multiple enemies, Rocket/Mine attacks explode in an AoE, and Tesla chains to nearby targets.</p><p><strong>Status Effects:</strong> Cryo freezes and slows, Flame burns over time, and Venom refreshes poison timers instead of stacking infinitely.</p><p><strong>Special Enemies:</strong> Shielded enemies punish weak hits, fast enemies resist slows, camo enemies need Shadow Sniper, Prism Scanner, or EMX Hub scanner support.</p><p><strong>Support + Economy:</strong> EMX Hub buffs nearby tower speed and can reveal camo. Crypto Miner generates bonus coins every cleared wave and Path B can mine Core Shards.</p><p><strong>Targeting:</strong> Tap a tower, then use Target to switch First, Last, Strongest, or Closest targeting.</p><p><strong>Wave Manager:</strong> Campaign maps are compressed into 15-wave sprints. Elite maps run 20 waves. Boss checks hit every 5 waves, with a final boss at the cap.</p><p><strong>Spend Shards:</strong> Core Shards buy permanent meta upgrades like startup coins, global damage, faster cooldowns, reward multipliers, and shard boosts.</p></div>`)}
  function openSettings(){playSound('tap');openModal(`<h2>⚙️ Settings</h2><div class="guide-grid"><button id="setSound" class="big-btn">Sound: ${save.settings.sound?'ON':'OFF'}</button><button id="setVibrate" class="big-btn">Vibration: ${save.settings.vibrate?'ON':'OFF'}</button><button id="setReduced" class="big-btn">Performance FX: ${save.settings.reduced?'LOW':'AUTO'}</button><button id="resetAll" class="big-btn danger">Reset Save</button></div>`);setTimeout(()=>{$('setSound').onclick=()=>{save.settings.sound=!save.settings.sound;persist();openSettings()};$('setVibrate').onclick=()=>{save.settings.vibrate=!save.settings.vibrate;persist();openSettings()};$('setReduced').onclick=()=>{save.settings.reduced=!save.settings.reduced;persist();openSettings()};$('resetAll').onclick=()=>{localStorage.removeItem(saveKey);save=loadSave();stats={bosses:0,towers:0,score:0,wins:0};closeModal();updateMenu();}})}
  function showToast(msg,ms=1600){$('toast').textContent=msg;$('toast').classList.remove('hidden');toastTimer=ms/1000; if(save.settings.vibrate&&navigator.vibrate)navigator.vibrate(18)}

  function unlockAudio(){if(audioUnlocked)return; audioUnlocked=true; try{audioCtx=new (window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==='suspended')audioCtx.resume();}catch{} preloadSfx();}
  function preloadSfx(){['tap','place','shoot','blast','coin','wave','win','lose','flame','zap','ice','poison','rocket','shadow','laser','nova','mine','drone','upgrade'].forEach(name=>{const a=new Audio();a.preload='auto';a.src=`assets/sfx/${name}.wav`;a.onerror=()=>{a.src=`sfx/${name}.wav`};sfx[name]=a;});}
  function playSound(name='tap',vol=.45){if(!save.settings.sound)return; const now=performance.now(); const attack=['shoot','flame','zap','ice','poison','rocket','shadow','laser']; const gap=attack.includes(name)?(lowFx()?220:105):55; if(soundGate[name]&&now-soundGate[name]<gap)return; soundGate[name]=now; try{if(!audioUnlocked)unlockAudio(); const a=sfx[name]||sfx.tap; if(a){const clone=a.cloneNode();clone.volume=lowFx()?Math.min(vol,.22):vol;clone.play().catch(()=>fallbackSound(name,vol));}else fallbackSound(name,vol);}catch{fallbackSound(name,vol)}}
  function fallbackSound(name,vol){if(!save.settings.sound||!audioCtx)return; const o=audioCtx.createOscillator(),g=audioCtx.createGain(); const freq={tap:520,place:330,shoot:760,blast:120,coin:920,wave:250,win:660,lose:140,flame:220,zap:880,ice:640,poison:300,rocket:180,shadow:420,laser:980,nova:520,mine:110,drone:720,upgrade:700}[name]||440; o.type=name==='blast'||name==='mine'?'sawtooth':'sine'; o.frequency.setValueAtTime(freq,audioCtx.currentTime); g.gain.setValueAtTime(vol*.08,audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.18); o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+.2)}

  updateMenu(); renderMaps();
})();
