from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
import cv2
import mediapipe as mp
import pickle
import numpy as np
import math
import base64
import os
from datetime import datetime
from collections import deque
import sys

# Add root directory to path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.feature_engineering import extract_features, get_angle, get_distance

app = Flask(__name__)
CORS(app, origins="*")
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading', path='/flask.socket.io')

BASE_DIR = os.path.dirname(__file__)
MODEL_DIR = os.path.join(BASE_DIR, "../models")

# ── Load mudra model ──────────────────────────────────────────────────────────
mudra_model_path = os.path.join(MODEL_DIR, "mudra_model.pkl")
with open(mudra_model_path, "rb") as f:
    model = pickle.load(f)

# ── Internal Classes ──────────────────────────────────────────────────────────
class LM:
    __slots__ = ('x', 'y', 'z')
    def __init__(self, x, y, z):
        self.x, self.y, self.z = x, y, z

class LMWrapper:
    def __init__(self, lm_list): self._lm = lm_list
    def __getitem__(self, i):    return self._lm[i]

# ── Load Navarasa model ───────────────────────────────────────────────────────
navarasa_model_path = os.path.join(MODEL_DIR, "navarasa_model.pkl")
with open(navarasa_model_path, "rb") as f:
    navarasa_model = pickle.load(f)

print(f"[INFO] Mudra model loaded from {mudra_model_path}")
print(f"[INFO] Navarasa model loaded from {navarasa_model_path}")
print("[INFO] Navarasa classes:", list(navarasa_model.classes_))

