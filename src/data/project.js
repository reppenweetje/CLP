// Project-loader wrapper (Fase 1a — simpele re-export).
//
// In Fase 1b wordt dit een hostname-bewuste loader die kiest tussen
// meerdere projecten in src/data/projects/. Voor nu is het een
// transparante doorzetting van De Hofman zodat alle bestaande imports
// (App.jsx, DebugPanel.jsx, IntroScreen.jsx) blijven werken zonder
// dat we ze hoeven aan te passen.
//
// Architectuur: hybride CLP-template (1 repo, 1 Vercel-project, N
// subdomeinen). Zie TEMPLATE_DUPLICATION_PLAN.md voor de roadmap.

export { project, uspCardOrder } from './projects/dehofman.js'
