/**
 * loadMediaPipe.js — Robust script loader for MediaPipe Hands
 * 
 * Ensures hands.js, camera_utils.js, and drawing_utils.js are fully ready.
 */

export const loadMediaPipeScripts = () => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.Hands && window.drawConnectors && window.Camera) {
      return resolve({
        Hands: window.Hands,
        drawConnectors: window.drawConnectors,
        drawLandmarks: window.drawLandmarks,
        HAND_CONNECTIONS: window.HAND_CONNECTIONS,
        Camera: window.Camera
      });
    }

    const scripts = [
      'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'
    ];

    let loadedCount = 0;
    const totalScripts = scripts.length;

    const onScriptLoad = () => {
      loadedCount++;
      if (loadedCount === totalScripts) {
        // Double check globals
        if (window.Hands) {
          resolve({
            Hands: window.Hands,
            drawConnectors: window.drawConnectors,
            drawLandmarks: window.drawLandmarks,
            HAND_CONNECTIONS: window.HAND_CONNECTIONS,
            Camera: window.Camera
          });
        } else {
          reject(new Error('MediaPipe Hands failed to initialize globals.'));
        }
      }
    };

    scripts.forEach(src => {
      // Check if script already exists
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded === 'true') {
          onScriptLoad();
        } else {
          existing.addEventListener('load', onScriptLoad);
          existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
        }
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.crossOrigin = 'anonymous';
      script.async = true;
      script.onload = () => {
        script.dataset.loaded = 'true';
        onScriptLoad();
      };
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  });
};