# ── MediaPipe — Hands ─────────────────────────────────────────────────────────
mp_hands = mp.solutions.hands
mp_draw  = mp.solutions.drawing_utils
hands    = mp_hands.Hands(
    static_image_mode=False, # Real-time tracking mode
    max_num_hands=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# ── MediaPipe — FaceMesh (for Navarasa) ───────────────────────────────────────
_mp_face   = mp.solutions.face_mesh
_face_mesh = _mp_face.FaceMesh(
    static_image_mode=False,
    max_num_faces=1,
    refine_landmarks=False,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)

cap = cv2.VideoCapture(0)

# =============================================================================
# EMA + STABILITY PARAMETERS
# =============================================================================
EMA_ALPHA          = 0.55
LANDMARK_EMA_ALPHA = 0.60
MIN_STABLE_FRAMES  = 5
STABLE_THRESHOLD   = 0.52
FAST_BREAK_FRAMES  = 4

# ── Mudra EMA state ───────────────────────────────────────────────────────────
ema_probs     = None
ema_landmarks = None
stable_mudra  = ""
stable_count  = 0
raw_history   = deque(maxlen=FAST_BREAK_FRAMES)

# ── Navarasa EMA state ────────────────────────────────────────────────────────
ema_navarasa_probs    = None
navarasa_stable_count = 0
navarasa_stable_name  = ""
NAVARASA_STABLE_FRAMES = 4
NAVARASA_EMA_ALPHA    = 0.60

# ── Processing & Performance ──────────────────────────────────────────────────
frame_counter = 0
PROCESS_EVERY_N_FRAMES = 2

# ── Hold detection state ──────────────────────────────────────────────────────
HOLD_THRESHOLD  = 0.018
HOLD_FRAMES     = 8
COOLDOWN_FRAMES = 20

landmark_history  = deque(maxlen=2)
hold_frame_buffer    = deque(maxlen=HOLD_FRAMES)
cooldown_counter     = 0
hold_triggered       = False
last_auto_evaluation = {}

# ── Temporal Stability Buffer ───────────────────────────────────────────────
detection_history = deque(maxlen=3)
last_stable_name = ""

# ── Per-frame smoothing buffer for finger angles ──────────────────────────────
angle_buffer = deque(maxlen=5)

# ── Current state dicts ───────────────────────────────────────────────────────
current_mudra = {
    "name": "", "confidence": 0.0, "detected": False,
    "accuracy": 0.0, "corrections": [],
    "is_stable": False, "hold_state": "idle", "hold_progress": 0
}

current_navarasa = {
    "face_detected":          False,
    "rasa":                   "",
    "rasa_confidence":        0.0,
    "expected_rasa":          "",
    "expression_match":       False,
    "expression_correction":  "",
}

last_landmarks  = None
class_targets   = {}
session_reports = {}

# =============================================================================
# MUDRA → NAVARASA MAPPING
# =============================================================================
MUDRA_NAVARASA_MAP = {
    "pataka":       "shanta",
    "tripataka":    "vira",
    "ardhapataka":  "shanta",
    "kartarimukha": "raudra",
    "mayura":       "shringara",
    "ardhachandra": "shanta",
    "arala":        "adbhuta",
    "shukatunda":   "vira",
    "mushti":       "raudra",
    "shikhara":     "vira",
    "kapittha":     "shringara",
    "katakamukha":  "shringara",
    "suchi":        "adbhuta",
    "chandrakala":  "shringara",
    "padmakosha":   "shringara",
    "sarpashira":   "bhayanaka",
    "mrigashira":   "shanta",
    "simhamukha":   "raudra",
    "kangula":      "hasya",
    "alapadma":     "adbhuta",
    "chatura":      "hasya",
    "bhramara":     "shringara",
    "hamsasya":     "shanta",
    "hamsapaksha":  "shanta",
    "sandamsha":    "raudra",
    "mukula":       "shringara",
    "tamrachuda":   "vira",
    "trishula":     "vira",
    "palli":        "shanta",
    "vyaaghr":      "raudra",
}

NAVARASA_MEANINGS = {
    "hasya":     "Joy · Laughter",
    "karuna":    "Compassion · Sorrow",
    "raudra":    "Fury · Anger",
    "vira":      "Heroism · Courage",
    "bhayanaka": "Fear · Terror",
    "bibhatsa":  "Disgust",
    "adbhuta":   "Wonder · Surprise",
    "shanta":    "Peace · Serenity",
    "shringara": "Love · Beauty",
}

# =============================================================================
# MUDRA MEANINGS
# =============================================================================
MUDRA_MEANINGS = {
    "pataka":       "Flag — represents clouds, forest, river, blessing",
    "tripataka":    "Three parts of flag — represents crown, tree, lamp flame",
    "ardhapataka":  "Half flag — represents knife, two leaves, river banks",
    "kartarimukha": "Scissors face — represents separation, corner of eye",
    "mayura":       "Peacock — represents applying tilak, gentle touch",
    "ardhachandra": "Half moon — represents waist, spear, prayer",
    "arala":        "Bent — represents drinking poison, wind, blessing",
    "shukatunda":   "Parrot beak — represents arrow, direction",
    "mushti":       "Fist — represents holding, strength, wrestling",
    "shikhara":     "Spire — represents husband, pillar, Shiva",
    "kapittha":     "Wood apple — represents Lakshmi holding lotus",
    "katakamukha":  "Bracelet opening — represents picking flowers, garland",
    "suchi":        "Needle — represents number one, the universe",
    "chandrakala":  "Crescent moon — represents Shiva's moon, earring",
    "padmakosha":   "Lotus bud — represents apple, round ball, lotus",
    "sarpashira":   "Snake head — represents gentle touch, swimming",
    "mrigashira":   "Deer head — represents deer, lion, forest animals",
    "simhamukha":   "Lion face — represents lion, fearlessness, power",
    "kangula":      "Bell — represents bell, fruit, small rounded objects",
    "alapadma":     "Full bloomed lotus — represents beauty, full moon",
    "chatura":      "Clever — represents musk, clever person",
    "bhramara":     "Bee — represents bee, parrot, cuckoo",
    "hamsasya":     "Swan beak — represents swan, pearl, delicate things",
    "hamsapaksha":  "Swan wing — represents number six, swan wing",
    "sandamsha":    "Tongs — represents tongs, crab claw",
    "mukula":       "Flower bud — represents eating, offering",
    "tamrachuda":   "Rooster — represents cock, peacock, number two",
    "trishula":     "Trident — represents Shiva's trident, number three",
    "palli":        "Lizard — regional mudra",
    "vyaaghr":      "Tiger — regional mudra",
}

# =============================================================================
# MUDRA REFERENCE ANGLES
# Rebuilt from research paper polar plots (figure a, left panel).
# Each angle represents the blended PIP+DIP extension angle per finger
# as measured by MediaPipe (0° = fully curled, 180° = fully straight).
#
# Paper key observations per mudra:
#   pataakam      → all 4 fingers fully open, thumb slightly adducted
#   tripataakam   → index+middle+pinky open, ring FULLY bent, thumb adducted
#   ardhapataakam → index+middle open, ring+pinky HALF bent, thumb adducted
#   kartari mukha → index+middle open & spread (scissors), ring+pinky bent, thumb bent
#   mayura        → all open/spread, thumb touches ring tip
#   ardha chandra → all open wide fan, thumb extended sideways
#   araala        → index BENT, middle+ring+pinky open, thumb out
#   shuka tundam  → thumb presses ring (ring bent), others open
#   mushti        → ALL fingers fully curled (fist)
#   shikharam     → fist + thumb raised vertically
#   kapitham      → all fingers curled mid-range, thumb curled
#   katakaa mukha → thumb+index+middle meet (3-finger pinch), ring+pinky open
#   suchi         → index pointing straight, others curled
#   chandrakala   → index+thumb open (C-shape), middle+ring+pinky curled
#   padmakosha    → all fingers gently curved (cup / mango hold)
#   sarpasheersha → all fingers close together, gently curved (~140°)
#   mrugasheersha → index+middle open, ring+pinky+thumb bent inward
#   simhamukha    → index+pinky open, middle+ring bent, thumb bent
#   kangula       → ring FULLY bent, index+middle+pinky gently curved
#   alapadma      → all 5 fingers fully spread + gently curved
#   chatura       → index+middle+ring open, pinky slightly, thumb curled
#   bhramara      → index+thumb tips touch (loop), middle bent, ring+pinky open
#   hamsasya      → all fingertips pinch to one point
#   hamsapaksha   → fingers in gentle wave spread
#   samdamsha     → index+middle pinch tight, ring+pinky curled
#   mukula        → all 5 tips meet (bud)
#   tamarachooda  → fist + thumb up + pinky up
#   trishoola     → index+middle+ring open (3 fingers), thumb+pinky curled
# =============================================================================
MUDRA_REFERENCE_ANGLES = {
    # pataakam — all 4 fully open (175°), thumb slightly bent inward (~70°)
    "pataka":       {"thumb":  70, "index": 175, "middle": 175, "ring": 175, "pinky": 175},

    # tripataakam — index+middle+pinky open, ring FULLY bent (~40°), thumb bent inward
    "tripataka":    {"thumb":  70, "index": 175, "middle": 175, "ring":  40, "pinky": 175},

    # ardhapataakam — index+middle open, ring+pinky HALF bent (~90°), thumb inward
    "ardhapataka":  {"thumb":  75, "index": 175, "middle": 175, "ring":  90, "pinky":  90},

    # kartari mukha — index+middle open & spread, ring+pinky bent, thumb bent
    "kartarimukha": {"thumb":  80, "index": 175, "middle": 175, "ring":  50, "pinky":  50},

    # mayura — all open, thumb bends to touch ring (ring ~120°)
    "mayura":       {"thumb": 100, "index": 175, "middle": 175, "ring": 120, "pinky": 175},

    # ardha chandra — all fingers fully open fan, thumb extended wide (~170°)
    "ardhachandra": {"thumb": 170, "index": 175, "middle": 175, "ring": 175, "pinky": 175},

    # araala — index BENT sharply (~70°), others straight, thumb extended
    "arala":        {"thumb": 155, "index":  70, "middle": 175, "ring": 175, "pinky": 175},

    # shuka tundam — ring bent (~70°, thumb presses ring), others open
    "shukatunda":   {"thumb":  90, "index": 175, "middle": 175, "ring":  70, "pinky": 175},

    # mushti — ALL fully curled (~35°), tight fist
    "mushti":       {"thumb":  55, "index":  35, "middle":  35, "ring":  35, "pinky":  35},

    # shikharam — fist + thumb fully extended up (~175°)
    "shikhara":     {"thumb": 175, "index":  35, "middle":  35, "ring":  35, "pinky":  35},

    # kapitham — all curled mid (~60°), thumb mid
    "kapittha":     {"thumb":  80, "index":  60, "middle":  60, "ring":  60, "pinky":  60},

    # katakaa mukha — 3-finger pinch (thumb+index+middle ~100°), ring+pinky open
    "katakamukha":  {"thumb": 100, "index": 100, "middle": 100, "ring": 175, "pinky": 175},

    # suchi — index fully open (~175°), others curled (~50°), thumb mid
    "suchi":        {"thumb": 110, "index": 175, "middle":  50, "ring":  50, "pinky":  50},

    # chandrakala — index open (~175°), thumb open (~160°), middle+ring+pinky curled (~60°)
    "chandrakala":  {"thumb": 160, "index": 175, "middle":  60, "ring":  60, "pinky":  60},

    # padmakosha — all fingers gently curved, like holding a mango (~110°)
    "padmakosha":   {"thumb": 110, "index": 110, "middle": 110, "ring": 110, "pinky": 110},

    # sarpasheersha — all gently curved together (~140°), fingers close/touching
    "sarpashira":   {"thumb": 140, "index": 140, "middle": 140, "ring": 140, "pinky": 140},

    # mrugasheersha — index+middle open, ring+pinky+thumb curled inward (~55°)
    "mrigashira":   {"thumb":  55, "index": 175, "middle": 175, "ring":  55, "pinky":  55},

    # simhamukha — index+pinky open, middle+ring bent (~100°), thumb bent
    "simhamukha":   {"thumb":  90, "index": 175, "middle": 100, "ring": 100, "pinky": 175},

    # kangula — ring FULLY bent (~45°), index+middle+pinky gently curved (~130°)
    "kangula":      {"thumb": 120, "index": 130, "middle": 130, "ring":  45, "pinky": 130},

    # alapadma — all 5 fully spread and gently curved (~120°)
    "alapadma":     {"thumb": 120, "index": 120, "middle": 120, "ring": 120, "pinky": 120},

    # chatura — index+middle+ring open (~175°), pinky slightly bent (~130°), thumb curled (~60°)
    "chatura":      {"thumb":  60, "index": 175, "middle": 175, "ring": 175, "pinky": 130},

    # bhramara — index+thumb tips touch (both ~60°), middle bent (~70°), ring+pinky open
    "bhramara":     {"thumb":  60, "index":  60, "middle":  70, "ring": 175, "pinky": 175},

    # hamsasya — all 5 tips pinch to one point (all ~55°)
    "hamsasya":     {"thumb":  55, "index":  55, "middle":  55, "ring":  55, "pinky":  55},

    # hamsapaksha — gentle wave spread, fingers at slightly different angles
    "hamsapaksha":  {"thumb": 120, "index": 140, "middle": 130, "ring": 120, "pinky": 110},

    # samdamsha — index+middle tight pinch (~60°), ring+pinky curled (~50°)
    "sandamsha":    {"thumb":  75, "index":  60, "middle":  60, "ring":  50, "pinky":  50},

    # mukula — all 5 tips meet in a bud (all ~60°)
    "mukula":       {"thumb":  60, "index":  60, "middle":  60, "ring":  60, "pinky":  60},

    # tamarachooda — fist + thumb up + pinky up (~175°), index+middle+ring curled
    "tamrachuda":   {"thumb": 175, "index":  35, "middle":  35, "ring":  35, "pinky": 175},

    # trishoola — index+middle+ring open (~175°), thumb+pinky curled (~55°)
    "trishula":     {"thumb":  55, "index": 175, "middle": 175, "ring": 175, "pinky":  55},

    "palli":        {"thumb":  45, "index": 175, "middle": 175, "ring":  45, "pinky":  45},
    "vyaaghr":      {"thumb": 175, "index": 175, "middle":  55, "ring":  55, "pinky": 175},
}

# =============================================================================
# CORRECTION THRESHOLDS
# =============================================================================
CORRECTION_THRESHOLDS = {
    "thumb": 40,
    "index": 35,
    "middle": 35,
    "ring": 35,
    "pinky": 35,
}

# Mudras where non-thumb fingers must be fully straight
STRAIGHT_FINGER_MUDRAS = {
    "pataka", "tripataka", "ardhachandra", "trishula", "arala", "sarpashira"
}
STRAIGHT_FINGER_THRESHOLD = 12

# Fingers to skip correction for (they have dedicated geometry checks instead)
SKIP_CORRECTION_FINGERS = {
    "mushti":       {"index", "middle", "ring", "pinky"},
    "shikhara":     {"index", "middle", "ring", "pinky"},
    "kapittha":     {"middle", "ring", "pinky"},
    "tamrachuda":   {"index", "middle", "ring"},
    "suchi":        {"thumb"},
    "shukatunda":   {"thumb", "ring"},
    "trishula":     {"thumb", "pinky"},
    "chandrakala":  {"middle", "ring", "pinky"},
    "pataka":       set(),
    "ardhachandra": {"thumb"},
    "tripataka":    set(),
    "ardhapataka":  set(),
    "kartarimukha": {"ring", "pinky"},
    "katakamukha":  {"ring", "pinky"},
    "bhramara":     {"ring", "pinky"},
    "mrigashira":   {"index", "middle"},
    "simhamukha":   {"middle", "ring"},
    "hamsasya":     {"thumb", "index", "middle", "ring", "pinky"},
    "alapadma":     {"thumb", "index", "middle", "ring", "pinky"},
    "sandamsha":    {"ring", "pinky"},
    "kangula":      {"thumb"},
    "mukula":       {"thumb", "index", "middle", "ring", "pinky"},
    "padmakosha":   {"thumb", "index", "middle", "ring", "pinky"},
    "sarpashira":   {"thumb", "index", "middle", "ring", "pinky"},
}

# Shared geometry helpers are imported from utils.feature_engineering
def dist_lm(lm, i, j):
    """Proxy for shared get_distance using MediaPipe landmark objects."""
    p1 = [lm[i].x, lm[i].y, lm[i].z]
    p2 = [lm[j].x, lm[j].y, lm[j].z]
    return get_distance(p1, p2)

def get_finger_angles_dict(landmarks):
    """
    Computes a blended PIP+DIP extension angle for each finger.
    Used for the Correction Engine and Hybrid Override logic.
    """
    joints = {
        "thumb":  (1, 2, 3, 4),
        "index":  (5, 6, 7, 8),
        "middle": (9, 10, 11, 12),
        "ring":   (13, 14, 15, 16),
        "pinky":  (17, 18, 19, 20)
    }
    res = {}
    for n, (m, p, d, t) in joints.items():
        p_m = [landmarks[m].x, landmarks[m].y, landmarks[m].z]
        p_p = [landmarks[p].x, landmarks[p].y, landmarks[p].z]
        p_d = [landmarks[d].x, landmarks[d].y, landmarks[d].z]
        p_t = [landmarks[t].x, landmarks[t].y, landmarks[t].z]
        
        a1 = get_angle(p_m, p_p, p_d)
        a2 = get_angle(p_p, p_d, p_t)
        res[n] = (a1 * 0.6) + (a2 * 0.4)
    return res

# =============================================================================
# NAVARASA DETECTION
# =============================================================================
def detect_navarasa(rgb_frame, current_mudra_name=""):
    global ema_navarasa_probs, navarasa_stable_count, navarasa_stable_name

    empty = {
        "face_detected":          False,
        "rasa":                   "",
        "rasa_confidence":        0.0,
        "rasa_meaning":           "",
        "expected_rasa":          "",
        "expression_match":       False,
        "expression_correction":  "",
    }

    try:
        result = _face_mesh.process(rgb_frame)
        if not result.multi_face_landmarks:
            navarasa_stable_count = 0
            return empty

        lm = result.multi_face_landmarks[0].landmark
        nose_x, nose_y, nose_z = lm[1].x, lm[1].y, lm[1].z
        features = []
        for l in list(lm)[:468]:
            features += [l.x - nose_x, l.y - nose_y, l.z - nose_z]
        features = np.array([features])

        raw_probs = navarasa_model.predict_proba(features)[0]

        global ema_navarasa_probs
        if ema_navarasa_probs is None or len(ema_navarasa_probs) != len(raw_probs):
            ema_navarasa_probs = raw_probs.copy()
        else:
            ema_navarasa_probs = (NAVARASA_EMA_ALPHA * raw_probs +
                                  (1 - NAVARASA_EMA_ALPHA) * ema_navarasa_probs)

        top_idx        = int(np.argmax(ema_navarasa_probs))
        top_rasa       = str(navarasa_model.classes_[top_idx])
        top_confidence = float(ema_navarasa_probs[top_idx]) * 100

        if top_rasa == navarasa_stable_name:
            navarasa_stable_count = min(navarasa_stable_count + 1, NAVARASA_STABLE_FRAMES)
        else:
            navarasa_stable_count = 1
            navarasa_stable_name  = top_rasa

        is_stable = (navarasa_stable_count >= NAVARASA_STABLE_FRAMES)

        if not is_stable:
            return {
                "face_detected":          True,
                "rasa":                   "",
                "rasa_confidence":        round(top_confidence, 1),
                "rasa_meaning":           "",
                "expected_rasa":          "",
                "expression_match":       False,
                "expression_correction":  "",
            }

        expected   = MUDRA_NAVARASA_MAP.get(current_mudra_name.lower(), "")
        matches    = (top_rasa == expected) if expected else True
        correction = ""
        if expected and not matches:
            exp_name   = NAVARASA_MEANINGS.get(expected, expected)
            correction = f"Express {expected.capitalize()} — {exp_name}"

        return {
            "face_detected":          True,
            "rasa":                   top_rasa,
            "rasa_confidence":        round(top_confidence, 1),
            "rasa_meaning":           NAVARASA_MEANINGS.get(top_rasa, ""),
            "expected_rasa":          expected,
            "expression_match":       matches,
            "expression_correction":  correction,
        }

    except Exception as e:
        print(f"[detect_navarasa] Error: {e}")
        return empty

# =============================================================================
# EMA LANDMARK SMOOTHING
# =============================================================================
def ema_smooth_landmarks(lm_list):
    global ema_landmarks
    arr = np.array([[lm.x, lm.y, lm.z] for lm in lm_list])
    if ema_landmarks is None:
        ema_landmarks = arr.copy()
    else:
        ema_landmarks = LANDMARK_EMA_ALPHA * arr + (1 - LANDMARK_EMA_ALPHA) * ema_landmarks
    return ema_landmarks

# Duplicate get_features and get_finger_angles removed in favor of utils/feature_engineering.py

# =============================================================================
# EMA PROBABILITY SMOOTHING (MUDRA)
# =============================================================================
def update_ema_probs(raw_probs):
    global ema_probs
    if ema_probs is None or len(ema_probs) != len(raw_probs):
        ema_probs = raw_probs.copy()
    else:
        ema_probs = EMA_ALPHA * raw_probs + (1 - EMA_ALPHA) * ema_probs
    return ema_probs

# =============================================================================
# STABILITY GATE (MUDRA)
# =============================================================================
def update_stability(current_name, ema_prob_vector):
    global stable_mudra, stable_count

    classes     = model.classes_
    top_idx     = list(classes).index(current_name) if current_name in list(classes) else 0
    smooth_conf = float(ema_prob_vector[top_idx]) * 100 if top_idx < len(ema_prob_vector) else 0.0

    raw_history.append(current_name)
    if len(raw_history) == FAST_BREAK_FRAMES and len(set(raw_history)) == 1:
        if current_name != stable_mudra:
            stable_mudra = current_name
            stable_count = MIN_STABLE_FRAMES
        return stable_mudra, True, smooth_conf

    top_prob = ema_prob_vector[top_idx] if top_idx < len(ema_prob_vector) else 0.0
    if top_prob >= STABLE_THRESHOLD:
        if current_name == stable_mudra:
            stable_count = min(stable_count + 1, MIN_STABLE_FRAMES)
        else:
            stable_count = 1
            stable_mudra = current_name
    else:
        stable_count = max(stable_count - 1, 0)

    is_stable = (stable_count >= MIN_STABLE_FRAMES)
    return stable_mudra, is_stable, smooth_conf

# =============================================================================
# CORRECTIVE FEEDBACK ENGINE (MADM)
# All corrections derived directly from research paper polar plots
# =============================================================================
def get_corrections(detected_mudra, current_angles, landmarks_ref=None):
    mudra_key = str(detected_mudra).lower().strip()
    reference = MUDRA_REFERENCE_ANGLES.get(mudra_key)
    if not reference:
        return [], 100

    lm           = landmarks_ref
    skip_fingers = SKIP_CORRECTION_FINGERS.get(mudra_key, set())
    deviations   = []
    total_error  = 0

    # ── Base angle deviation loop ─────────────────────────────────────────────
    for finger, ref_angle in reference.items():
        actual_angle = current_angles.get(finger, ref_angle)
        abs_dev      = abs(ref_angle - actual_angle)

        if abs_dev < 25:
            continue

        total_error += abs_dev

        if finger in skip_fingers:
            continue

        target_straight = ref_angle >= 140

        # Extra penalties for mudras that need fingers truly straight
        if mudra_key in STRAIGHT_FINGER_MUDRAS and target_straight and finger != "thumb":
            if actual_angle < 120:
                total_error += 60
                deviations.append((60, f"Straighten your {finger} finger for {mudra_key}"))
            elif actual_angle < 150:
                total_error += 30
                deviations.append((30, f"Straighten your {finger} finger more"))

        threshold = STRAIGHT_FINGER_THRESHOLD if (mudra_key in STRAIGHT_FINGER_MUDRAS and
                    target_straight and finger != "thumb") else CORRECTION_THRESHOLDS.get(finger, 20)

        if abs_dev > threshold:
            finger_label = "little" if finger == "pinky" else finger
            more_open    = actual_angle > ref_angle

            if target_straight:
                msg = (f"Straighten your {finger_label} finger"
                       if not more_open else f"Relax your {finger_label} finger slightly")
            else:
                if finger == "thumb":
                    msg = ("Bend your thumb inward" if more_open else "Relax your thumb slightly")
                else:
                    msg = (f"Curl your {finger_label} finger more"
                           if more_open else f"Uncurl your {finger_label} finger slightly")
            deviations.append((abs_dev, msg))

    # ── Geometry-based checks per mudra ──────────────────────────────────────
    if lm is not None:

        # ── PATAKA ────────────────────────────────────────────────────────────
        # All 4 fingers fully straight. Ring MUST be straight (key differentiator).
        if mudra_key == "pataka":
            ring_a = current_angles.get("ring", 175)
            if ring_a < 130:
                total_error += 200  # disqualifying — ring bent = tripataka not pataka
                deviations.append((200, "Straighten your ring finger — Pataka needs ALL 4 fingers straight"))
            elif ring_a < 155:
                total_error += 80
                deviations.append((80, "Straighten your ring finger more for Pataka"))
            for f in ["index", "middle", "pinky"]:
                if current_angles.get(f, 175) < 145:
                    total_error += 50
                    deviations.append((50, f"Straighten your {f} finger for Pataka"))
            if current_angles.get("thumb", 70) > 120:
                total_error += 60
                deviations.append((60, "Bend your thumb inward toward your palm"))
            if dist_lm(lm, 4, 5) > 0.16:
                total_error += 40
                deviations.append((40, "Tuck your thumb closer to your index finger base"))

        # ── TRIPATAKA ─────────────────────────────────────────────────────────
        # Ring FULLY bent. Index+middle+pinky straight. Thumb bent inward.
        elif mudra_key == "tripataka":
            ring_a = current_angles.get("ring", 40)
            if ring_a > 130:
                total_error += 200  # disqualifying — ring straight = pataka not tripataka
                deviations.append((200, "Bend your ring finger fully — only ring bends in Tripataka"))
            elif ring_a > 90:
                total_error += 80
                deviations.append((80, "Bend your ring finger more for Tripataka"))
            elif ring_a > 60:
                total_error += 35
                deviations.append((35, "Curl your ring finger down a little more"))
            if dist_lm(lm, 16, 0) > 0.22:
                total_error += 55
                deviations.append((55, "Bend your ring finger all the way to your palm"))
            for f in ["index", "middle", "pinky"]:
                if current_angles.get(f, 175) < 145:
                    total_error += 45
                    deviations.append((45, f"Straighten your {f} finger for Tripataka"))
            if current_angles.get("thumb", 70) > 120:
                total_error += 55
                deviations.append((55, "Bend your thumb inward toward your palm"))
            if dist_lm(lm, 4, 5) > 0.15:
                total_error += 35
                deviations.append((35, "Keep your thumb tucked inward"))

        # ── ARDHAPATAKA ───────────────────────────────────────────────────────
        # Index+middle straight. Ring+pinky HALF bent (~90°). Thumb inward.
        elif mudra_key == "ardhapataka":
            for f in ["index", "middle"]:
                if current_angles.get(f, 175) < 145:
                    total_error += 55
                    deviations.append((55, f"Straighten your {f} finger for Ardhapataka"))
            for f in ["ring", "pinky"]:
                a = current_angles.get(f, 90)
                if a > 145:
                    total_error += 55
                    deviations.append((55, f"Bend your {f} finger halfway inward for Ardhapataka"))
                elif a < 50:
                    total_error += 55
                    deviations.append((55, f"Uncurl your {f} finger — only half bent for Ardhapataka"))
            if current_angles.get("thumb", 75) > 115:
                total_error += 50
                deviations.append((50, "Bend your thumb inward toward your palm"))

        # ── KANGULA ───────────────────────────────────────────────────────────
        # Ring FULLY bent (~45°). Index+middle+pinky gently curved (~130°).
        elif mudra_key == "kangula":
            ring_a = current_angles.get("ring", 45)
            if ring_a > 85:
                total_error += 75
                deviations.append((75, "Bend your ring finger fully inward toward your palm"))
            if dist_lm(lm, 16, 0) > 0.20:
                total_error += 40
                deviations.append((40, "Curl your ring finger more toward your palm"))
            for f in ["index", "middle", "pinky"]:
                a = current_angles.get(f, 130)
                if a > 162:
                    total_error += 30
                    deviations.append((30, f"Curve your {f} finger slightly inward"))
                elif a < 85:
                    total_error += 40
                    deviations.append((40, f"Uncurl your {f} finger — only slightly curved for Kangula"))

        # ── SARPASHIRA ────────────────────────────────────────────────────────
        # All fingers gently curved together (~140°), touching, uniform
        elif mudra_key == "sarpashira":
            finger_list = ["index", "middle", "ring", "pinky"]
            vals        = [current_angles.get(f, 140) for f in finger_list]
            avg_a       = sum(vals) / 4
            min_a       = min(vals)
            max_a       = max(vals)

            if avg_a > 162:
                total_error += 70
                deviations.append((70, "Curve all fingers gently — not fully straight for Sarpashira"))
            elif avg_a < 115:
                total_error += 65
                deviations.append((65, "Open your fingers slightly — not too curled for Sarpashira"))

            if (max_a - min_a) > 25:
                total_error += 50
                deviations.append((50, "Keep all fingers evenly curved — no one finger out of line"))

            if dist_lm(lm, 8, 12) > 0.035 or dist_lm(lm, 12, 16) > 0.035:
                total_error += 60
                deviations.append((60, "Press all fingers tightly together — no gaps for Sarpashira"))

            tip_y = [lm[i].y for i in [8, 12, 16, 20]]
            if max(tip_y) - min(tip_y) > 0.06:
                total_error += 40
                deviations.append((40, "Align all fingertips at the same level"))

        # ── CHANDRAKALA ───────────────────────────────────────────────────────
        # Index+thumb open (C / crescent shape). Middle+ring+pinky curled.
        elif mudra_key == "chandrakala":
            for f in ["middle", "ring", "pinky"]:
                if current_angles.get(f, 60) > 110:
                    total_error += 45
                    deviations.append((45, f"Close your {f} finger for Chandrakala"))
            if current_angles.get("index", 175) < 140:
                total_error += 65
                deviations.append((65, "Straighten your index finger for Chandrakala"))
            if current_angles.get("thumb", 160) < 120:
                total_error += 55
                deviations.append((55, "Extend your thumb outward for Chandrakala"))
            if dist_lm(lm, 4, 8) < 0.14:
                total_error += 45
                deviations.append((45, "Spread thumb and index apart — make a C / crescent shape"))

        # ── PADMAKOSHA ────────────────────────────────────────────────────────
        # All fingers gently curved like holding a mango (~110°)
        elif mudra_key == "padmakosha":
            avg_f = sum(current_angles.get(f, 110) for f in
                        ["thumb", "index", "middle", "ring", "pinky"]) / 5
            if avg_f > 152:
                total_error += 65
                deviations.append((65, "Curve ALL fingers inward — imagine holding a large mango"))
            elif avg_f > 135:
                total_error += 35
                deviations.append((35, "Curve your fingers more to deepen the cup shape"))
            elif avg_f < 75:
                total_error += 60
                deviations.append((60, "Open your fingers more — not a fist, a gentle cup"))
            ip_d = dist_lm(lm, 8, 20)
            if ip_d > 0.22:
                total_error += 35
                deviations.append((35, "Bring your fingertips slightly closer together"))
            elif ip_d < 0.05:
                total_error += 30
                deviations.append((30, "Spread your fingers slightly apart — not too tight"))

        # ── ALAPADMA ──────────────────────────────────────────────────────────
        # All 5 fingers fully spread and gently curved (~120°)
        elif mudra_key == "alapadma":
            tips   = [4, 8, 12, 16, 20]
            avg_sp = sum(dist_lm(lm, tips[i], tips[i-1]) for i in range(1, 5)) / 4
            if avg_sp < 0.08:
                total_error += 50
                deviations.append((50, "Spread all five fingers wide apart"))
            if dist_lm(lm, 8, 20) < 0.18:
                total_error += 55
                deviations.append((55, "Spread all five fingers wide apart like a blooming lotus"))
            avg_f = sum(current_angles.get(f, 120) for f in
                        ["index", "middle", "ring", "pinky"]) / 4
            if avg_f > 158:
                total_error += 30
                deviations.append((30, "Curve all fingers slightly — not fully straight for Alapadma"))
            elif avg_f < 90:
                total_error += 50
                deviations.append((50, "Open your fingers more — too curled for Alapadma"))

        # ── MUSHTI ────────────────────────────────────────────────────────────
        # ALL fingers fully curled into tight fist
        elif mudra_key == "mushti":
            fist_count = 0
            for t in [8, 12, 16, 20]:
                d = dist_lm(lm, t, 0)
                if d > 0.24:
                    total_error += 50
                    deviations.append((50, f"Curl your {['index','middle','ring','little'][[8,12,16,20].index(t)]} finger tightly into the fist"))
                else:
                    fist_count += 1
            if fist_count == 4:
                total_error = total_error * 0.15  # strong reward for full fist
            elif fist_count <= 2:
                total_error += 200
            if dist_lm(lm, 4, 11) > 0.18:
                total_error += 30
                deviations.append((30, "Tuck your thumb over your curled fingers"))

        # ── SHIKHARA ──────────────────────────────────────────────────────────
        # Fist + thumb fully extended upward
        elif mudra_key == "shikhara":
            fist_count = 0
            for t in [8, 12, 16, 20]:
                if dist_lm(lm, t, 0) > 0.24:
                    total_error += 45
                    deviations.append((45, f"Curl your {['index','middle','ring','little'][[8,12,16,20].index(t)]} finger into fist"))
                else:
                    fist_count += 1
            if fist_count == 4:
                total_error = total_error * 0.2
            if current_angles.get("thumb", 175) < 140:
                total_error += 65
                deviations.append((65, "Raise your thumb straight up for Shikhara"))

        # ── HAMSASYA ──────────────────────────────────────────────────────────
        # All 5 tips meet at one point (all-finger pinch)
        elif mudra_key == "hamsasya":
            max_dist = max(dist_lm(lm, 4, t) for t in [8, 12, 16, 20])
            if max_dist > 0.10:
                total_error += 80
                deviations.append((80, "Bring ALL five fingertips together to one point for Hamsasya"))
            elif max_dist > 0.06:
                total_error += 40
                deviations.append((40, "Tighten the pinch — all tips closer together"))

        # ── MUKULA ────────────────────────────────────────────────────────────
        # All 5 tips meet (bud shape) — similar to hamsasya but slightly more open
        elif mudra_key == "mukula":
            max_dist = max(dist_lm(lm, 4, t) for t in [8, 12, 16, 20])
            if max_dist > 0.12:
                total_error += 75
                deviations.append((75, "Touch all five fingertips together (flower bud shape)"))
            elif max_dist > 0.08:
                total_error += 35
                deviations.append((35, "Bring your fingertips a little closer together"))

        # ── BHRAMARA ──────────────────────────────────────────────────────────
        # Index+thumb tips touch (loop). Middle bent. Ring+pinky open.
        elif mudra_key == "bhramara":
            if dist_lm(lm, 4, 8) > 0.05:
                total_error += 65
                deviations.append((65, "Touch your thumb tip and index fingertip together to form a loop"))
            if current_angles.get("middle", 70) > 110:
                total_error += 45
                deviations.append((45, "Bend your middle finger inward for Bhramara"))
            for f in ["ring", "pinky"]:
                if current_angles.get(f, 175) < 130:
                    total_error += 30
                    deviations.append((30, f"Straighten your {f} finger for Bhramara"))

        # ── KATAKAMUKHA ───────────────────────────────────────────────────────
        # Thumb+index+middle form 3-finger pinch. Ring+pinky open.
        elif mudra_key == "katakamukha":
            d_ti = dist_lm(lm, 4, 8)
            d_tm = dist_lm(lm, 4, 12)
            if d_ti > 0.09 or d_tm > 0.09:
                total_error += 55
                deviations.append((55, "Bring thumb, index, and middle fingertips together"))
            for f in ["ring", "pinky"]:
                if current_angles.get(f, 175) < 130:
                    total_error += 40
                    deviations.append((40, f"Straighten your {f} finger for Katakamukha"))

        # ── KARTARIMUKHA ──────────────────────────────────────────────────────
        # Index+middle open and SPREAD apart (scissors). Ring+pinky bent.
        elif mudra_key == "kartarimukha":
            if dist_lm(lm, 8, 12) < 0.07:
                total_error += 55
                deviations.append((55, "Spread your index and middle fingers apart like scissors"))
            for f in ["index", "middle"]:
                if current_angles.get(f, 175) < 145:
                    total_error += 45
                    deviations.append((45, f"Straighten your {f} finger for Kartarimukha"))

        # ── MAYURA ────────────────────────────────────────────────────────────
        # All open. Thumb bends to touch ring fingertip.
        elif mudra_key == "mayura":
            if dist_lm(lm, 4, 16) > 0.13:
                total_error += 55
                deviations.append((55, "Bring your thumb tip to touch your ring fingertip"))
            for f in ["index", "middle", "pinky"]:
                if current_angles.get(f, 175) < 140:
                    total_error += 35
                    deviations.append((35, f"Keep your {f} finger straight for Mayura"))

        # ── SHUKATUNDA ────────────────────────────────────────────────────────
        # Ring bent. Thumb presses ring. Others open.
        elif mudra_key == "shukatunda":
            if dist_lm(lm, 4, 13) > 0.15:
                total_error += 55
                deviations.append((55, "Press your thumb against your ring finger base"))
            if current_angles.get("ring", 70) > 110:
                total_error += 60
                deviations.append((60, "Bend your ring finger more for Shukatunda"))
            for f in ["index", "middle", "pinky"]:
                if current_angles.get(f, 175) < 140:
                    total_error += 35
                    deviations.append((35, f"Straighten your {f} finger for Shukatunda"))

        # ── KAPITTHA ──────────────────────────────────────────────────────────
        # All fingers curled mid-range (~60°). Thumb curled.
        elif mudra_key == "kapittha":
            if dist_lm(lm, 4, 8) > 0.12:
                total_error += 35
                deviations.append((35, "Bring your thumb close to your index finger"))
            avg_curl = sum(current_angles.get(f, 60) for f in
                           ["index", "middle", "ring", "pinky"]) / 4
            if avg_curl > 110:
                total_error += 55
                deviations.append((55, "Curl all fingers inward more for Kapittha"))
            elif avg_curl < 40:
                total_error += 40
                deviations.append((40, "Open your fingers slightly — not a tight fist for Kapittha"))

        # ── SUCHI ─────────────────────────────────────────────────────────────
        # Index pointing straight up. All others curled.
        elif mudra_key == "suchi":
            if current_angles.get("index", 175) < 150:
                total_error += 70
                deviations.append((70, "Point your index finger straight up for Suchi"))
            if dist_lm(lm, 8, 0) < 0.22:
                total_error += 50
                deviations.append((50, "Raise your index finger higher — it should point straight up"))
            for f in ["middle", "ring", "pinky"]:
                if current_angles.get(f, 50) > 100:
                    total_error += 40
                    deviations.append((40, f"Curl your {f} finger inward for Suchi"))

        # ── MRIGASHIRA ────────────────────────────────────────────────────────
        # Index+middle open. Ring+pinky+thumb bent inward.
        elif mudra_key == "mrigashira":
            for f in ["index", "middle"]:
                if current_angles.get(f, 175) < 140:
                    total_error += 45
                    deviations.append((45, f"Straighten your {f} finger for Mrigashira"))
            for f in ["ring", "pinky"]:
                if current_angles.get(f, 55) > 100:
                    total_error += 40
                    deviations.append((40, f"Curl your {f} finger inward for Mrigashira"))
            if dist_lm(lm, 4, 0) > 0.28:
                total_error += 30
                deviations.append((30, "Tuck your thumb inward toward your palm"))

        # ── SIMHAMUKHA ────────────────────────────────────────────────────────
        # Index+pinky open. Middle+ring bent. Thumb bent.
        elif mudra_key == "simhamukha":
            for f in ["index", "pinky"]:
                if current_angles.get(f, 175) < 140:
                    total_error += 50
                    deviations.append((50, f"Straighten your {f} finger for Simhamukha"))
            for f in ["middle", "ring"]:
                if current_angles.get(f, 100) > 140:
                    total_error += 45
                    deviations.append((45, f"Bend your {f} finger inward for Simhamukha"))

        # ── ARALA ─────────────────────────────────────────────────────────────
        # Index BENT sharply. Middle+ring+pinky open. Thumb extended.
        elif mudra_key == "arala":
            if current_angles.get("index", 70) > 120:
                total_error += 75
                deviations.append((75, "Bend your index finger sharply inward for Arala"))
            for f in ["middle", "ring", "pinky"]:
                if current_angles.get(f, 175) < 140:
                    total_error += 45
                    deviations.append((45, f"Straighten your {f} finger — only index bends in Arala"))

        # ── ARDHACHANDRA ──────────────────────────────────────────────────────
        # All fingers fully open fan. Thumb extended sideways.
        elif mudra_key == "ardhachandra":
            if abs(lm[4].x - lm[0].x) < 0.10:
                total_error += 40
                deviations.append((40, "Extend your thumb fully sideways away from your palm"))
            if dist_lm(lm, 8, 20) < 0.12:
                total_error += 30
                deviations.append((30, "Spread all fingers open wide for Ardhachandra"))
            for f in ["index", "middle", "ring", "pinky"]:
                if current_angles.get(f, 175) < 145:
                    total_error += 35
                    deviations.append((35, f"Straighten your {f} finger for Ardhachandra"))

        # ── TAMRACHUDA ────────────────────────────────────────────────────────
        # Fist + thumb UP + pinky UP. Index+middle+ring curled.
        elif mudra_key == "tamrachuda":
            if current_angles.get("thumb", 175) < 145:
                total_error += 65
                deviations.append((65, "Raise your thumb straight up for Tamrachuda"))
            if current_angles.get("pinky", 175) < 145:
                total_error += 65
                deviations.append((65, "Raise your little finger straight up for Tamrachuda"))
            for f in ["index", "middle", "ring"]:
                if current_angles.get(f, 35) > 100:
                    total_error += 40
                    deviations.append((40, f"Curl your {f} finger into the fist for Tamrachuda"))

        # ── TRISHULA ──────────────────────────────────────────────────────────
        # Index+middle+ring open (~175°). Thumb+pinky curled (~55°).
        elif mudra_key == "trishula":
            for f in ["index", "middle", "ring"]:
                if current_angles.get(f, 175) < 145:
                    total_error += 55
                    deviations.append((55, f"Straighten your {f} finger for Trishula (3 fingers up)"))
            for f in ["thumb", "pinky"]:
                if current_angles.get(f, 55) > 110:
                    total_error += 45
                    deviations.append((45, f"Curl your {f} inward — only 3 middle fingers up for Trishula"))

        # ── HAMSAPAKSHA ───────────────────────────────────────────────────────
        # Gentle wave: fingers at graduated angles
        elif mudra_key == "hamsapaksha":
            vals = [current_angles.get(f, 0) for f in ["index", "middle", "ring", "pinky"]]
            if max(vals) - min(vals) < 10:
                total_error += 40
                deviations.append((40, "Spread fingers in a gentle wave — each at a slightly different angle"))

        # ── SANDAMSHA ─────────────────────────────────────────────────────────
        # Index+middle tight pinch. Ring+pinky curled.
        elif mudra_key == "sandamsha":
            if dist_lm(lm, 8, 12) > 0.06:
                total_error += 60
                deviations.append((60, "Pinch index and middle fingertips tightly together for Sandamsha"))
            for f in ["ring", "pinky"]:
                if current_angles.get(f, 50) > 100:
                    total_error += 35
                    deviations.append((35, f"Curl your {f} finger inward for Sandamsha"))

        # ── CHATURA ───────────────────────────────────────────────────────────
        # Index+middle+ring open. Pinky slightly bent. Thumb curled.
        elif mudra_key == "chatura":
            for f in ["index", "middle", "ring"]:
                if current_angles.get(f, 175) < 145:
                    total_error += 45
                    deviations.append((45, f"Straighten your {f} finger for Chatura"))
            if current_angles.get("thumb", 60) > 110:
                total_error += 40
                deviations.append((40, "Curl your thumb inward for Chatura"))

    # ── Deduplicate + sort ────────────────────────────────────────────────────
    deviations.sort(key=lambda x: x[0], reverse=True)
    seen              = set()
    unique_deviations = []
    for score, msg in deviations:
        if msg not in seen:
            seen.add(msg)
            unique_deviations.append((score, msg))

    accuracy = max(0.0, 100.0 - (total_error / 10.0))
    return [d[1] for d in unique_deviations], float("{:.1f}".format(accuracy))

# =============================================================================
# LANDMARK SERIALIZER
# =============================================================================
def lm_to_json(lm_list):
    if lm_list is None:
        return []
    return [{"x": lm.x, "y": lm.y, "z": lm.z} for lm in lm_list]

# =============================================================================
# HOLD DETECTION
# =============================================================================
def compute_landmark_velocity(prev_lm, curr_lm):
    total = sum(
        abs(curr_lm[i].x - prev_lm[i].x) +
        abs(curr_lm[i].y - prev_lm[i].y)
        for i in range(21)
    )
    return total / 21

def is_hand_held(landmarks):
    global cooldown_counter, hold_triggered
    if cooldown_counter > 0:
        cooldown_counter -= 1
        hold_frame_buffer.clear()
        return False, 0
    if len(landmark_history) < 2:
        landmark_history.append(landmarks)
        return False, 0
    velocity      = compute_landmark_velocity(landmark_history[-1], landmarks)
    landmark_history.append(landmarks)
    is_still      = velocity < HOLD_THRESHOLD
    hold_frame_buffer.append(is_still)
    still_count   = sum(hold_frame_buffer)
    hold_progress = int((still_count / HOLD_FRAMES) * 100)
    if still_count >= HOLD_FRAMES and not hold_triggered:
        hold_triggered   = True
        cooldown_counter = COOLDOWN_FRAMES
        hold_frame_buffer.clear()
        return True, 100
    if not is_still:
        hold_triggered = False
    return False, hold_progress

# =============================================================================
# CORE MADM PIPELINE
# =============================================================================
def run_madm(mp_landmarks, target_mudra=""):
    global last_landmarks, last_stable_name

    try:
        # 1. Adapt input (MediaPipe object OR JSON list)
        if hasattr(mp_landmarks, 'landmark'):
            lm_list = mp_landmarks.landmark
            last_landmarks = mp_landmarks
        else:
            # mp_landmarks is the JSON list from frontend
            lm_list = [LM(p['x'], p['y'], p['z']) for p in mp_landmarks]
            # Mock a MediaPipe-like container for internal tracking if needed
            last_landmarks = type('obj', (object,), {'landmark': lm_list})

        # 2. Wrist Center Normalization (Accuracy Fix)
        # Centering ensures position-independence for the AI model
        wrist = lm_list[0]
        normalized_lm = [LM(p.x - wrist.x, p.y - wrist.y, p.z - wrist.z) for p in lm_list]
        
        # 3. EMA Landmark Smoothing
        smoothed_arr = ema_smooth_landmarks(normalized_lm)
        smooth_lm    = [LM(smoothed_arr[i, 0], smoothed_arr[i, 1], smoothed_arr[i, 2])
                        for i in range(21)]

        features = extract_features(smooth_lm)
        if len(features) != 72:
            print(f"[ERROR] Feature size mismatch: Expected 72, got {len(features)}")
            return {"detected": False, "feedback": "Feature error"}

        raw_probs   = model.predict_proba([features])[0]
        raw_conf    = float(max(raw_probs)) * 100
        ema_p       = update_ema_probs(raw_probs)
        top_idx     = int(np.argmax(ema_p))
        top_name    = str(model.classes_[top_idx])
        
        stable_name, is_stable, smooth_conf = update_stability(top_name, ema_p)
        print(f"[INFO] Mudra: {stable_name}, Conf: {smooth_conf:.2f}")

        raw_angles = get_finger_angles_dict(smooth_lm)
        angle_buffer.append(raw_angles)
        finger_angles = {f: sum(a[f] for a in angle_buffer)/len(angle_buffer) for f in raw_angles}

        lm_wrapper = LMWrapper(smooth_lm)

        if not target_mudra:
            # ── HYBRID OVERRIDES (Only if ML confidence is low) ──────────────────
            if smooth_conf < 60:
                best_geom_acc  = 0
                best_geom_name = ""
                geom_scores    = {}
                for m_name in MUDRA_REFERENCE_ANGLES.keys():
                    _, acc = get_corrections(m_name, finger_angles, lm_wrapper)
                    geom_scores[m_name] = acc
                    if acc > best_geom_acc:
                        best_geom_acc  = acc
                        best_geom_name = m_name

                print(f"DEBUG: ML={stable_name}({smooth_conf:.1f}%) | GeomBest={best_geom_name}({best_geom_acc:.1f}%)")
                if best_geom_acc > 70:
                    top_geom = sorted(geom_scores.items(), key=lambda x: x[1], reverse=True)[:3]
                    print(f"      Top Geom: {top_geom}")

                ring_angle = finger_angles.get("ring", 175)

                # ── PATAKA ↔ TRIPATAKA ring-finger override ───────────────────────
                if stable_name == "pataka" and ring_angle < 100:
                    tri_score = geom_scores.get("tripataka",   0)
                    ard_score = geom_scores.get("ardhapataka", 0)
                    kng_score = geom_scores.get("kangula",     0)
                    best_alt_name, best_alt = max(
                        [("tripataka", tri_score), ("ardhapataka", ard_score), ("kangula", kng_score)],
                        key=lambda x: x[1]
                    )
                    if best_alt > 45:
                        print(f"      ---> RING BENT OVERRIDE: pataka → {best_alt_name} (ring={ring_angle:.0f}°)")
                        stable_name = best_alt_name
                        smooth_conf = max(smooth_conf, best_alt * 0.85)
                        is_stable   = True

                elif stable_name == "tripataka" and ring_angle > 145:
                    pat_score = geom_scores.get("pataka", 0)
                    if pat_score > 45:
                        print(f"      ---> RING STRAIGHT OVERRIDE: tripataka → pataka (ring={ring_angle:.0f}°)")
                        stable_name = "pataka"
                        smooth_conf = max(smooth_conf, pat_score * 0.85)
                        is_stable   = True

                # ── CHANDRAKALA / SUCHI signature override ────────────────────────
                is_curled_3 = (finger_angles.get("middle", 180) < 110 and
                               finger_angles.get("ring",   180) < 110 and
                               finger_angles.get("pinky",  180) < 110)
                index_dist  = dist_lm(lm_wrapper, 8, 0)
                thumb_dist  = dist_lm(lm_wrapper, 4, 0)
                signature_force = False

                if is_curled_3 and index_dist > 0.22:
                    if thumb_dist > 0.22:
                        print(f"      ---> SIGNATURE FORCE: {stable_name} → chandrakala")
                        stable_name     = "chandrakala"
                        smooth_conf     = max(smooth_conf, 92.0)
                        is_stable       = True
                        signature_force = True
                    else:
                        print(f"      ---> SIGNATURE FORCE: {stable_name} → suchi")
                        stable_name     = "suchi"
                        smooth_conf     = max(smooth_conf, 92.0)
                        is_stable       = True
                        signature_force = True

                # ── General hybrid override ───────────────────────────────────────
                if not signature_force:
                    is_fist_mudra = best_geom_name in ["mushti", "shikhara"]
                    ml_is_open    = stable_name in ["pataka", "hamsapaksha", "sarpashira",
                                                    "ardhapataka", "chandrakala"]

                    if (best_geom_acc > 78 and smooth_conf < 40) or \
                       (best_geom_acc > 87 and best_geom_name != stable_name) or \
                       (is_fist_mudra and ml_is_open and best_geom_acc > 80):
                        print(f"      ---> HYBRID OVERRIDE: {stable_name} → {best_geom_name}")
                        stable_name = best_geom_name
                        smooth_conf = max(smooth_conf, best_geom_acc * 0.88)
                        is_stable   = True
            else:
                # ML is confident, minimize console noise
                pass

        if raw_conf < 20 and smooth_conf < 25:
            return {
                "detected": False, "feedback": "Show your hand more clearly",
                "name": stable_name, "confidence": round(smooth_conf, 1),
                "accuracy": 0, "corrections": [], "meaning": "",
                "is_stable": False, "landmarks": lm_to_json(lm_list),
            }

        eval_mudra = target_mudra.lower().strip() if target_mudra else stable_name
        corrections, art_accuracy = get_corrections(eval_mudra, finger_angles, lm_wrapper)

        wrong_mudra = (
            target_mudra and
            top_name.lower().strip() != eval_mudra and
            raw_conf >= 20
        )
        if wrong_mudra:
            corrections.insert(0, f"Wrong mudra — you are showing {top_name}, target is {eval_mudra}")

        stability_factor = 1.0 if is_stable else 0.80
        # Re-balanced weights: 70% ML, 30% Geometry
        total_accuracy   = ((smooth_conf * 0.7) + (art_accuracy * 0.3)) * stability_factor

        if wrong_mudra:
            # Soften wrong mudra penalty
            total_accuracy = total_accuracy * 0.6
        elif target_mudra and stable_name == target_mudra:
            # Boost for matching the target mudra
            total_accuracy += 10

        total_accuracy = min(100.0, round(total_accuracy, 1))

        is_good_frame = (smooth_conf >= 70 and total_accuracy >= 70)
        if is_good_frame:
            held, hold_progress = is_hand_held(lm_list)
        else:
            hold_frame_buffer.clear()
            held, hold_progress = False, 0

        feedback = (
            "Correct! Great form."                   if total_accuracy >= 75 else
            "Try Again — almost there!"              if total_accuracy >= 50 else
            "Try Again — adjust your hand position."
        )

        # ── FLICKER FILTER (Temporal Buffer) ─────────────────────────
        detection_history.append(stable_name)
        if len(detection_history) == 3 and len(set(detection_history)) == 1:
            last_stable_name = stable_name
        
        final_name = last_stable_name if last_stable_name else stable_name

        result = {
            "detected":      True,
            "name":          final_name,
            "confidence":    round(smooth_conf, 1),
            "accuracy":      total_accuracy,
            "corrections":   corrections,
            "feedback":      feedback,
            "meaning":       MUDRA_MEANINGS.get(stable_name, ""),
            "is_stable":     is_stable,
            "landmarks":     lm_to_json(lm_list),
            "hold_progress": hold_progress,
            "hold_state":    "evaluating" if held else ("holding" if hold_progress > 20 else "idle"),
        }

        current_mudra.update({
            "name":          stable_name,
            "confidence":    round(smooth_conf, 1),
            "detected":      True,
            "accuracy":      total_accuracy,
            "corrections":   corrections,
            "is_stable":     is_stable,
            "hold_state":    result["hold_state"],
            "hold_progress": hold_progress,
        })

        if held and is_stable:
            last_auto_evaluation.update(result)
            socketio.emit("auto_evaluation", result)

        return result

    except Exception as e:
        print(f"[run_madm] Error: {e}")
        import traceback; traceback.print_exc()
        current_mudra["detected"] = False
        return {
            "detected": False, "feedback": "Evaluation error",
            "name": "", "confidence": 0, "accuracy": 0,
            "corrections": [], "meaning": "", "is_stable": False,
            "landmarks": [],
        }

# =============================================================================
# VIDEO CAPTURE LOOP
# =============================================================================
def generate_frames():
    global ema_landmarks, ema_probs, frame_counter

    while True:
        success, frame = cap.read()
        if not success:
            break

        frame_counter += 1
        frame          = cv2.flip(frame, 1)
        rgb_frame      = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        if frame_counter % PROCESS_EVERY_N_FRAMES == 0:
            result = hands.process(rgb_frame)
            if result.multi_hand_landmarks:
                mp_draw.draw_landmarks(frame, result.multi_hand_landmarks[0],
                                       mp_hands.HAND_CONNECTIONS)
                target = class_targets.get("video_feed", "")
                run_madm(result.multi_hand_landmarks[0], target)
            else:
                ema_probs = None
                ema_landmarks = None
                current_mudra.update({
                    "detected": False, "name": "", "confidence": 0,
                    "accuracy": 0, "corrections": [], "is_stable": False,
                    "hold_state": "idle", "hold_progress": 0,
                })

        if frame_counter % 3 == 0:
            mudra_name      = current_mudra.get("name", "")
            navarasa_result = detect_navarasa(rgb_frame, mudra_name)
            current_navarasa.update(navarasa_result)

        _, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' +
               buf.tobytes() + b'\r\n')

