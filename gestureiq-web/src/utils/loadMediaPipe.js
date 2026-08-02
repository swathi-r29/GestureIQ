/**
 * loadMediaPipe.js — Robust script loader for MediaPipe Hands and MediaPipe Pose
 */

export const loadMediaPipeScripts = () => {
  return new Promise((resolve, reject) => {
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
        if (window.Hands) {
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
      script.onload = onScriptLoad;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  });
};

export const loadMediaPipePoseScripts = () => {
  return new Promise((resolve, reject) => {
    if (window.Pose && window.drawConnectors && window.drawLandmarks && window.POSE_CONNECTIONS) {
      return resolve({
        Pose: window.Pose,
        drawConnectors: window.drawConnectors,
        drawLandmarks: window.drawLandmarks,
        POSE_CONNECTIONS: window.POSE_CONNECTIONS
      });
    }

    const scripts = [
      'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js'
    ];

    let loadedCount = 0;
    const totalScripts = scripts.length;

    const onScriptLoad = () => {
      loadedCount++;
      if (loadedCount === totalScripts) {
        if (window.Pose) {
          resolve({
            Pose: window.Pose,
            drawConnectors: window.drawConnectors,
            drawLandmarks: window.drawLandmarks,
            POSE_CONNECTIONS: window.POSE_CONNECTIONS
          });
        } else {
          reject(new Error('MediaPipe Pose failed to initialize globals.'));
        }
      }
    };

    scripts.forEach(src => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (window.Pose) {
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
      script.onload = onScriptLoad;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  });
};

export const loadMediaPipeHolisticScripts = () => {
  return new Promise((resolve, reject) => {
    if (window.Holistic && window.drawConnectors && window.POSE_CONNECTIONS) {
      return resolve({
        Holistic: window.Holistic,
        drawConnectors: window.drawConnectors,
        drawLandmarks: window.drawLandmarks,
        POSE_CONNECTIONS: window.POSE_CONNECTIONS,
        FACEMESH_TESSELATION: window.FACEMESH_TESSELATION,
        HAND_CONNECTIONS: window.HAND_CONNECTIONS,
      });
    }

    const scripts = [
      'https://cdn.jsdelivr.net/npm/@mediapipe/holistic/holistic.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
    ];

    let loadedCount = 0;
    const total = scripts.length;

    const onLoad = () => {
      loadedCount++;
      if (loadedCount === total) {
        if (window.Holistic) {
          resolve({
            Holistic: window.Holistic,
            drawConnectors: window.drawConnectors,
            drawLandmarks: window.drawLandmarks,
            POSE_CONNECTIONS: window.POSE_CONNECTIONS,
            FACEMESH_TESSELATION: window.FACEMESH_TESSELATION,
            HAND_CONNECTIONS: window.HAND_CONNECTIONS,
          });
        } else {
          reject(new Error('MediaPipe Holistic failed to initialize.'));
        }
      }
    };

    scripts.forEach(src => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (window.Holistic || window.drawConnectors) { onLoad(); }
        else {
          existing.addEventListener('load', onLoad);
          existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
        }
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.crossOrigin = 'anonymous';
      script.async = true;
      script.onload = onLoad;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  });
};
