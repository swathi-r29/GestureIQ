/**
 * loadMediaPipe.js — Robust script loader for MediaPipe Hands
 * 
 * Ensures hands.js, camera_utils.js, and drawing_utils.js are fully ready.
 */

export const loadMediaPipeScripts = () => {
  return new Promise((resolve, reject) => {
    // Check if already loaded by index.html (which is how we do it now)
    if (window.Hands && window.drawConnectors && window.drawLandmarks && window.HAND_CONNECTIONS) {
      return resolve({
        Hands: window.Hands,
        drawConnectors: window.drawConnectors,
        drawLandmarks: window.drawLandmarks,
        HAND_CONNECTIONS: window.HAND_CONNECTIONS
      });
    }

    const scripts = [
      'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js'
    ];

    let loadedCount = 0;
    const totalScripts = scripts.length;

    const onScriptLoad = () => {
      loadedCount++;
      if (loadedCount === totalScripts) {
        if (window.Hands) {
          resolve({
            Hands: window.Hands,
            drawConnectors: window.drawConnectors,
            drawLandmarks: window.drawLandmarks,
            HAND_CONNECTIONS: window.HAND_CONNECTIONS
          });
        } else {
          reject(new Error('MediaPipe Hands failed to initialize globals.'));
        }
      }
    };

    scripts.forEach(src => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        // If it exists but window.Hands isn't ready yet, it's still loading
        existing.addEventListener('load', onScriptLoad);
        existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.crossOrigin = 'anonymous';
      script.async = true;
      script.onload = onScriptLoad;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  });
};