# =============================================================================
# FLASK ROUTES
# =============================================================================

@app.route('/health')
def health():
    return jsonify({"status": "ok", "message": "GestureIQ Flask API running",
                    "modules": ["mudra", "navarasa"]})

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/mudra_data')
def mudra_data():
    target = request.args.get('target', '').lower().strip()
    if target:
        class_targets["video_feed"] = target
    data = dict(current_mudra)
    data["target"]      = target
    data["auto_result"] = last_auto_evaluation if current_mudra.get("hold_state") == "evaluating" else None
    data["landmarks"]   = lm_to_json(last_landmarks.landmark if last_landmarks else None)
    data.update(current_navarasa)
    return jsonify(data)

@app.route('/api/detect_frame', methods=['POST'])
def detect_frame():
    print(">>> /api/detect_frame CALLED", flush=True)
    global ema_landmarks, ema_probs, frame_counter, current_mudra

    try:
        body = request.get_json(force=True)
        if not body or 'frame' not in body:
            return jsonify({"error": "No frame"}), 400

        target = body.get('targetMudra', '').lower().strip()

        base_response = {
            "detected": False, "feedback": "Show your hand to the camera",
            "name": "", "confidence": 0, "accuracy": 0,
            "corrections": [], "meaning": "", "is_stable": False,
            "landmarks": [], "timestamp": datetime.now().isoformat(),
            "face_detected": False, "rasa": "", "rasa_confidence": 0,
            "rasa_meaning": "", "expected_rasa": "",
            "expression_match": False, "expression_correction": "",
            "top_priority_correction": "",
        }

        try:
            img_data = base64.b64decode(body['frame'].split(',')[-1])
        except Exception as e:
            print(f"[detect_frame] Base64 decode error: {e}", flush=True)
            return jsonify(base_response)

        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            print("[detect_frame] FAILED TO DECODE FRAME", flush=True)
            return jsonify(base_response)

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        frame_counter += 1

        mudra_result = base_response.copy()
        result       = hands.process(rgb_frame)
        if not result.multi_hand_landmarks:
            ema_landmarks = None
            ema_probs     = None
            current_mudra = base_response.copy()
        else:
            mudra_result = run_madm(result.multi_hand_landmarks[0], target)
            if "error" in mudra_result:
                return jsonify(mudra_result)
            current_mudra.update(mudra_result)

        mudra_result["timestamp"] = datetime.now().isoformat()

        if frame_counter % 3 == 0:
            navarasa_result = detect_navarasa(rgb_frame, mudra_result.get("name", ""))
            current_navarasa.update(navarasa_result)

        mudra_result.update(current_navarasa)

        corrections    = mudra_result.get("corrections", [])
        exp_correction = mudra_result.get("expression_correction", "")
        mudra_result["top_priority_correction"] = corrections[0] if corrections else exp_correction

        return jsonify(mudra_result)

        return jsonify(mudra_result)

    except Exception as e:
        print(f"[detect_frame] Error: {e}")
        return jsonify({"error": str(e), "detected": False}), 500

