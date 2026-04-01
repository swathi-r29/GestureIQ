import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

// ─── MediaPipe hand connection pairs ────────────────────────
const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],         // thumb
  [0,5],[5,6],[6,7],[7,8],         // index
  [0,9],[9,10],[10,11],[11,12],    // middle
  [0,13],[13,14],[14,15],[15,16],  // ring
  [0,17],[17,18],[18,19],[19,20],  // pinky
  [5,9],[9,13],[13,17],            // palm knuckle bar
];

const FINGER_COLORS = {
  thumb:  "#f59e0b",
  index:  "#3b82f6",
  middle: "#8b5cf6",
  ring:   "#10b981",
  pinky:  "#f43f5e",
};

// which landmark indices belong to each finger
const FINGER_LANDMARK_MAP = {
  thumb:  [1,2,3,4],
  index:  [5,6,7,8],
  middle: [9,10,11,12],
  ring:   [13,14,15,16],
  pinky:  [17,18,19,20],
};

function getLandmarkColor(idx, deviationMap) {
  for (const [finger, indices] of Object.entries(FINGER_LANDMARK_MAP)) {
    if (indices.includes(idx)) {
      const dev = deviationMap[finger] ?? 0;
      if (dev > 40) return "#ef4444";
      if (dev > 20) return "#f97316";
      return FINGER_COLORS[finger];
    }
  }
  return "#94a3b8"; // wrist
}

function buildScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000, 0);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.001, 100);
  camera.position.set(0, 0, 1.8);

  // Ambient + directional lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(1, 2, 2);
  scene.add(dir);

  return { renderer, scene, camera };
}

function buildHandObjects(scene) {
  // 21 joint spheres
  const spheres = Array.from({ length: 21 }, (_, i) => {
    const geo  = new THREE.SphereGeometry(i === 0 ? 0.022 : 0.016, 16, 16);
    const mat  = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.2 });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    return mesh;
  });

  // bone cylinders for each connection
  const bones = CONNECTIONS.map(([a, b]) => {
    const mat  = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6, metalness: 0.1, transparent: true, opacity: 0.85 });
    const geo  = new THREE.CylinderGeometry(0.007, 0.007, 1, 8);
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    return { mesh, a, b };
  });

  // reference ghost hand — same structure but translucent gold
  const refSpheres = Array.from({ length: 21 }, () => {
    const geo  = new THREE.SphereGeometry(0.014, 12, 12);
    const mat  = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5, metalness: 0.1, transparent: true, opacity: 0.35 });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    return mesh;
  });

  const refBones = CONNECTIONS.map(([a, b]) => {
    const mat  = new THREE.MeshStandardMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.2 });
    const geo  = new THREE.CylinderGeometry(0.005, 0.005, 1, 8);
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    return { mesh, a, b };
  });

  return { spheres, bones, refSpheres, refBones };
}

function landmarksToVec3(lm) {
  // MediaPipe: x left→right, y top→bottom, z depth
  // Three.js:  x left→right, y bottom→top, z toward camera
  return new THREE.Vector3(
    (lm.x - 0.5) * 1.6,
    -(lm.y - 0.5) * 1.6,
    -lm.z * 0.8
  );
}

function updateBone(bone, posA, posB) {
  const dir    = new THREE.Vector3().subVectors(posB, posA);
  const length = dir.length();
  if (length < 0.0001) return;

  bone.mesh.scale.y = length;
  bone.mesh.position.copy(posA).lerp(posB, 0.5);

  const axis = new THREE.Vector3(0, 1, 0);
  bone.mesh.quaternion.setFromUnitVectors(axis, dir.normalize());
}

