EMX CORE DEFENSE - LAYOUT + SOUND FIX UPGRADE

WHAT CHANGED
- Added a sticky Quick Battle Dock so towers/tools/abilities can be selected while the battlefield stays visible.
- Added tabs: Towers, Tools, Abilities.
- Made the mobile gameplay layout more compact.
- Hid the huge lower shop/tool/ability panels on small phones because the Quick Dock replaces them.
- Added a Sound button in the control row.
- Rebuilt sound unlock logic for iPhone/PWA browsers.
- Supports BOTH sound folder paths:
  1. assets/sfx/tap.wav
  2. sfx/tap.wav
- Added generated fallback beeps if a WAV file fails to load, so clicks/attacks still make sound.

IMPORTANT SOUND NOTE
On iPhone, sound still requires the first real tap. Press Play Defense once, then the sound engine unlocks. Also make sure Silent Mode is off and volume is up.

FILES/FOLDERS
Root:
- index.html
- style.css
- script.js
- manifest.webmanifest
- README_EMX_CORE_DEFENSE.txt
- sfx/  (fallback sound folder)

Assets:
- assets/emx-logo.png
- assets/emx-banner.png
- assets/emx-bg.png
- assets/icons
- assets/sfx/  (main sound folder)
