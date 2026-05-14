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

  const baseSave = {bestWave:0,bestScore:0,shards:0,stars:{grid:0,forest:0,desert:0,storm:0,lab:0,reactor:0}, lab:{coins:0,rate:0,lives:0,cooldown:0,cache:0,crit:0}, achievements:{}, settings:{sound:true,music:true,vibrate:true,reduced:false}};
  let save = loadSave();

  const LEVELS = [
    {key:'grid', name:'EMX Core Grid', desc:'Starter neon route with balanced waves.', unlock:0, lives:25, coins:340, waves:30, color:'#72ff15', bg:'grid', mods:['Layered enemies','Starter'], path:[[80,140],[770,140],[770,310],[140,310],[140,520],[820,520],[820,720],[105,720],[105,880],[790,880]], enemies:['layer1','layer2','glitch','runner','shielded','tank']},
    {key:'forest', name:'Glitch Forest', desc:'Split-lane pressure and healing enemies.', unlock:3, lives:24, coins:360, waves:30, color:'#2bff9c', bg:'forest', mods:['Split lane','Layers','Camo'], path:[[75,120],[790,120],[790,255],[470,255],[470,405],[135,405],[135,595],[815,595],[815,760],[105,760],[105,895],[790,895]], altPath:[[75,190],[310,190],[310,350],[790,350],[790,505],[510,505],[510,670],[790,670],[790,835]], enemies:['layer2','layer3','runner','swarm','healer','camo','shielded']},
    {key:'desert', name:'Cyber Desert', desc:'Fast runners and armored tanks. Wider turns.', unlock:6, lives:22, coins:380, waves:32, color:'#ffd65a', bg:'desert', mods:['Fast enemies','Armor','Layer pops'], path:[[70,190],[820,190],[820,360],[215,360],[215,535],[805,535],[805,705],[150,705],[150,870],[790,870]], enemies:['fast','runner','layer3','shielded','tank','splitter']},
    {key:'storm', name:'Purple Storm City', desc:'Flying drones enter the fight.', unlock:9, lives:24, coins:390, waves:34, color:'#ff38f8', bg:'storm', mods:['Flying enemies','Camo','Storm speed'], path:[[80,115],[805,115],[805,290],[100,290],[100,455],[805,455],[805,640],[100,640],[100,825],[790,825]], enemies:['layer2','fast','camo','flyer','flyer','shielded','emp']},
    {key:'lab', name:'Overclock Lab', desc:'Boss-heavy experimental battlefield.', unlock:12, lives:26, coins:420, waves:35, color:'#55d7ff', bg:'lab', mods:['Boss heavy','EMP','Shielded'], path:[[85,105],[460,105],[460,250],[810,250],[810,420],[270,420],[270,570],[815,570],[815,745],[95,745],[95,890],[790,890]], enemies:['layer3','shielded','tank','emp','healer','splitter','fast','camo']},
    {key:'reactor', name:'Final Core Reactor', desc:'Double entrance final map. Hardest EMX challenge.', unlock:16, lives:28, coins:450, waves:40, color:'#a84cff', bg:'reactor', mods:['Double entrance','Camo','Final bosses'], path:[[75,145],[800,145],[800,300],[115,300],[115,500],[815,500],[815,690],[155,690],[155,875],[795,875]], altPath:[[75,245],[310,245],[310,410],[805,410],[805,600],[435,600],[435,765],[795,765]], enemies:['layer3','fast','camo','flyer','shielded','tank','healer','emp','splitter']}
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
  const LAB = [
    {key:'coins',name:'Startup Coins',desc:'+40 starting coins per level.',cost:[2,4,7,11,16]}, {key:'rate',name:'Overclocked Towers',desc:'+4% fire rate per rank.',cost:[3,5,8,12,18]},
    {key:'lives',name:'Core Armor',desc:'+2 core lives per rank.',cost:[3,5,9,14,20]}, {key:'cooldown',name:'Ability Cooling',desc:'Abilities recharge faster.',cost:[2,4,8,13,19]},
    {key:'cache',name:'Cache Magnet',desc:'Bonus caches appear more often.',cost:[2,5,9,13,18]}, {key:'crit',name:'Critical Firmware',desc:'+3% tower crit chance per rank.',cost:[3,6,10,15,22]}
  ];
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

  let stats = Object.assign({bosses:0,towers:0,score:0,wins:0}, save.stats || {});

  let game = null, last = performance.now(), toastTimer = 0, dockTab = 'towers', audioUnlocked = false, audioCtx = null;
  let uiTimer = 0, fxBudgetTimer = 0, frameNow = 0, staticCanvas = null, staticCtx = null, staticKey = '';
  let lastSoundAt = {};
  const PERF = { maxEnemies: 46, maxProjectiles: 48, maxEffects: 42, maxFloating: 20, uiHz: 5, soundGap: 110 };
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
  function labRank(k){return save.lab[k]||0}
  function levelByKey(k){return LEVELS.find(l=>l.key===k)||LEVELS[0]}
  function unlocked(level){return totalStars()>=level.unlock}

  window.addEventListener('load',()=>setTimeout(()=>$('boot').classList.add('done'),650));
  document.addEventListener('click',(e)=>{const go=e.target.closest('[data-go]'); if(go) showScreen(go.dataset.go);});

  function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===id)); if(id==='menuScreen'){if(game)game.paused=true; updateMenu();} if(id==='mapScreen') renderMaps(); if(id==='labScreen') renderLab(); if(id==='achievementScreen') renderAchievements(); window.scrollTo({top:0,behavior:'instant'});}
  function updateMenu(){ $('bestWaveText').textContent=save.bestWave||0; $('bestScoreText').textContent=save.bestScore||0; $('shardText').textContent=save.shards||0; $('starsText').textContent=totalStars(); }

  $('campaignBtn').onclick=()=>{playSound('tap'); showScreen('mapScreen');};
  $('endlessBtn').onclick=()=>{playSound('tap'); startGame('grid','Endless');};
  $('dailyBtn').onclick=()=>{playSound('tap'); const idx=Number(todaySeed())%LEVELS.length; startGame(LEVELS[idx].key,'Daily Challenge');};
  $('labBtn').onclick=()=>{playSound('tap'); showScreen('labScreen');};
  $('achievementsBtn').onclick=()=>{playSound('tap'); showScreen('achievementScreen');};
  $('guideBtn').onclick=()=>openGuide();
  $('settingsBtn').onclick=()=>openSettings();
  $('gameMenuBtn').onclick=()=>{playSound('tap'); game.paused=true; showScreen('mapScreen');};
  $('homeBtn').onclick=()=>{playSound('tap'); game.paused=true; showScreen('menuScreen');};
  $('modalClose').onclick=closeModal;

  function renderMaps(){const grid=$('mapGrid');grid.innerHTML='';LEVELS.forEach((l,i)=>{const stars=save.stars[l.key]||0;const isOpen=unlocked(l);const card=document.createElement('div');card.className='map-card glass';card.innerHTML=`<div class="card-row"><h3>${isOpen?'':'🔒 '}${l.name}</h3><span class="tag">${'⭐'.repeat(stars)||'No stars'}</span></div><p>${l.desc}</p><div class="tag-row">${l.mods.map(m=>`<span class="tag">${m}</span>`).join('')}<span class="tag">${l.waves} waves</span></div><br><button class="big-btn ${isOpen?'primary':''}" ${isOpen?'':'disabled'}>${isOpen?'Play Level':`Need ${l.unlock} stars`}</button>`;card.querySelector('button').onclick=()=>startGame(l.key,'Campaign');grid.appendChild(card);});}
  function renderLab(){const grid=$('labGrid');grid.innerHTML='';LAB.forEach(item=>{const r=labRank(item.key);const next=item.cost[r];const card=document.createElement('div');card.className='lab-card glass';card.innerHTML=`<h3>${item.name} <span class="tag">Rank ${r}/5</span></h3><p>${item.desc}</p><div class="card-row"><span class="tag">Core Shards: ${save.shards}</span><button class="big-btn primary" ${next===undefined||save.shards<next?'disabled':''}>${next===undefined?'MAX':`Upgrade ${next} shards`}</button></div>`;card.querySelector('button').onclick=()=>{if(next!==undefined&&save.shards>=next){save.shards-=next;save.lab[item.key]=r+1;playSound('upgrade');persist();renderLab();}};grid.appendChild(card);});}
  function renderAchievements(){checkAchievements();const grid=$('achievementGrid');grid.innerHTML='';ACH.forEach(a=>{const done=!!save.achievements[a.key];const card=document.createElement('div');card.className='achievement-card glass';card.innerHTML=`<h3>${done?'✅':'⬛'} ${a.name}</h3><p>${a.desc}</p><span class="tag">${done?'Claimed +2 shards':'Locked'}</span>`;grid.appendChild(card);});}
  function checkAchievements(){ACH.forEach(a=>{if(!save.achievements[a.key]&&a.check()){save.achievements[a.key]=true;save.shards+=2;showToast(`Achievement unlocked: ${a.name} +2 shards`);}});persist();}

  function startGame(levelKey, mode){unlockAudio(); const level=levelByKey(levelKey); const labCoins=labRank('coins')*40, labLives=labRank('lives')*2; game={mode,levelKey,level,wave:1,maxWaves:mode==='Endless'?999:level.waves,lives:level.lives+labLives,coins:level.coins+labCoins,score:0,kills:0,bossKills:0,towers:[],enemies:[],projectiles:[],effects:[],floating:[],tools:[],crates:[],spawnQueue:[],spawnTimer:0,waveActive:false,paused:false,speed:1,selectedType:null,selectedTool:null,selectedTowerId:null,nextEnemyId:1,nextTowerId:1,nextProjectileId:1,nextToolId:1,abilities:{emp:0,repair:0,overdrive:0,mine:0,drone:0,pulse:0},overdrive:0,perfect:true,combo:0,comboTimer:0,cacheTimer:8,shake:0,uiTimer:0,perfWarned:false,shakeCap:0,message:'Pick a tower, then tap the field.',uiDirty:true,perfMode:false, turboBonus:0, pulseReady:false}; dockTab='towers'; staticKey=''; showScreen('gameScreen'); $('levelNameText').textContent=level.name; $('modeText').textContent=mode; renderDock(); updateUI(); }

  $('dockTowersTab').onclick=()=>{dockTab='towers';renderDock();playSound('tap')}; $('dockToolsTab').onclick=()=>{dockTab='tools';renderDock();playSound('tap')}; $('dockAbilitiesTab').onclick=()=>{dockTab='abilities';renderDock();playSound('tap')};
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
  }
  function dockButton(name, sub, active, extra=''){
    const b=document.createElement('button');
    b.className='dock-item'+(active?' active':'')+(extra?' '+extra:'');
    b.innerHTML=`<span class="dock-label">${name}</span><span>${sub}</span>`;
    return b;
  }

  function startWave(){if(!game||game.waveActive||game.lives<=0)return; unlockAudio(); game.waveActive=true; game.perfect=true; game.spawnQueue=makeWave(game.wave); game.spawnTimer=.2; game.message='Wave running — towers attack automatically.'; playSound('wave'); updateUI();}
  function makeWave(wave){
    const list=[]; const pool=game.level.enemies; const mobile=isMobile();
    const count=Math.min(5+wave*(mobile ? .88 : 1.12), mobile?25:34);
    for(let i=0;i<count;i++){
      let type=choice(pool);
      if(wave<2&&['tank','healer','emp','flyer','camo','shielded','layer3','fast'].includes(type)) type='layer1';
      else {
        if(wave>=2&&Math.random()<.22) type='layer2';
        if(wave>=4&&Math.random()<.18) type='layer3';
        if(wave>=5&&Math.random()<.11) type='camo';
        if(wave>=6&&Math.random()<.12) type='shielded';
        if(wave>=7&&Math.random()<.13) type='fast';
      }
      if(wave%5===0&&i>=count-1) type=wave>=game.maxWaves?'final':'boss';
      const gap=game.perfMode ? .66 : (wave>20 ? .46 : .58);
      list.push({type, delay:i*gap, alt:!!game.level.altPath&&Math.random()<.34});
      if(type==='swarm' && (!mobile || wave<8)){
        list.push({type:'swarm',delay:i*gap+.16, alt:false});
        if(!mobile)list.push({type:'swarm',delay:i*gap+.32, alt:true});
      }
    }
    return list;
  }
  function makeEnemyObject(type,data,path,x,y,pathIndex=0,progress=0,scale=1){
    const hp=Math.max(1,Math.round(data.hp*scale));
    return {id:game.nextEnemyId++,type,name:data.name,x,y,pathIndex,path,progress,hp,maxHp:hp,speed:data.speed*(game.level.bg==='desert'?1.08:1),reward:data.reward,score:data.score,color:data.color,armor:data.armor||0,flying:!!data.flying,healer:!!data.healer,emp:!!data.emp,split:!!data.split,boss:!!data.boss,layer:data.layer||0,splitsTo:data.splitsTo||null,shielded:!!data.shielded,fast:!!data.fast,camo:!!data.camo,slowImmune:!!data.slowImmune,alive:true,slow:0,burn:0,poison:0,stun:0};
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
  function shouldPerfMode(){return !!(game && (save.settings.reduced || perf.autoLowFx || (isMobile() && (game.wave>=7 || game.speed>1 || game.enemies.length>24 || game.projectiles.length>34)) || game.enemies.length>38 || game.projectiles.length>48));}
  function update(dt){if(!game)return; if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').classList.add('hidden')} const cdMul=1+labRank('cooldown')*.10; for(const k in game.abilities) game.abilities[k]=Math.max(0,game.abilities[k]-dt*cdMul); game.overdrive=Math.max(0,game.overdrive-dt); game.shake=Math.max(0,game.shake-dt); updateSpawn(dt); updateEnemies(dt); updateTools(dt); updateTowers(dt); updateProjectiles(dt); updateCrates(dt); updateEffects(dt); checkWaveEnd(); game.uiTimer=(game.uiTimer||0)+dt; const uiGap=game.perfMode ? .24 : .14; if(game.uiTimer>uiGap){game.uiTimer=0; updateUI(false);}}
  function updateSpawn(dt){if(!game.waveActive||!game.spawnQueue.length)return; game.spawnTimer-=dt; let spawned=0; while(game.spawnQueue.length&&game.spawnTimer<=0){if(game.enemies.length>=PERF.maxEnemies || (game.perfMode&&spawned>=2)){game.spawnTimer=game.perfMode ? .28 : .18;break;}const item=game.spawnQueue.shift();spawnEnemy(item); spawned++; const next=game.spawnQueue[0]; game.spawnTimer=next?Math.max(game.perfMode ? .18 : .11,next.delay-item.delay):999;}}
  function updateEnemies(dt){for(const e of game.enemies){if(!e.alive)continue; if(e.burn>0){e.burn-=dt;damageEnemy(e,(e.burnDps||7)*dt,'dot',true)} if(e.poison>0){e.poison-=dt;damageEnemy(e,(e.poisonDps||5)*dt,'dot',true)} if(e.slow>0)e.slow-=dt;if(e.stun>0){e.stun-=dt;continue} if(e.healer&&Math.random()<.025){for(const o of game.enemies){if(o!==e&&o.alive&&Math.hypot(o.x-e.x,o.y-e.y)<120)o.hp=Math.min(o.maxHp,o.hp+18*dt)}} if(e.emp&&Math.random()<.006){const t=nearestTower(e.x,e.y,120); if(t){t.disabled=2.2;addFloating('EMP',t.x,t.y-20,'#a84cff');}}
      let sp=e.speed*((e.slow>0&&!e.slowImmune) ? .45 : 1); moveEnemy(e,sp*dt); if(e.pathIndex>=e.path.length-1){e.alive=false; game.lives-=e.boss?5:1; game.perfect=false; game.shake=.35;addFloating(e.boss?'-5 LIVES':'-1 LIFE',780,850,'#ff4f7a'); playSound('lose',.25); if(game.lives<=0)endGame(false);}}
    game.enemies=game.enemies.filter(e=>e.alive);}
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
    let damage=(24+lvl*12)*(t.type==='rocket'?1.55:t.type==='shadow'?1.85:1);
    let range=145+lvl*14+(t.type==='shadow'?90:0)+(t.type==='anti'?50:0);
    let rate=(.78+lvl*.11+(t.type==='tesla' ? .35 : 0))*(1+labRank('rate')*.04)*(game.overdrive>0?1.85:1);
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
      game.projectiles.push({id:game.nextProjectileId++,x:t.x,y:t.y,targetId:e.id,damage:dmg,color:d.color,hit:s.hit,type:t.type,branch:t.branch,crit,speed:t.type==='shadow'?900:620});
    }else{
      damageEnemy(e,dmg,s.hit);
    }
    if(crit)addFloating('CRIT',e.x,e.y-30,'#ffd65a');
  }
  function updateProjectiles(dt){const enemyMap=new Map(game.enemies.map(e=>[e.id,e]));for(const p of game.projectiles){const e=enemyMap.get(p.targetId);if(!e||!e.alive){p.dead=true;continue}const dx=e.x-p.x,dy=e.y-p.y,dist=Math.hypot(dx,dy)||1;if(dist<14||dist<p.speed*dt){impact(p,e);p.dead=true}else{p.x+=dx/dist*p.speed*dt;p.y+=dy/dist*p.speed*dt}}game.projectiles=game.projectiles.filter(p=>!p.dead).slice(-PERF.maxProjectiles)}
  function impact(p,e){if(p.hit==='splash'||(p.type==='flame'&&p.branch==='B')||(p.type==='rocket'&&p.branch==='A')){const rad=p.type==='rocket'&&p.branch==='A'?105:70;addExplosion(e.x,e.y,p.color,rad);const r2=rad*rad;for(const o of game.enemies){if(!o.alive)continue;const dx=o.x-e.x,dy=o.y-e.y,d2=dx*dx+dy*dy;if(d2<r2){const d=Math.sqrt(d2);damageEnemy(o,p.damage*(1-d/(rad*1.5)),p.hit)}}} else {damageEnemy(e,p.damage,p.hit);addSpark(e.x,e.y,p.color)} if(p.type==='tesla'){let jumps=game.perfMode?1:(p.branch==='A'?4:2);for(const o of game.enemies){if(jumps<=0)break;if(o===e||!o.alive)continue;const dx=o.x-e.x,dy=o.y-e.y;if(dx*dx+dy*dy<14400){damageEnemy(o,p.damage*(game.perfMode ? .7 : .45),p.branch==='B'?'slow':'zap');jumps--;}}} if(p.hit==='slow'||(p.type==='tesla'&&p.branch==='B'))e.stun=Math.max(e.stun,.25);}
  function damageEnemy(e,amount,effect,dot=false){
    if(!e||!e.alive)return;
    const pierce=['pierce','laser'].includes(effect);
    let armorTax=pierce?e.armor*.2:(effect==='poison'?e.armor*.35:e.armor);
    let real=Math.max(1,Math.round(amount-armorTax));
    if(e.shielded&&amount<65&&!['pierce','laser','splash'].includes(effect)){
      real=Math.max(1,Math.round(real*.22));
      if(!dot&&Math.random()<.18)addFloating('SHIELD',e.x,e.y-32,'#55d7ff');
    }
    if(effect==='burn'){e.burn=Math.max(e.burn,3);e.burnDps=Math.max(e.burnDps||0,10)}
    if(effect==='poison'){e.poison=Math.max(e.poison,4);e.poisonDps=Math.max(e.poisonDps||0,8)}
    if(effect==='slow'){
      if(e.slowImmune){if(!dot&&Math.random()<.12)addFloating('FAST',e.x,e.y-32,'#d7ff4c')}
      else e.slow=Math.max(e.slow,2.6);
    }
    e.hp-=real;
    if(!dot&&(!game.perfMode||Math.random()<.12)&&(!save.settings.reduced||Math.random()<.25))addFloating(real,e.x,e.y-20,effect==='laser'?'#fff':e.color);
    if(e.hp<=0)killEnemy(e);
  }
  function killEnemy(e){
    if(!e.alive)return;
    e.alive=false;game.kills++;game.combo++;game.comboTimer=2.5;game.coins+=e.reward;game.score+=e.score+game.combo*3;stats.score+=e.score;
    addFloating(`+$${e.reward}`,e.x,e.y-42,'#ffd65a');
    if(e.boss){game.bossKills++;stats.bosses++;game.shake=.6;addFloating('BOSS DOWN',e.x,e.y-62,'#ffd65a');}
    if(e.splitsTo)spawnLayerChildren(e);
    if(e.split){
      for(let i=0;i<(game.perfMode?1:2)&&game.enemies.length<PERF.maxEnemies;i++){
        const data=ENEMIES.swarm;
        const child=makeEnemyObject('swarm',data,e.path,e.x+rand(-8,8),e.y+rand(-8,8),e.pathIndex,e.progress,1);
        game.enemies.push(child);
      }
    }
    addExplosion(e.x,e.y,e.color,e.boss?80:(e.layer?36:28));
    if(game.combo%12===0){game.coins+=25;addFloating(`COMBO ${game.combo} +25`,e.x,e.y-55,'#a8ff24');}
    playSound('coin',.12);
  }
  function nearestTower(x,y,r){let best=null,bd=r;for(const t of game.towers){const d=Math.hypot(t.x-x,t.y-y);if(d<bd){best=t;bd=d}}return best;}
  function updateTools(dt){
    for(const t of game.towers)t.boosted=false;
    for(const tool of game.tools){
      if(tool.type==='barrier'){
        for(const e of game.enemies)if(!e.slowImmune&&Math.hypot(e.x-tool.x,e.y-tool.y)<100)e.slow=Math.max(e.slow,.45);
      }
      if(tool.type==='boost'){
        for(const t of game.towers)t.boosted=t.boosted||Math.hypot(t.x-tool.x,t.y-tool.y)<120;
      }
      if(tool.type==='mine'){
        for(const e of game.enemies){
          if(e.alive&&Math.hypot(e.x-tool.x,e.y-tool.y)<56){
            tool.dead=true;playSound('mine');addExplosion(tool.x,tool.y,'#ff38f8',90);
            for(const o of game.enemies)if(o.alive&&Math.hypot(o.x-tool.x,o.y-tool.y)<135)damageEnemy(o,160,'splash');
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
      const s=tStats(t); total+=s.income||0;
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
      let bonus=60+game.wave*9+(game.perfect?45:0)+Math.min(120,game.combo*2)+minerIncome;
      if((game.turboBonus||0)===game.wave){bonus+=35+game.wave*4;addFloating('TURBO BONUS',450,145,'#55d7ff');}
      game.coins+=bonus;game.score+=bonus*3;
      addFloating(game.perfect?'PERFECT WAVE':'WAVE CLEAR',450,110,game.perfect?'#ffd65a':'#a8ff24');
      showToast(`${game.perfect?'Perfect wave!':'Wave cleared.'} +${bonus} coins`);playSound('win',.55);
      if(game.wave>=game.maxWaves)endGame(true); else game.wave++;
    }
  }
  function endGame(win){game.paused=true; const stars=win?3:(game.wave>=Math.ceil(game.maxWaves*.66)?2:game.wave>=Math.ceil(game.maxWaves*.33)?1:0); const shardReward=Math.max(1,Math.floor(game.wave/5)+stars+(win?2:0)); save.bestWave=Math.max(save.bestWave,game.wave);save.bestScore=Math.max(save.bestScore,game.score); if(game.mode==='Campaign')save.stars[game.levelKey]=Math.max(save.stars[game.levelKey]||0,stars); save.shards+=shardReward; stats.wins+=win?1:0; stats.score+=game.score; save.stats=stats; persist(); checkAchievements(); playSound(win?'win':'lose'); openModal(`<h2 class="result-title">${win?'🏆 EMX Core Saved':'💥 Core Breached'}</h2><p><strong>${game.level.name}</strong><br>Wave ${game.wave}/${game.maxWaves} • Score ${game.score} • Kills ${game.kills} • Bosses ${game.bossKills}</p><p>Earned <strong>${'⭐'.repeat(stars)||'0 stars'}</strong> and <strong>${shardReward} Core Shards</strong>.</p><div class="guide-grid"><button class="big-btn primary" id="againBtn">Run It Back</button><button class="big-btn" id="mapBtn">Map Select</button><button class="big-btn" id="labGoBtn">Spend Shards</button></div>`);setTimeout(()=>{$('againBtn').onclick=()=>{closeModal();startGame(game.levelKey,game.mode)};$('mapBtn').onclick=()=>{closeModal();showScreen('mapScreen')};$('labGoBtn').onclick=()=>{closeModal();showScreen('labScreen')}});}

  function useAbility(k){
    if(game.abilities[k]>0)return; unlockAudio();
    const cdBase=ABILITY_META[k]?.cd||30; game.abilities[k]=cdBase;
    if(k==='emp'){
      for(const e of game.enemies){e.stun=Math.max(e.stun,2.5);if(!e.slowImmune)e.slow=Math.max(e.slow,4)}
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
  canvas.addEventListener('pointerup',e=>{e.preventDefault();if(!game||game.paused)return; const p=canvasPoint(e); const crate=game.crates.find(c=>Math.hypot(c.x-p.x,c.y-p.y)<40); if(crate){const reward=choice([50,65,80,100]);game.coins+=reward;game.score+=reward*4;crate.life=0;addExplosion(crate.x,crate.y,'#ffd65a',35);addFloating(`+${reward}`,crate.x,crate.y,'#ffd65a');playSound('coin');return} if(game.selectedTool)placeTool(game.selectedTool,p.x,p.y); else if(game.selectedType)placeTower(p.x,p.y); else selectTower(p.x,p.y); updateUI();});
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
      ctx.restore();
      drawHp(e);
    }
  }
  function drawHp(e){const w=e.boss?70:38,h=6,x=e.x-w/2,y=e.y-(e.boss?42:30);ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(x,y,w,h);ctx.fillStyle=e.hp/e.maxHp>.5?'#72ff15':e.hp/e.maxHp>.25?'#ffd65a':'#ff4f7a';ctx.fillRect(x,y,w*clamp(e.hp/e.maxHp,0,1),h)}
  function drawProjectiles(){for(const p of game.projectiles){ctx.strokeStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=lowFx()?0:14;ctx.lineWidth=p.type==='shadow'?4:3;ctx.beginPath();ctx.arc(p.x,p.y,p.crit?7:5,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0}}
  function drawCrates(){for(const c of game.crates){ctx.shadowColor='#ffd65a';ctx.shadowBlur=lowFx()?0:18;ctx.fillStyle='#ffd65a';ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(c.x-21,c.y-21,42,42,10);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#111';ctx.font='20px Arial';ctx.textAlign='center';ctx.fillText('⚡',c.x,c.y+7)}}
  function drawEffects(){for(const e of game.effects){const a=clamp(e.life/e.maxLife,0,1);ctx.globalAlpha=a;ctx.strokeStyle=e.color;ctx.fillStyle=e.color;ctx.shadowColor=e.color;ctx.shadowBlur=lowFx()?0:16;if(e.type==='explosion'){ctx.lineWidth=5;ctx.beginPath();ctx.arc(e.x,e.y,e.radius*(1-a),0,Math.PI*2);ctx.stroke()}else{ctx.beginPath();ctx.arc(e.x,e.y,3,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;ctx.shadowBlur=0}}
  function drawFloating(){for(const f of game.floating){ctx.globalAlpha=clamp(f.life,0,1);ctx.fillStyle=f.color;ctx.font='bold 20px Arial';ctx.textAlign='center';ctx.shadowColor='#000';ctx.shadowBlur=6;ctx.fillText(f.text,f.x,f.y);ctx.globalAlpha=1;ctx.shadowBlur=0}}
  function addSpark(x,y,color){if(game.effects.length>=PERF.maxEffects)return; const n=lowFx()?1:4;for(let i=0;i<n;i++)game.effects.push({type:'spark',x:x+rand(-8,8),y:y+rand(-8,8),color,life:rand(.14,.34),maxLife:.34}); if(game.effects.length>PERF.maxEffects)game.effects=capArray(game.effects,PERF.maxEffects);}
  function addExplosion(x,y,color,radius){if(game.effects.length>=PERF.maxEffects&&lowFx())return; game.effects.push({type:'explosion',x,y,color,radius:lowFx()?radius*.75:radius,life:.34,maxLife:.34});for(let i=0;i<(lowFx()?1:5);i++)addSpark(x+rand(-radius/4,radius/4),y+rand(-radius/4,radius/4),color); if(game.effects.length>PERF.maxEffects)game.effects=capArray(game.effects,PERF.maxEffects)}
  function addFloating(text,x,y,color){if(lowFx()&&game.floating.length>12)return; game.floating.push({text:String(text),x,y,color,life:lowFx() ? .72 : 1.05,maxLife:1.05}); if(game.floating.length>PERF.maxFloating)game.floating=capArray(game.floating,PERF.maxFloating)}

  function setText(id,val){const el=$(id);val=String(val);if(el&&el.textContent!==val)el.textContent=val;}
  function updateUI(full=true){if(!game)return; setText('waveText',`${game.wave}/${game.maxWaves===999?'∞':game.maxWaves}`);setText('livesText',game.lives);setText('coinsText',Math.floor(game.coins));setText('scoreText',Math.floor(game.score));setText('startWaveBtn',game.waveActive?'Wave Running':'Start Wave');setText('pauseBtn',game.paused?'Resume':'Pause');setText('speedBtn',`${game.speed}x Speed`);setText('soundBtn',save.settings.sound?'🔊':'🔇');setText('statusText',game.perfMode?'Performance mode active — heavy wave optimized.':(game.message||'Ready.')); const boss=game.enemies.find(e=>e.boss); if(boss){$('bossBar').classList.remove('hidden');$('bossBarFill').style.width=`${clamp(boss.hp/boss.maxHp*100,0,100)}%`;setText('bossBarText',`${boss.name} ${Math.ceil(boss.hp)}/${boss.maxHp}`)}else $('bossBar').classList.add('hidden'); if(full||dockTab==='abilities')renderDock(); if(full){renderMissions(); if(game.selectedTowerId)showTowerPanel();}}
  function renderMissions(){const m=[{t:'Place 3 towers',d:game.towers.length>=3},{t:'Defeat 25 enemies',d:game.kills>=25},{t:'Clear boss wave',d:game.bossKills>0},{t:'Keep perfect core',d:game.perfect&&game.wave>1}];$('missionList').innerHTML=m.map(x=>`<div class="mission-item ${x.d?'done':''}"><span>${x.t}</span><b>${x.d?'DONE':'ACTIVE'}</b></div>`).join('')}

  function openModal(html){$('modalBody').innerHTML=html;$('modal').classList.remove('hidden')} function closeModal(){$('modal').classList.add('hidden')}
  function openGuide(){playSound('tap');openModal(`<h2>📘 EMX Defense Guide</h2><div class="guide-grid"><p><strong>BTD Layers:</strong> Purple multi-layer glitches pop into green layers, then blue layers. Splash towers and chain towers are best for clearing layers.</p><p><strong>Special Enemies:</strong> Shielded enemies punish weak hits, fast enemies resist slows, camo enemies need Shadow Sniper, Prism Scanner, or EMX Hub scanner support.</p><p><strong>Support + Economy:</strong> EMX Hub buffs nearby tower speed and can reveal camo. Crypto Miner generates bonus coins every cleared wave and Path B can mine Core Shards.</p><p><strong>Targeting:</strong> Tap a tower, then use Target to switch First, Last, Strongest, or Closest targeting.</p><p><strong>Branches:</strong> Upgrade a tower to level 3 and choose Path A or Path B. Branches change strategy instead of only adding stats.</p><p><strong>Performance:</strong> Heavy waves and speed mode use capped projectiles/effects, direct-hit fallback, and mobile performance mode to reduce freezing.</p></div>`)}
  function openSettings(){playSound('tap');openModal(`<h2>⚙️ Settings</h2><div class="guide-grid"><button id="setSound" class="big-btn">Sound: ${save.settings.sound?'ON':'OFF'}</button><button id="setVibrate" class="big-btn">Vibration: ${save.settings.vibrate?'ON':'OFF'}</button><button id="setReduced" class="big-btn">Performance FX: ${save.settings.reduced?'LOW':'AUTO'}</button><button id="resetAll" class="big-btn danger">Reset Save</button></div>`);setTimeout(()=>{$('setSound').onclick=()=>{save.settings.sound=!save.settings.sound;persist();openSettings()};$('setVibrate').onclick=()=>{save.settings.vibrate=!save.settings.vibrate;persist();openSettings()};$('setReduced').onclick=()=>{save.settings.reduced=!save.settings.reduced;persist();openSettings()};$('resetAll').onclick=()=>{localStorage.removeItem(saveKey);save=loadSave();stats={bosses:0,towers:0,score:0,wins:0};closeModal();updateMenu();}})}
  function showToast(msg,ms=1600){$('toast').textContent=msg;$('toast').classList.remove('hidden');toastTimer=ms/1000; if(save.settings.vibrate&&navigator.vibrate)navigator.vibrate(18)}

  function unlockAudio(){if(audioUnlocked)return; audioUnlocked=true; try{audioCtx=new (window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==='suspended')audioCtx.resume();}catch{} preloadSfx();}
  function preloadSfx(){['tap','place','shoot','blast','coin','wave','win','lose','flame','zap','ice','poison','rocket','shadow','laser','nova','mine','drone','upgrade'].forEach(name=>{const a=new Audio();a.preload='auto';a.src=`assets/sfx/${name}.wav`;a.onerror=()=>{a.src=`sfx/${name}.wav`};sfx[name]=a;});}
  function playSound(name='tap',vol=.45){if(!save.settings.sound)return; const now=performance.now(); const attack=['shoot','flame','zap','ice','poison','rocket','shadow','laser']; const gap=attack.includes(name)?(lowFx()?220:105):55; if(soundGate[name]&&now-soundGate[name]<gap)return; soundGate[name]=now; try{if(!audioUnlocked)unlockAudio(); const a=sfx[name]||sfx.tap; if(a){const clone=a.cloneNode();clone.volume=lowFx()?Math.min(vol,.22):vol;clone.play().catch(()=>fallbackSound(name,vol));}else fallbackSound(name,vol);}catch{fallbackSound(name,vol)}}
  function fallbackSound(name,vol){if(!save.settings.sound||!audioCtx)return; const o=audioCtx.createOscillator(),g=audioCtx.createGain(); const freq={tap:520,place:330,shoot:760,blast:120,coin:920,wave:250,win:660,lose:140,flame:220,zap:880,ice:640,poison:300,rocket:180,shadow:420,laser:980,nova:520,mine:110,drone:720,upgrade:700}[name]||440; o.type=name==='blast'||name==='mine'?'sawtooth':'sine'; o.frequency.setValueAtTime(freq,audioCtx.currentTime); g.gain.setValueAtTime(vol*.08,audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.18); o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+.2)}

  updateMenu(); renderMaps();
})();