// ─── MAIN COMPONENT ─────────────────────────────────────────
export default function HandVisualiser({ targetMudra = "", apiBase = import.meta.env.VITE_FLASK_URL || "" }) {
  const canvasRef   = useRef(null);
  const sceneRef    = useRef(null);
  const objectsRef  = useRef(null);
  const animRef     = useRef(null);
  const dataRef     = useRef({ landmarks: [], refLandmarks: [], deviations: {} });

  const [info, setInfo]       = useState({ mudra: "", accuracy: 0, detected: false, angles: {}, refAngles: {} });
  const [showRef, setShowRef] = useState(true);
  const [loading, setLoading] = useState(true);

  // ── Build Three.js scene once ──────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { renderer, scene, camera } = buildScene(canvas);
    const objects = buildHandObjects(scene);

    sceneRef.current  = { renderer, scene, camera };
    objectsRef.current = objects;

    let frameId;
    let angle = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      angle  += 0.004;

      const { landmarks, refLandmarks, deviations } = dataRef.current;
      const { spheres, bones, refSpheres, refBones } = objectsRef.current;

      // Auto-rotate when no hand detected
      if (landmarks.length === 0) {
        camera.position.x = Math.sin(angle) * 1.8;
        camera.position.z = Math.cos(angle) * 1.8;
        camera.lookAt(0, 0, 0);
      }

      // Update live hand
      if (landmarks.length === 21) {
        const vecs = landmarks.map(landmarksToVec3);
        vecs.forEach((v, i) => {
          spheres[i].position.copy(v);
          const hex = parseInt(getLandmarkColor(i, deviations).replace("#", ""), 16);
          spheres[i].material.color.setHex(hex);
          spheres[i].visible = true;
        });
        bones.forEach(b => {
          updateBone(b, vecs[b.a], vecs[b.b]);
          b.mesh.visible = true;
        });
      } else {
        spheres.forEach(s => s.visible = false);
        bones.forEach(b => b.mesh.visible = false);
      }

      // Update reference ghost hand
      if (showRef && refLandmarks.length === 21) {
        const vecs = refLandmarks.map(landmarksToVec3);
        vecs.forEach((v, i) => {
          refSpheres[i].position.copy(v);
          refSpheres[i].visible = true;
        });
        refBones.forEach(b => {
          updateBone(b, vecs[b.a], vecs[b.b]);
          b.mesh.visible = true;
        });
      } else {
        refSpheres.forEach(s => s.visible = false);
        refBones.forEach(b => b.mesh.visible = false);
      }

      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };

    animate();
    animRef.current = frameId;

    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
    };
  }, [showRef]);

  // ── Poll /api/landmarks at 10fps ───────────────────────────
  useEffect(() => {
    let running = true;

    const poll = async () => {
      while (running) {
        try {
          const res  = await fetch(`${apiBase}/api/landmarks?target=${targetMudra}`);
          const data = await res.json();

          // Compute per-finger deviation
          const deviations = {};
          if (data.current_angles && data.ref_angles) {
            for (const finger of ["thumb","index","middle","ring","pinky"]) {
              const cur = data.current_angles[finger];
              const ref = data.ref_angles[finger];
              if (cur !== undefined && ref !== undefined) {
                deviations[finger] = Math.abs(cur - ref);
              }
            }
          }

          dataRef.current = {
            landmarks:    data.landmarks || [],
            refLandmarks: [],           // populated below if available
            deviations,
          };

          setInfo({
            mudra:     data.mudra_name || "",
            detected:  data.detected   || false,
            angles:    data.current_angles || {},
            refAngles: data.ref_angles     || {},
          });
          setLoading(false);
        } catch (e) {
          setLoading(false);
        }
        await new Promise(r => setTimeout(r, 100)); // 10fps
      }
    };

    poll();
    return () => { running = false; };
  }, [targetMudra, apiBase]);

  const fingerEntries = ["thumb","index","middle","ring","pinky"];

  return (
    <div style={{
      display: "flex", gap: "16px", width: "100%",
      fontFamily: "'DM Sans', sans-serif",
    }}>

      {/* ── Canvas ─────────────────────────────────── */}
      <div style={{
        flex: "0 0 320px", height: "340px", position: "relative",
        borderRadius: "16px", overflow: "hidden",
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)",
        border: "1px solid rgba(139,92,246,0.3)",
        boxShadow: "0 0 40px rgba(139,92,246,0.15)",
      }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />

        {/* status badge */}
        <div style={{
          position: "absolute", top: "12px", left: "12px",
          display: "flex", alignItems: "center", gap: "6px",
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
          borderRadius: "20px", padding: "4px 12px",
          border: `1px solid ${info.detected ? "rgba(16,185,129,0.5)" : "rgba(255,255,255,0.1)"}`,
        }}>
          <div style={{
            width: "8px", height: "8px", borderRadius: "50%",
            background: info.detected ? "#10b981" : info.landmarks?.length > 0 ? "#3b82f6" : "#6b7280",
            boxShadow: info.detected ? "0 0 6px #10b981" : info.landmarks?.length > 0 ? "0 0 6px #3b82f6" : "none",
          }} />
          <span style={{ fontSize: "12px", color: info.detected ? "#a7f3d0" : info.landmarks?.length > 0 ? "#bfdbfe" : "#9ca3af", fontWeight: 600 }}>
            {loading ? "Connecting…" : info.detected ? info.mudra || "Detecting…" : info.landmarks?.length > 0 ? "Hand Tracked" : "No hand"}
          </span>
        </div>

        {/* toggle ref button */}
        <button
          onClick={() => setShowRef(v => !v)}
          style={{
            position: "absolute", top: "12px", right: "12px",
            background: showRef ? "rgba(245,158,11,0.25)" : "rgba(0,0,0,0.4)",
            border: `1px solid ${showRef ? "rgba(245,158,11,0.6)" : "rgba(255,255,255,0.15)"}`,
            borderRadius: "8px", padding: "4px 10px",
            color: showRef ? "#fcd34d" : "#9ca3af", fontSize: "11px", fontWeight: 700,
            cursor: "pointer", backdropFilter: "blur(6px)",
          }}
        >
          {showRef ? "● REF ON" : "○ REF OFF"}
        </button>

        {/* legend */}
        <div style={{
          position: "absolute", bottom: "10px", left: "12px",
          display: "flex", gap: "8px", flexWrap: "wrap",
        }}>
          {fingerEntries.map(f => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: "3px" }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: FINGER_COLORS[f] }} />
              <span style={{ fontSize: "10px", color: "#94a3b8", textTransform: "capitalize" }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Angle Comparison Panel ──────────────────── */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", gap: "8px",
        minWidth: 0,
      }}>
        <div style={{
          fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em",
          color: "#64748b", textTransform: "uppercase", marginBottom: "2px",
        }}>
          Joint Angle Deviation — {targetMudra ? targetMudra.toUpperCase() : "Free Practice"}
        </div>

        {fingerEntries.map(finger => {
          const cur = info.angles[finger];
          const ref = info.refAngles[finger];
          const dev = (cur !== undefined && ref !== undefined) ? Math.abs(cur - ref) : null;
          const pct = dev !== null ? Math.min(dev / 90, 1) : 0;
          const color = dev === null ? "#475569"
            : dev <= 20  ? "#10b981"
            : dev <= 40  ? "#f59e0b"
            : "#ef4444";

          return (
            <div key={finger} style={{
              background: "rgba(15,23,42,0.6)",
              border: `1px solid ${dev !== null && dev > 40 ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.06)"}`,
              borderRadius: "10px", padding: "8px 12px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: FINGER_COLORS[finger] }} />
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#e2e8f0", textTransform: "capitalize" }}>{finger}</span>
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  {ref !== undefined && (
                    <span style={{ fontSize: "11px", color: "#f59e0b" }}>
                      ref {Math.round(ref)}°
                    </span>
                  )}
                  {cur !== undefined && (
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                      you {Math.round(cur)}°
                    </span>
                  )}
                  <span style={{
                    fontSize: "11px", fontWeight: 700,
                    color: color, minWidth: "42px", textAlign: "right",
                  }}>
                    {dev !== null ? `${dev <= 20 ? "✓" : "Δ"} ${Math.round(dev)}°` : "—"}
                  </span>
                </div>
              </div>

              {/* deviation bar */}
              <div style={{
                height: "4px", borderRadius: "2px",
                background: "rgba(255,255,255,0.07)", overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", borderRadius: "2px",
                  width: `${pct * 100}%`,
                  background: `linear-gradient(90deg, ${color}88, ${color})`,
                  transition: "width 0.2s ease, background 0.2s ease",
                }} />
              </div>
            </div>
          );
        })}

        {/* ref hand legend */}
        {showRef && (
          <div style={{
            marginTop: "4px", padding: "7px 12px",
            background: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px",
          }}>
            <div style={{ width: "28px", height: "4px", borderRadius: "2px", background: "rgba(245,158,11,0.5)" }} />
            <span style={{ fontSize: "11px", color: "#fcd34d" }}>
              Gold ghost = reference pose for {targetMudra || "selected mudra"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}