@app.route('/api/detect_landmarks', methods=['POST'])
def detect_landmarks():
    """ 
    Modern endpoint for client-side extracted landmarks. 
    Eliminates base64 image lag.
    """
    global current_mudra
    try:
        body = request.get_json(force=True)
        if not body or 'landmarks' not in body:
            return jsonify({"error": "No landmarks"}), 400

        target = body.get('targetMudra', '').lower().strip()
        landmarks = body['landmarks']

        # Ensure we have 21 landmarks
        if len(landmarks) != 21:
             return jsonify({"error": "Invalid landmark count"}), 400

        # Run MADM pipeline
        mudra_result = run_madm(landmarks, target)
        
        # Merge with Navarasa state (Navarasa is still camera-feed dependent or can be disabled for this route)
        mudra_result.update(current_navarasa)
        
        # Update global state
        current_mudra.update(mudra_result)
        
        return jsonify(mudra_result)
    except Exception as e:
        print(f"[detect_landmarks] Error: {e}")
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e), "detected": False}), 500

@app.route('/api/landmarks')
def get_landmarks_route():
    target      = request.args.get('target', '').lower().strip()
    curr_angles = {}
    if last_landmarks:
        try:
            # Using the refined dictionary angle logic (consistent with core pipeline)
            raw = get_finger_angles_dict(last_landmarks.landmark)
            
            # Simple average for "smoothing" in the debug route
            curr_angles = raw # In the route we can return raw or apply a minimal buffer
        except Exception as e:
            print(f"[get_landmarks_route] Error: {e}")
            pass
    return jsonify({
        "landmarks":      lm_to_json(last_landmarks.landmark if last_landmarks else None),
        "current_angles": curr_angles,
        "ref_angles":     MUDRA_REFERENCE_ANGLES.get(target, {}),
        "detected":       bool(current_mudra.get("detected", False)),
        "mudra_name":     str(current_mudra.get("name", "") or ""),
        "is_stable":      bool(current_mudra.get("is_stable", False)),
    })

