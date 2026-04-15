# GestureIQ Error Fixes TODO

## PWA Errors (manifest.json ERR_EMPTY_RESPONSE, pwa-register)
- Delete gestureiq-web/public/manifest.json (conflict with VitePWA)
- Verify vite.config.js generates correctly

## LearnDouble.jsx Linter Fixes
- Remove unused vars (missing, isCrossLocked?)
- Fix empty catch blocks (add console.log or remove)
- Add missing deps to useEffect (handleMudraMastered)

## Testing
- cd gestureiq-web && npm install (if needed)
- npm run dev
- Open localhost:5173/pages/LearnDouble, check console
- Ensure Flask backend 5001 running for API

