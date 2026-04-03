Gym Tools PWA Rebuild

What this is
- A parallel rebuild of the Gym Tools suite.
- Existing uploaded files were left untouched.
- This version is rebuilt as a new PWA-style folder.

What is included
- Root app shell with direct main menu screen
- Gym Timer rebuilt so the menu is the opening screen
- Exercise Selector rebuilt
- Rest Timer / Set Counter rebuilt
- Split screen page
- Shared theme, fullscreen buttons, and utility clock
- Service worker and manifest for PWA installability

Notes
- Double-tap zoom is reduced through viewport settings, touch-action, and larger controls.
- Fullscreen is available through the Full / ⛶ buttons where the browser allows it.
- Some iOS/browser zoom and fullscreen behaviours are still platform-limited.

Files
- index.html
- menu.html
- split.html
- manifest.json
- sw.js
- shared.css
- shared.js
- gymtimer/index.html
- resttimer/index.html
- resttimer/styles.css
- resttimer/script.js
- HIIT/index.html
- HIIT/exercises.txt
- tools.json
- combos.json