@app.route('/api/session_report', methods=['POST'])
def save_session_report():
    data = request.get_json(force=True)
    r    = {
        "studentId": data.get('studentId', ''),
        "classId":   data.get('classId', ''),
        "mudraName": data.get('mudraName', ''),
        "aiScore":   data.get('aiScore', 0),
        "timeTaken": data.get('timeTaken', 0),
        "timestamp": data.get('timestamp', datetime.utcnow().isoformat() + 'Z'),
        "feedback":  "Excellent" if data.get('aiScore', 0) >= 75 else "Needs Practice",
    }
    session_reports[f"{r['studentId']}_{r['classId']}"] = r
    return jsonify(r)

@app.route('/api/session_report/<student_id>/<class_id>')
def get_session_report(student_id, class_id):
    r = session_reports.get(f"{student_id}_{class_id}")
    return jsonify(r) if r else (jsonify({"error": "Not found"}), 404)

# =============================================================================
# SOCKET.IO EVENTS
# =============================================================================

@socketio.on('join_class')
def handle_join(data):
    room = data.get('classId')
    if room:
        join_room(room)
        emit('joined', {'classId': room})

@socketio.on('set_target_mudra')
def handle_set_target(data):
    target = data.get('target', '').lower().strip()
    room   = data.get('classId')
    if target and room:
        class_targets[room]            = target
        class_targets["video_feed"]    = target
        class_targets["free_practice"] = target
        emit('target_changed', {'target': target}, room=room)

@socketio.on('set_free_practice_target')
def handle_free_target(data):
    target = data.get('target', '')
    if target:
        t = target.lower().strip()
        class_targets["free_practice"] = t
        class_targets["video_feed"]    = t

# =============================================================================
# ENTRY POINT
# =============================================================================
if __name__ == '__main__':
    print("GestureIQ Flask API starting on http://0.0.0.0:5001")
    print("Modules: Mudra detection + Navarasa detection")
    socketio.run(app, host='0.0.0.0', port=5001, debug=False,
                 allow_unsafe_werkzeug=True)

