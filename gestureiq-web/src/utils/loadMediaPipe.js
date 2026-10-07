// src/utils/loadMediaPipe.js

export const safeLocateFile = (pkg, file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/${pkg}/${file}`;
};

const loadSingleScript = (src) => {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true' || existing.readyState === 'complete') {
        return resolve();
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
};

export const loadMediaPipeScripts = async () => {
  if (window.Hands && window.drawConnectors && window.drawLandmarks && window.HAND_CONNECTIONS) {
    return {
      Hands: window.Hands,
      drawConnectors: window.drawConnectors,
      drawLandmarks: window.drawLandmarks,
      HAND_CONNECTIONS: window.HAND_CONNECTIONS
    };
  }

  await Promise.all([
    loadSingleScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'),
    loadSingleScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js')
  ]);

  if (!window.Hands) {
    throw new Error('MediaPipe Hands global not found.');
  }

  return {
    Hands: window.Hands,
    drawConnectors: window.drawConnectors,
    drawLandmarks: window.drawLandmarks,
    HAND_CONNECTIONS: window.HAND_CONNECTIONS
  };
};

export const loadMediaPipePoseScripts = async () => {
  if (window.Pose && window.drawConnectors && window.drawLandmarks && window.POSE_CONNECTIONS) {
    return {
      Pose: window.Pose,
      drawConnectors: window.drawConnectors,
      drawLandmarks: window.drawLandmarks,
      POSE_CONNECTIONS: window.POSE_CONNECTIONS
    };
  }

  await Promise.all([
    loadSingleScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js'),
    loadSingleScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js')
  ]);

  if (!window.Pose) {
    throw new Error('MediaPipe Pose global not found.');
  }

  return {
    Pose: window.Pose,
    drawConnectors: window.drawConnectors,
    drawLandmarks: window.drawLandmarks,
    POSE_CONNECTIONS: window.POSE_CONNECTIONS
  };
};

export const loadMediaPipeHolisticScripts = async () => {
  if (window.Holistic && window.drawConnectors && window.POSE_CONNECTIONS) {
    return {
      Holistic: window.Holistic,
      drawConnectors: window.drawConnectors,
      drawLandmarks: window.drawLandmarks,
      POSE_CONNECTIONS: window.POSE_CONNECTIONS,
      FACEMESH_TESSELATION: window.FACEMESH_TESSELATION,
      HAND_CONNECTIONS: window.HAND_CONNECTIONS,
    };
  }

  await Promise.all([
    loadSingleScript('https://cdn.jsdelivr.net/npm/@mediapipe/holistic/holistic.js'),
    loadSingleScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js')
  ]);

  if (!window.Holistic) {
    throw new Error('MediaPipe Holistic global not found.');
  }

  return {
    Holistic: window.Holistic,
    drawConnectors: window.drawConnectors,
    drawLandmarks: window.drawLandmarks,
    POSE_CONNECTIONS: window.POSE_CONNECTIONS,
    FACEMESH_TESSELATION: window.FACEMESH_TESSELATION,
    HAND_CONNECTIONS: window.HAND_CONNECTIONS,
  };
};
