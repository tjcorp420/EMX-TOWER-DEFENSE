EMX TOWER DEFENSE V5 PHASE 2 - LIGHT UPGRADE

This ZIP intentionally does NOT include existing assets, images, or sound files.
Keep your current assets/ and sfx/ folders in the project.
Replace the root code files with these files:
- index.html
- style.css
- script.js
- manifest.webmanifest

Added in this upgrade:
- Advanced projectile system
  - Pierce shots for Shadow Sniper and Anti-Air Prism
  - Rocket and Mine AoE blast damage
  - Flame/Cryo/Venom branch AoE effects
  - Tesla chain lightning jumps
  - Projectile lifespan and mobile caps

- Real status/debuff system
  - Enemy objects now have statusEffects[]
  - Frozen slows enemies for a duration
  - Burn deals damage over time every second
  - Venom deals damage over time and refreshes instead of stacking infinitely
  - Fast enemies resist freezing/slow effects

- BTD-style wave manager
  - Waves are built from enemy-group blueprints
  - Smooth spawn spacing instead of dump-spawning
  - Special enemy groups scale up over time
  - Boss every 5 waves
  - Mobile queue caps to reduce freezing

- Core damage scaling
  - Layer 1 enemies cost 1 life
  - Layer 2 enemies cost 2 lives
  - Layer 3 enemies cost 3 lives
  - Tanks, shielded enemies, bosses, and final bosses cost more

- Extra polish
  - Status icons above enemies
  - Beam effect for Tesla chain lightning
  - Updated in-game guide text
  - Performance caps tightened for wave 7+ and speed mode

After replacing files, test:
1. Open the app.
2. Start Endless or Campaign.
3. Place a Flame, Tesla, Rocket, Cryo, Venom, and Shadow tower.
4. Speed up after wave 7 and check for smoother performance.
