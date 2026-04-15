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
import sys, os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.feature_engineering import extract_features, get_angle, get_distance
from utils.double_feature_engineering import extract_double_features
from scipy.spatial.distance import cosine

app = Flask(__name__)
CORS(app, origins="*")
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading', path='/flask.socket.io')

BASE_DIR = os.path.dirname(__file__)
MODEL_DIR = os.path.join(BASE_DIR, "../models")

class LM:
    __slots__ = ('x', 'y', 'z')
    def __init__(self, x, y, z):
        self.x, self.y, self.z = x, y, z

class LMWrapper:
    def __init__(self, lm_list): self._lm = lm_list
    def __getitem__(self, i):    return self._lm[i]

# ── Model Loading ─────────────────────────────────────────────
model = None
mudra_model_path = os.path.join(MODEL_DIR, "mudra_model.pkl")
if os.path.exists(mudra_model_path):
    try:
        with open(mudra_model_path, "rb") as f:
            model = pickle.load(f)
        print(f"[INFO] Mudra model loaded from {mudra_model_path}")
    except Exception as e:
        print(f"[ERROR] Failed to load mudra model: {e}")
else:
    print(f"[WARNING] Mudra model not found at {mudra_model_path}")

navarasa_model = None
navarasa_model_path = os.path.join(MODEL_DIR, "navarasa_model.pkl")
if os.path.exists(navarasa_model_path):
    try:
        with open(navarasa_model_path, "rb") as f:
            navarasa_model = pickle.load(f)
        print(f"[INFO] Navarasa model loaded from {navarasa_model_path}")
        print("[INFO] Navarasa classes:", list(navarasa_model.classes_))
    except Exception as e:
        print(f"[ERROR] Failed to load navarasa model: {e}")
else:
    print(f"[WARNING] Navarasa model not found at {navarasa_model_path}")

# Load MUDRA_LIBRARY for Ghost Hand
MUDRA_LIBRARY = {}
mudra_library_path = os.path.join(MODEL_DIR, "mudra_library.pkl")
if os.path.exists(mudra_library_path):
    try:
        with open(mudra_library_path, "rb") as f:
            MUDRA_LIBRARY = pickle.load(f)
        print(f"[INFO] Mudra Library loaded from {mudra_library_path}")
    except Exception as e:
        print(f"[ERROR] Failed to load mudra library: {e}")
else:
    print(f"[WARNING] Mudra library not found at {mudra_library_path}. Ghost hand feature disabled.")



mp_hands = mp.solutions.hands
mp_draw  = mp.solutions.drawing_utils
hands    = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# Load double mudra model (Optional)
DOUBLE_MODEL_PATH = os.path.join(MODEL_DIR, "double_mudra_model.pkl")
_double_model = None
_double_model_classes = []

def _load_double_model():
    global _double_model, _double_model_classes
    if _double_model is not None:
        return True
    if not os.path.exists(DOUBLE_MODEL_PATH):
        print(f"[Double model] Not found at {DOUBLE_MODEL_PATH}. Run train_double_mudra_model.py first.")
        return False
    try:
        with open(DOUBLE_MODEL_PATH, 'rb') as f:
            _double_model = pickle.load(f)
        _double_model_classes = list(_double_model.classes_)
        print(f"[Double model] Loaded. Classes: {_double_model_classes}")
        return True
    except Exception as e:
        print(f"[Double model] Load error: {e}")
        return False

_load_double_model()

# --- NEW: Name mapping to handle frontend vs model name differences ---
FRONTEND_TO_MODEL = {
    'shakata':    'sakata',
    'shankha':    'sankha', 
    'pasha':      'pasa',
    'pushpaputa': 'puspaputa',
    'padmakosham': 'padmakosha',
    'sarpasiras':  'sarpashira',
    'khatwa':     'katva',
    'khatava':    'katva',
    'angali':     'anjali',
    'shivalinga': 'sivalinga',
    'kopotha':    'kapotha',
    'keelaka':    'kilaka',
}

# MediaPipe for double hand detection
hands_double = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=2,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

_mp_face   = mp.solutions.face_mesh
_face_mesh = _mp_face.FaceMesh(
    static_image_mode=False,
    max_num_faces=1,
    refine_landmarks=False,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)

# --- GLOBAL STABILITY REGISTRY ---
# Using a global dict is much more stable than attaching attributes to functions.
SMOOTHING_REGISTRY = {
    "single": {"smooth_acc": 0.0, "prev_display": 0.0, "last_target": ""},
    "double": {"smooth_acc": 0.0, "prev_display": 0.0, "last_target": ""}
}

cap = cv2.VideoCapture(0)

# =============================================================================
# EMA + STABILITY PARAMETERS
# =============================================================================
EMA_ALPHA          = 0.45
LANDMARK_EMA_ALPHA = 0.25
MIN_STABLE_FRAMES  = 6
STABLE_THRESHOLD   = 0.58
FAST_BREAK_FRAMES  = 5

is_double_mode = False  # [FIX 1] Hard mode switch flag

ema_probs     = None
ema_landmarks = None
stable_mudra  = ""
stable_count  = 0
raw_history   = deque(maxlen=FAST_BREAK_FRAMES)

ema_navarasa_probs    = None
navarasa_stable_count = 0
navarasa_stable_name  = ""
NAVARASA_STABLE_FRAMES = 4
NAVARASA_EMA_ALPHA    = 0.60

# [NEW] Double Hand Stability State
ema_double_accuracy   = 0.0
ema_double_probs      = None   # Isolated from single-hand ema_probs
stable_double_mudra   = ""     # Isolated from single-hand stable_mudra
stable_double_count   = 0      # Isolated from single-hand stable_count
double_mirror_mode    = False
double_mirror_frames  = 0
MIRROR_STICKY_FRAMES  = 20  # Increased for ultra-stability (Phase 9)
ACCURACY_EMA_ALPHA    = 0.2 # Smoothing factor for double-hand accuracy (0.2 = smoother)

# [PHASE 16] Absolute Temporal Locking State
double_prediction_buffer = deque(maxlen=10) # Fix 3: Voting buffer (Increased for stability)
double_lock_counter      = 0               # Fix 2: Hysteresis lock
double_active_flag       = False           # For Schmidt Trigger/Hysteresis
DOUBLE_LOCK_FRAMES       = 10
double_locked_acc        = 0               # Fix 2: Locked accuracy value
double_freeze            = False           # Fix 5: Output freeze
double_freeze_acc        = 0.0

# [PHASE 17] Joined-Hand Stability Overdrive (9-Layer Architecture)
JOINED_STABILITY_OVERDRIVE = ['anjali', 'kapotha', 'samputa', 'pushpaputa']
OVERDRIVE_LOCK_FRAMES      = 25

# [NEW] Hand Anchoring State (Phase 2 Stability)
double_hand_history   = deque(maxlen=10) # Track last 10 detections
last_valid_right      = None
last_valid_left       = None

# --- Samyuta Categories (Phase 16) ---
CROSS_MUDRAS = ['svastika', 'utsanga', 'nagabandha', 'katva', 'bherunda', 'katakavardhana', 'kartarisvastika']
JOINED_MUDRAS = ['anjali', 'kapotha', 'puspaputa', 'samputa', 'sankha', 'chakra', 'matsya', 'kurma', 'varaha']
STACKED_MUDRAS = ['sivalinga', 'matsya']
INTERLOCKED_MUDRAS = ['pasa', 'kilaka', 'karkata']
ALL_DOUBLE_MUDRAS = JOINED_MUDRAS + STACKED_MUDRAS + CROSS_MUDRAS + INTERLOCKED_MUDRAS + ['sakata', 'dola']

# [PHASE 13] Landmark Anchoring & Result Fallback
last_good_data = {} # { 'mudra_name': { result_dict } }

frame_counter = 0
PROCESS_EVERY_N_FRAMES = 2

HOLD_THRESHOLD  = 0.035  # Increased from 0.018 to be more forgiving
HOLD_FRAMES     = 6      # Slightly reduced to trigger success faster
COOLDOWN_FRAMES = 20

landmark_history     = deque(maxlen=2)
hold_frame_buffer    = deque(maxlen=HOLD_FRAMES)
cooldown_counter     = 0
hold_triggered       = False

# [PHASE 15] Isolated Double Hold State
landmark_history_double  = deque(maxlen=2)
hold_frame_buffer_double = deque(maxlen=HOLD_FRAMES)
cooldown_counter_double  = 0
hold_triggered_double    = False

last_auto_evaluation = {}

detection_history = deque(maxlen=3)
last_stable_name  = ""

angle_buffer = deque(maxlen=5)

current_mudra = {
    "name": "", "confidence": 0.0, "detected": False,
    "accuracy": 0.0, "corrections": [],
    "is_stable": False, "hold_state": "idle", "hold_progress": 0
}

current_navarasa = {
    "face_detected":         False,
    "rasa":                  "",
    "rasa_confidence":       0.0,
    "expected_rasa":         "",
    "expression_match":      False,
    "expression_correction": "",
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

    # Double Hand Mudra Meanings
    "anjali":          "Salutation — prayer, greeting, offering",
    "kapotha":         "Pigeon — respect, shyness",
    "karkata":         "Crab — stretching, abundance",
    "svastika":        "Cross/Auspicious — blessing",
    "dola":            "Swing — beginning of a dance",
    "puspaputa":       "Flower basket — offering flowers, puja",
    "utsanga":         "Embrace — hug, self-comfort",
    "sivalinga":       "Lord Shiva — strength, creation",
    "katakavardhana":  "Link of bracelets — coronation, worship",
    "kartarisvastika": "Crossed scissors — trees, branches, hills",
    "sakata":          "Cart/Demon — shakata demon, cart",
    "sankha":          "Conch — conch shell, sacred sound",
    "chakra":          "Wheel/Disc — Sudarshana chakra, spinning disc",
    "samputa":         "Hollow container — offering bowl, vessel",
    "pasa":            "Noose/Rope — binding, Varuna's noose",
    "kilaka":          "Bond/Link — chain, bond, link",
    "matsya":          "Fish — Matsya avatar, water",
    "kurma":           "Tortoise — Kurma avatar, stability",
    "varaha":          "Boar — Varaha avatar, lifting earth",
    "garuda":          "Eagle/Garuda — Vishnu's eagle",
    "nagabandha":      "Serpent bond — snakes intertwined",
    "bherunda":        "Fierce bird — power",
    "katva":           "Bedpost — furniture, post, pillar",
}

# =============================================================================
# MUDRA REFERENCE ANGLES
# =============================================================================
MUDRA_REFERENCE_ANGLES = {
    "alapadma":     {'thumb': 156.4, 'index': 130.2, 'middle': 131.7, 'ring': 122.9, 'pinky': 118.5},
    "arala":        {'thumb': 155.8, 'index':  70.2, 'middle': 174.5, 'ring': 173.2, 'pinky': 171.2},
    "ardhachandra": {'thumb': 170.1, 'index': 175.2, 'middle': 176.4, 'ring': 174.9, 'pinky': 170.2},
    "ardhapataka":  {'thumb': 160.0, 'index': 174.9, 'middle': 174.2, 'ring':  89.5, 'pinky':  91.2},
    "bhramara":     {'thumb':  59.8, 'index':  58.7, 'middle':  70.4, 'ring': 175.1, 'pinky': 174.2},
    "chandrakala":  {'thumb': 161.2, 'index': 175.4, 'middle':  60.1, 'ring':  59.8, 'pinky':  61.2},
    "chatura":      {'thumb':  61.5, 'index': 175.2, 'middle': 174.9, 'ring': 174.2, 'pinky': 129.5},
    "hamsapaksha":  {'thumb': 121.2, 'index': 140.4, 'middle': 131.2, 'ring': 122.5, 'pinky': 111.4},
    "hamsasya":     {'thumb':  54.8, 'index':  55.2, 'middle':  56.1, 'ring':  54.9, 'pinky':  55.4},
    "kangula":      {'thumb': 160.5, 'index': 165.2, 'middle': 165.4, 'ring':  44.8, 'pinky': 165.2},
    "kapittha":     {'thumb': 106.6, 'index':  97.2, 'middle':  76.5, 'ring':  78.4, 'pinky':  91.1},
    "kartarimukha": {'thumb':  80.2, 'index': 175.1, 'middle': 174.4, 'ring':  51.2, 'pinky':  49.8},
    "katakamukha":  {'thumb': 100.4, 'index': 101.2, 'middle': 102.5, 'ring': 174.5, 'pinky': 173.2},
    "mayura":       {'thumb': 101.2, 'index': 175.4, 'middle': 174.5, 'ring': 120.4, 'pinky': 175.2},
    "mrigashira":   {'thumb': 175.1, 'index':  70.2, 'middle':  70.4, 'ring':  70.1, 'pinky': 175.2},
    "mukula":       {'thumb':  59.8, 'index':  60.2, 'middle':  61.4, 'ring':  59.5, 'pinky':  61.2},
    "mushti":       {'thumb':  55.0, 'index':  45.0, 'middle':  45.0, 'ring':  45.0, 'pinky':  45.0},
    "padmakosha":   {'thumb': 111.2, 'index': 110.5, 'middle': 112.4, 'ring': 111.2, 'pinky': 110.8},
    "palli":        {'thumb':  44.2, 'index': 174.5, 'middle': 174.2, 'ring':  45.1, 'pinky':  46.2},
    "pataka":       {'thumb':  70.4, 'index': 175.1, 'middle': 175.4, 'ring': 174.2, 'pinky': 174.8},
    "sandamsha":    {'thumb':  74.8, 'index':  61.2, 'middle':  59.5, 'ring':  49.8, 'pinky':  51.2},
    "sarpashira":   {'thumb': 141.2, 'index': 140.5, 'middle': 141.6, 'ring': 139.8, 'pinky': 142.1},
    "shikhara":     {'thumb': 175.4, 'index':  34.8, 'middle':  35.1, 'ring':  36.2, 'pinky':  34.9},
    "shukatunda":   {'thumb':  89.2, 'index': 175.4, 'middle': 174.9, 'ring':  69.5, 'pinky': 174.2},
    "simhamukha":   {'thumb':  90.2, 'index': 175.1, 'middle': 101.4, 'ring': 102.5, 'pinky': 175.4},
    "suchi":        {'thumb': 109.5, 'index': 175.1, 'middle':  51.2, 'ring':  50.4, 'pinky':  51.2},
    "tamrachuda":   {'thumb': 174.8, 'index':  34.5, 'middle':  35.2, 'ring':  36.1, 'pinky': 175.2},
    "tripataka":    {'thumb': 160.0, 'index': 175.1, 'middle': 174.5, 'ring':  39.8, 'pinky': 174.8},
    "trishula":     {'thumb':  54.5, 'index': 175.1, 'middle': 174.5, 'ring': 174.2, 'pinky':  55.2},
    "vyaaghr":      {'thumb': 175.1, 'index': 174.8, 'middle':  54.7, 'ring':  56.2, 'pinky': 174.5},
}

CORRECTION_THRESHOLDS = {
    "thumb": 45, "index": 42, "middle": 42, "ring": 42, "pinky": 42,
}

STRAIGHT_FINGER_MUDRAS = {
    "pataka", "tripataka", "ardhachandra", "trishula", "arala", "sarpashira"
}
STRAIGHT_FINGER_THRESHOLD = 12

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
    "tripataka":    {"thumb"},
    "ardhapataka":  {"thumb"},
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

def dist_lm(lm, i, j, palm_size=1.0):
    p1 = [lm[i].x, lm[i].y, lm[i].z]
    p2 = [lm[j].x, lm[j].y, lm[j].z]
    return get_distance(p1, p2) / max(palm_size, 1e-6)

def get_finger_angles_dict(landmarks):
    res = {
        "thumb":  get_angle([landmarks[1].x, landmarks[1].y, landmarks[1].z],
                            [landmarks[2].x, landmarks[2].y, landmarks[2].z],
                            [landmarks[3].x, landmarks[3].y, landmarks[3].z]),
        "index":  get_angle([landmarks[5].x, landmarks[5].y, landmarks[5].z],
                            [landmarks[6].x, landmarks[6].y, landmarks[6].z],
                            [landmarks[7].x, landmarks[7].y, landmarks[7].z]),
        "middle": get_angle([landmarks[9].x, landmarks[9].y, landmarks[9].z],
                            [landmarks[10].x, landmarks[10].y, landmarks[10].z],
                            [landmarks[11].x, landmarks[11].y, landmarks[11].z]),
        "ring":   get_angle([landmarks[13].x, landmarks[13].y, landmarks[13].z],
                            [landmarks[14].x, landmarks[14].y, landmarks[14].z],
                            [landmarks[15].x, landmarks[15].y, landmarks[15].z]),
        "pinky":  get_angle([landmarks[17].x, landmarks[17].y, landmarks[17].z],
                            [landmarks[18].x, landmarks[18].y, landmarks[18].z],
                            [landmarks[19].x, landmarks[19].y, landmarks[19].z])
    }
    return res

# =============================================================================
# NAVARASA DETECTION
# =============================================================================
def detect_navarasa(rgb_frame, current_mudra_name=""):
    global ema_navarasa_probs, navarasa_stable_count, navarasa_stable_name

    empty = {
        "face_detected": False, "rasa": "", "rasa_confidence": 0.0,
        "rasa_meaning": "", "expected_rasa": "",
        "expression_match": False, "expression_correction": "",
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
                "face_detected": True, "rasa": "", "rasa_confidence": round(top_confidence, 1),
                "rasa_meaning": "", "expected_rasa": "",
                "expression_match": False, "expression_correction": "",
            }

        expected   = MUDRA_NAVARASA_MAP.get(current_mudra_name.lower(), "")
        matches    = (top_rasa == expected) if expected else True
        correction = ""
        if expected and not matches:
            exp_name   = NAVARASA_MEANINGS.get(expected, expected)
            correction = f"Express {expected.capitalize()} — {exp_name}"

        return {
            "face_detected": True, "rasa": top_rasa,
            "rasa_confidence": round(top_confidence, 1),
            "rasa_meaning": NAVARASA_MEANINGS.get(top_rasa, ""),
            "expected_rasa": expected, "expression_match": matches,
            "expression_correction": correction,
        }

    except Exception as e:
        print(f"[detect_navarasa] Error: {e}")
        return empty

# =============================================================================
# EMA SMOOTHING
# =============================================================================
def ema_smooth_landmarks(lm_list):
    global ema_landmarks
    arr = np.array([[lm.x, lm.y, lm.z] for lm in lm_list])
    if ema_landmarks is None:
        ema_landmarks = arr.copy()
    else:
        ema_landmarks = LANDMARK_EMA_ALPHA * arr + (1 - LANDMARK_EMA_ALPHA) * ema_landmarks
    return ema_landmarks

def update_ema_probs(raw_probs):
    global ema_probs
    if ema_probs is None or len(ema_probs) != len(raw_probs):
        ema_probs = raw_probs.copy()
    else:
        ema_probs = EMA_ALPHA * raw_probs + (1 - EMA_ALPHA) * ema_probs
    return ema_probs

def update_stability(current_name, ema_prob_vector, min_frames_override=None):
    global stable_mudra, stable_count

    target_frames = min_frames_override if min_frames_override is not None else MIN_STABLE_FRAMES

    classes     = model.classes_
    top_idx     = list(classes).index(current_name) if current_name in list(classes) else 0
    smooth_conf = float(ema_prob_vector[top_idx]) * 100 if top_idx < len(ema_prob_vector) else 0.0

    raw_history.append(current_name)

    if len(raw_history) == FAST_BREAK_FRAMES and len(set(raw_history)) == 1:
        if current_name != stable_mudra:
            stable_mudra = current_name
            stable_count = target_frames
        return stable_mudra, True, smooth_conf

    top_prob = ema_prob_vector[top_idx] if top_idx < len(ema_prob_vector) else 0.0
    if top_prob >= STABLE_THRESHOLD:
        if current_name == stable_mudra:
            stable_count = min(stable_count + 1, target_frames)
        else:
            stable_count = 1
            stable_mudra = current_name
    else:
        stable_count = max(stable_count - 1, 0)

    is_stable = (stable_count >= target_frames)
    return stable_mudra, is_stable, smooth_conf

# =============================================================================
# CORRECTIVE FEEDBACK ENGINE
# =============================================================================
def get_corrections(detected_mudra, current_angles, landmarks_ref=None, palm_size=1.0):
    mudra_key    = str(detected_mudra).lower().strip()
    reference    = MUDRA_REFERENCE_ANGLES.get(mudra_key)
    if reference is None:
        return [], 0.0

    lm           = landmarks_ref
    skip_fingers = SKIP_CORRECTION_FINGERS.get(mudra_key, set())
    deviations   = []
    total_error  = 0

    # Recalculate palm size from landmarks if available
    if lm is not None:
        p_w = [lm[0].x, lm[0].y, lm[0].z]
        p_m = [lm[9].x, lm[9].y, lm[9].z]
        palm_size = get_distance(p_w, p_m)
        if palm_size < 1e-6:
            palm_size = 1.0

    # Base angle deviation loop
    for finger, ref_angle in reference.items():
        actual_angle = current_angles.get(finger, ref_angle)
        abs_dev      = abs(ref_angle - actual_angle)

        if abs_dev > 90:
            total_error += (abs_dev * 2.5)
        elif abs_dev > 50:
            total_error += (abs_dev * 1.5)
        else:
            total_error += abs_dev

        if finger in skip_fingers:
            continue

        target_straight = ref_angle >= 140

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

    # Geometry-based checks per mudra
    if lm is not None:

        if mudra_key == "pataka":
            ring_a = current_angles.get("ring", 175)
            if ring_a < 130:
                total_error += 60
                deviations.append((60, "Straighten your ring finger — Pataka needs all 4 fingers straight"))
            elif ring_a < 155:
                total_error += 30
                deviations.append((30, "Straighten your ring finger more for Pataka"))
            for f in ["index", "middle", "pinky"]:
                if current_angles.get(f, 175) < 145:
                    total_error += 50
                    deviations.append((50, f"Straighten your {f} finger for Pataka"))
            if current_angles.get("thumb", 70) > 120:
                total_error += 60
                deviations.append((60, "Bend your thumb inward toward your palm"))
            if dist_lm(lm, 4, 5, palm_size) > 0.45:
                total_error += 40
                deviations.append((40, "Tuck your thumb closer to your index finger base"))

        elif mudra_key == "tripataka":
            ring_a = current_angles.get("ring", 40)
            if ring_a > 130:
                total_error += 200
                deviations.append((200, "Bend your ring finger fully — only ring bends in Tripataka"))
            elif ring_a > 90:
                total_error += 80
                deviations.append((80, "Bend your ring finger more for Tripataka"))
            elif ring_a > 60:
                total_error += 35
                deviations.append((35, "Curl your ring finger down a little more"))
            if dist_lm(lm, 16, 0, palm_size) > 0.55:
                total_error += 55
                deviations.append((55, "Bend your ring finger all the way to your palm"))
            for f in ["index", "middle", "pinky"]:
                if current_angles.get(f, 175) < 145:
                    total_error += 45
                    deviations.append((45, f"Straighten your {f} finger for Tripataka"))
            # Tripataka: thumb should be STRAIGHT (finger guide: "others straight")
            # No thumb correction needed — only ring bends.

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
            # Ardhapataka: thumb should be STRAIGHT (extended), not bent.
            # Only flag if thumb is unexpectedly curled (< 120)
            if current_angles.get("thumb", 160) < 120:
                total_error += 50
                deviations.append((50, "Extend your thumb outward — keep it straight for Ardhapataka"))

        elif mudra_key == "kangula":
            if dist_lm(lm, 4, 16, palm_size) > 0.05:
                total_error += 85
                deviations.append((85, "Touch your thumb to your ring fingertip for Kangula"))
            for f in ["index", "middle", "pinky"]:
                a = current_angles.get(f, 165)
                if a < 110:
                    total_error += 50
                    deviations.append((50, f"Straighten your {f} finger for Kangula"))

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
            if dist_lm(lm, 8, 12, palm_size) > 0.12 or dist_lm(lm, 12, 16, palm_size) > 0.12:
                total_error += 60
                deviations.append((60, "Press all fingers tightly together — no gaps for Sarpashira"))
            tip_y = [lm[i].y for i in [8, 12, 16, 20]]
            if max(tip_y) - min(tip_y) > 0.06:
                total_error += 40
                deviations.append((40, "Align all fingertips at the same level"))

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
            if dist_lm(lm, 4, 8, palm_size) < 0.35:
                total_error += 45
                deviations.append((45, "Spread thumb and index apart — make a C / crescent shape"))

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
            ip_d = dist_lm(lm, 8, 20, palm_size)
            if ip_d > 0.65:
                total_error += 35
                deviations.append((35, "Bring your fingertips slightly closer together"))
            elif ip_d < 0.22:
                total_error += 30
                deviations.append((30, "Spread your fingers slightly apart — not too tight"))

        elif mudra_key == "alapadma":
            tips   = [4, 8, 12, 16, 20]
            avg_sp = sum(dist_lm(lm, tips[i], tips[i-1], palm_size) for i in range(1, 5)) / 4
            if avg_sp < 0.08:
                total_error += 50
                deviations.append((50, "Spread all five fingers wide apart"))
            if dist_lm(lm, 8, 20, palm_size) < 0.55:
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

        elif mudra_key == "mushti":
            fist_count = 0
            for t in [8, 12, 16, 20]:
                d = dist_lm(lm, t, 0, palm_size)
                if d > 0.65:
                    total_error += 50
                    deviations.append((50, f"Curl your {['index','middle','ring','little'][[8,12,16,20].index(t)]} finger tightly into the fist"))
                else:
                    fist_count += 1
            if fist_count == 4:
                total_error = total_error * 0.15
            elif fist_count <= 2:
                total_error += 200
            if dist_lm(lm, 4, 11, palm_size) > 0.52:
                total_error += 30
                deviations.append((30, "Tuck your thumb over your curled fingers"))

        elif mudra_key == "shikhara":
            fist_count = 0
            for t in [8, 12, 16, 20]:
                if dist_lm(lm, t, 0, palm_size) > 0.62:
                    total_error += 45
                    deviations.append((45, f"Curl your {['index','middle','ring','little'][[8,12,16,20].index(t)]} finger into fist"))
                else:
                    fist_count += 1
            if fist_count == 4:
                total_error = total_error * 0.2
            if current_angles.get("thumb", 175) < 140:
                total_error += 65
                deviations.append((65, "Raise your thumb straight up for Shikhara"))

        elif mudra_key == "hamsasya":
            if dist_lm(lm, 4, 8, palm_size) > 0.05:
                total_error += 85
                deviations.append((85, "Touch your thumb to your index tip for Hamsasya"))

        elif mudra_key == "mukula":
            max_dist = max(dist_lm(lm, 4, t, palm_size) for t in [8, 12, 16, 20])
            if max_dist > 0.38:
                total_error += 75
                deviations.append((75, "Touch all five fingertips together (flower bud shape)"))
            elif max_dist > 0.22:
                total_error += 35
                deviations.append((35, "Bring your fingertips a little closer together"))

        elif mudra_key == "bhramara":
            if dist_lm(lm, 4, 8, palm_size) > 0.08:
                total_error += 85
                deviations.append((85, "Bring your index finger to touch your thumb for Bhramara"))
            if current_angles.get("index", 70) > 110:
                total_error += 65
                deviations.append((65, "Bend your index finger inward for Bhramara"))
            for f in ["ring", "pinky"]:
                if current_angles.get(f, 175) < 130:
                    total_error += 30
                    deviations.append((30, f"Straighten your {f} finger for Bhramara"))

        elif mudra_key == "katakamukha":
            d_ti = dist_lm(lm, 4, 8, palm_size)
            d_tm = dist_lm(lm, 4, 12, palm_size)
            if d_ti > 0.25 or d_tm > 0.25:
                total_error += 55
                deviations.append((55, "Bring thumb, index, and middle fingertips together"))
            for f in ["ring", "pinky"]:
                if current_angles.get(f, 175) < 130:
                    total_error += 40
                    deviations.append((40, f"Straighten your {f} finger for Katakamukha"))

        elif mudra_key == "kartarimukha":
            if dist_lm(lm, 8, 12, palm_size) < 0.07:
                total_error += 75
                deviations.append((75, "Spread your index and middle fingers apart like scissors"))
            for f in ["index", "middle"]:
                if current_angles.get(f, 175) < 145:
                    total_error += 50
                    deviations.append((50, f"Straighten your {f} finger for Kartarimukha"))
            for f in ["ring", "pinky"]:
                if current_angles.get(f, 50) > 90:
                    total_error += 180
                    deviations.append((180, f"Curl your {f} finger FULLY inward for Kartarimukha"))

        elif mudra_key == "mayura":
            if dist_lm(lm, 4, 16, palm_size) > 0.38:
                total_error += 100
                deviations.append((100, "Bring your thumb tip to touch your ring fingertip"))
            for f in ["index", "middle", "pinky"]:
                if current_angles.get(f, 175) < 140:
                    total_error += 40
                    deviations.append((40, f"Keep your {f} finger straight for Mayura"))
            if current_angles.get("ring", 120) > 165:
                total_error += 140
                deviations.append((140, "Curl your ring finger slightly to meet your thumb tip"))

        elif mudra_key == "shukatunda":
            if dist_lm(lm, 4, 13, palm_size) > 0.15:
                total_error += 55
                deviations.append((55, "Press your thumb against your ring finger base"))
            if current_angles.get("ring", 70) > 110:
                total_error += 60
                deviations.append((60, "Bend your ring finger more for Shukatunda"))
            for f in ["index", "middle", "pinky"]:
                if current_angles.get(f, 175) < 140:
                    total_error += 35
                    deviations.append((35, f"Straighten your {f} finger for Shukatunda"))

        elif mudra_key == "kapittha":
            if dist_lm(lm, 4, 8, palm_size) > 0.12:
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

        elif mudra_key == "suchi":
            if current_angles.get("thumb", 110) > 140:
                total_error += 600
                deviations.append((600, "Tuck your thumb inward — do not extend it for Suchi"))
            elif current_angles.get("thumb", 110) > 125:
                total_error += 200
                deviations.append((200, "Tuck your thumb tighter against your hand"))

            if current_angles.get("index", 175) < 150:
                total_error += 70
                deviations.append((70, "Point your index finger straight up for Suchi"))
            if dist_lm(lm, 8, 0, palm_size) < 0.22:
                total_error += 50
                deviations.append((50, "Raise your index finger higher — it should point straight up"))
            for f in ["middle", "ring", "pinky"]:
                if current_angles.get(f, 50) > 100:
                    total_error += 40
                    deviations.append((40, f"Curl your {f} finger inward for Suchi"))

        elif mudra_key == "mrigashira":
            for f in ["thumb", "pinky"]:
                if current_angles.get(f, 175) < 140:
                    total_error += 55
                    deviations.append((55, f"Straighten your {f} finger for Mrigashira"))
            for f in ["index", "middle", "ring"]:
                if current_angles.get(f, 70) > 110:
                    total_error += 45
                    deviations.append((45, f"Curl your {f} finger inward for Mrigashira"))
            if current_angles.get("ring", 70) > 130:
                total_error += 100
                deviations.append((100, "Bend your ring finger more for Mrigashira"))

        elif mudra_key == "simhamukha":
            for f in ["index", "pinky"]:
                if current_angles.get(f, 175) < 140:
                    total_error += 50
                    deviations.append((50, f"Straighten your {f} finger for Simhamukha"))
            for f in ["middle", "ring"]:
                if current_angles.get(f, 100) > 140:
                    total_error += 45
                    deviations.append((45, f"Bend your {f} finger inward for Simhamukha"))

        elif mudra_key == "arala":
            if current_angles.get("index", 70) > 120:
                total_error += 75
                deviations.append((75, "Bend your index finger sharply inward for Arala"))
            for f in ["middle", "ring", "pinky"]:
                if current_angles.get(f, 175) < 140:
                    total_error += 45
                    deviations.append((45, f"Straighten your {f} finger — only index bends in Arala"))

        elif mudra_key == "ardhachandra":
            if abs(lm[4].x - lm[0].x) < 0.10:
                total_error += 40
                deviations.append((40, "Extend your thumb fully sideways away from your palm"))
            if dist_lm(lm, 8, 20, palm_size) < 0.12:
                total_error += 30
                deviations.append((30, "Spread all fingers open wide for Ardhachandra"))
            for f in ["index", "middle", "ring", "pinky"]:
                if current_angles.get(f, 175) < 145:
                    total_error += 35
                    deviations.append((35, f"Straighten your {f} finger for Ardhachandra"))

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

        elif mudra_key == "trishula":
            for f in ["index", "middle", "ring"]:
                if current_angles.get(f, 175) < 145:
                    total_error += 55
                    deviations.append((55, f"Straighten your {f} finger for Trishula (3 fingers up)"))
            for f in ["thumb", "pinky"]:
                if current_angles.get(f, 55) > 110:
                    total_error += 45
                    deviations.append((45, f"Curl your {f} inward — only 3 middle fingers up for Trishula"))

        elif mudra_key == "hamsapaksha":
            vals = [current_angles.get(f, 0) for f in ["index", "middle", "ring", "pinky"]]
            if max(vals) - min(vals) < 10:
                total_error += 40
                deviations.append((40, "Spread fingers in a gentle wave — each at a slightly different angle"))

        elif mudra_key == "sandamsha":
            if dist_lm(lm, 8, 12, palm_size) > 0.06:
                total_error += 60
                deviations.append((60, "Pinch index and middle fingertips tightly together for Sandamsha"))
            for f in ["ring", "pinky"]:
                if current_angles.get(f, 50) > 100:
                    total_error += 35
                    deviations.append((35, f"Curl your {f} finger inward for Sandamsha"))

        elif mudra_key == "chatura":
            for f in ["index", "middle", "ring"]:
                if current_angles.get(f, 175) < 145:
                    total_error += 45
                    deviations.append((45, f"Straighten your {f} finger for Chatura"))
            if current_angles.get("thumb", 60) > 110:
                total_error += 40
                deviations.append((40, "Curl your thumb inward for Chatura"))

    # Deduplicate + sort
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
    """
    Robust velocity calculation supporting both MediPipe objects and coord lists.
    """
    def get_xyz(p):
        if hasattr(p, 'x'): return p.x, p.y, p.z
        if isinstance(p, dict): return p.get('x', 0), p.get('y', 0), p.get('z', 0)
        if isinstance(p, (list, tuple)) and len(p) >= 3: return p[0], p[1], p[2]
        return 0.0, 0.0, 0.0

    total = 0.0
    for i in range(21):
        px, py, _ = get_xyz(prev_lm[i])
        cx, cy, _ = get_xyz(curr_lm[i])
        total += abs(cx - px) + abs(cy - py)
    return total / 21.0

def is_hand_held(landmarks, current_accuracy=0.0):
    global cooldown_counter, hold_triggered
    
    # ── ACCURACY-AWARE VELOCITY (Phase 14) ────────────────────────────
    # If the user has great form (>85%), we double the movement tolerance.
    # This prevents natural webcam "jitter" from resetting a near-perfect hold.
    effective_threshold = HOLD_THRESHOLD
    if current_accuracy > 85.0:
        effective_threshold *= 2.0
    
    if cooldown_counter > 0:
        cooldown_counter -= 1
        hold_frame_buffer.clear()
        return False, 0
    if len(landmark_history) < 2:
        landmark_history.append(landmarks)
        return False, 0
    velocity      = compute_landmark_velocity(landmark_history[-1], landmarks)
    landmark_history.append(landmarks)
    is_still      = velocity < effective_threshold
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

def is_hand_held_double(landmarks, current_accuracy=0.0):
    global landmark_history_double, hold_frame_buffer_double
    global cooldown_counter_double, hold_triggered_double
    
    # ── [SAFETY] Handle missing landmarks ─────────────────────────────
    if landmarks is None:
        hold_frame_buffer_double.append(False)
        return False, 0

    # ── [FIX 3] RELAXED VELOCITY (3.0x) ───────────────────────────────
    effective_threshold = HOLD_THRESHOLD
    if current_accuracy > 85.0:
        effective_threshold *= 3.0  # Increased from 2.0x for Extreme Stability
        
    if cooldown_counter_double > 0:
        cooldown_counter_double -= 1
        hold_frame_buffer_double.clear()
        return False, 0
        
    if len(landmark_history_double) < 2:
        landmark_history_double.append(landmarks)
        return False, 0
        
    velocity = compute_landmark_velocity(landmark_history_double[-1], landmarks)
    landmark_history_double.append(landmarks)
    
    is_still = velocity < effective_threshold
    hold_frame_buffer_double.append(is_still)
    
    still_count = sum(hold_frame_buffer_double)
    hold_progress = int((still_count / HOLD_FRAMES) * 100)
    
    if still_count >= HOLD_FRAMES and not hold_triggered_double:
        hold_triggered_double = True
        cooldown_counter_double = COOLDOWN_FRAMES
        hold_frame_buffer_double.clear()
        return True, 100
        
    if not is_still:
        hold_triggered_double = False
        
    return False, hold_progress

# =============================================================================
# CORE MADM PIPELINE
# =============================================================================
def run_madm(landmarks, target_mudra='', min_frames=None, label='Right'):
    global ema_probs, ema_landmarks, stable_mudra, stable_count, last_good_data
    global is_double_mode
    
    # ── [FIX 6] HARD INTERFERENCE CLEANUP ─────────────────────────────
    # If double mode is active, wipe the single-hand EMA to stop cross-contamination
    if is_double_mode:
        ema_probs     = None
        stable_mudra  = ""
        return {'detected': False, 'name': '', 'confidence': 0, 'accuracy': 0, 'corrections': [], 'hold_progress': 0, 'hold_state': 'idle'}
    
    # ── MUDRA ISOLATION (Phase 12) ────────────────────────────────────
    target_key = target_mudra.lower().strip() if target_mudra else ""
    if not hasattr(run_madm, 'last_target'):
        run_madm.last_target = ''
    
    if target_key != run_madm.last_target:
        run_madm.last_target = target_key
        run_madm.smooth_acc = 0.0
        run_madm.prev_display = 0.0
        
    # [PHASE 13] RESULT FALLBACK (Single Hand)
    # If the target is a complex/joined hand and we lose confidence while stable, use fallback
    if target_key in JOINED_MUDRAS and target_key in last_good_data:
        # Check if current state is "noisy" (placeholder for confidence-based check later in func)
        # For now, we'll check it AFTER the main evaluation in run_madm
        pass

    try:
        if hasattr(landmarks, 'landmark'):
            lm_list        = landmarks.landmark
            last_landmarks = landmarks
        else:
            lm_list        = [LM(p['x'], p['y'], p['z']) for p in landmarks]
            last_landmarks = type('obj', (object,), {'landmark': lm_list})

        p_w = [lm_list[0].x, lm_list[0].y, lm_list[0].z]
        p_m = [lm_list[9].x, lm_list[9].y, lm_list[9].z]
        palm_size = get_distance(p_w, p_m)
        if palm_size < 1e-6:
            palm_size = 1.0

        print(f"[DEBUG] run_madm: target={target_mudra}, label={label}")
        
        smoothed_arr = ema_smooth_landmarks(lm_list)
        smooth_lm    = [LM(smoothed_arr[i, 0], smoothed_arr[i, 1], smoothed_arr[i, 2])
                        for i in range(21)]

        features = extract_features(smooth_lm, label=label)
        if len(features) != 83:
            print(f"[ERROR] Feature size mismatch: Expected 83, got {len(features)}")
            return {"detected": False, "feedback": "Feature error"}

        raw_probs  = model.predict_proba([features])[0]
        raw_conf   = float(max(raw_probs)) * 100
        print(f"[DEBUG] ML Predicted: {model.classes_[np.argmax(raw_probs)]} ({raw_conf:.1f}%)")

        raw_angles    = get_finger_angles_dict(smooth_lm)
        angle_buffer.append(raw_angles)
        finger_angles = {f: sum(a[f] for a in angle_buffer) / len(angle_buffer) for f in raw_angles}
        lm_wrapper    = LMWrapper(smooth_lm)

        # TARGET-PRIORITY HYBRID LOGIC
        geom_acc   = 0
        target_key = target_mudra.lower().strip() if target_mudra else ""
        if target_key and target_key in MUDRA_REFERENCE_ANGLES:
            _, geom_acc = get_corrections(target_key, finger_angles, lm_wrapper, palm_size)
            if target_key == "hamsasya":
                if dist_lm(lm_wrapper, 4, 8, palm_size) < 0.12 and finger_angles.get("index", 180) < 110:
                    geom_acc = 95.0

        ema_p      = update_ema_probs(raw_probs)
        top_idx    = int(np.argmax(ema_p))
        top_name   = str(model.classes_[top_idx])
        stable_name, is_stable, smooth_conf = update_stability(top_name, ema_p, min_frames_override=min_frames)

        # Dynamic confidence floor
        conf_floor = 35 if (target_mudra or geom_acc > 50) else 25

        if raw_conf < conf_floor:
            eval_name = target_key if target_key else stable_name
            active_corrections, display_acc = [], 0.0
            if eval_name in MUDRA_REFERENCE_ANGLES:
                active_corrections, display_acc = get_corrections(eval_name, finger_angles, lm_wrapper, palm_size)

            # Wrong mudra check — use stable_name after EMA
            is_wrong = (target_key and stable_name.lower().strip() != eval_name and
                        (smooth_conf > 30 or raw_conf > 30))
            if is_wrong:
                wrong_msg = f"Wrong mudra — you are showing {stable_name.capitalize()} instead of {target_key.capitalize()}"
                active_corrections = [c for c in active_corrections if not c.startswith("Wrong mudra")]
                active_corrections.insert(0, wrong_msg)
                display_acc = 0.0

            return {
                "detected":    True,
                "name":        stable_name if not target_key else target_key,
                "confidence":  round(raw_conf, 1),
                "status":      "Refining Pose",
                "accuracy":    round(display_acc, 1),
                "corrections": active_corrections if active_corrections else ["Hold steady", "Focus on finger alignment"],
                "meaning":     MUDRA_MEANINGS.get(target_key or stable_name, ""),
                "is_stable":   False,
                "landmarks":   lm_to_json(lm_list),
                "hold_progress": 0,
                "hold_state":  "idle",
            }

        print(f"[INFO] Mudra: {stable_name}, Conf: {smooth_conf:.2f}")

        # HYBRID PRIORITY (Conflict Resolution)
        is_conflict = (target_key and stable_name != target_key and smooth_conf > 50)

        if target_key and geom_acc > 92 and not is_conflict:
            if stable_name != target_key:
                print(f"[HYBRID] Force: ML={stable_name}({smooth_conf:.1f}%) -> {target_key}({geom_acc:.1f}%)")
            stable_name = target_key
            smooth_conf = max(smooth_conf, geom_acc)
            is_stable   = True
        else:
            # BROAD GEOMETRIC SWEEP (For Free Practice Accuracy)
            best_geom_acc  = 0
            best_geom_name = ""
            geom_scores    = {}
            for m_name in MUDRA_REFERENCE_ANGLES.keys():
                _, acc = get_corrections(m_name, finger_angles, lm_wrapper, palm_size)
                geom_scores[m_name] = acc
                if acc > best_geom_acc:
                    best_geom_acc  = acc
                    best_geom_name = m_name

            # If ML is weak (conf < 70) and Geoscore is strong (acc > 85), prefer the Geometric match
            if not target_key and best_geom_acc > 85 and (smooth_conf < 70 or best_geom_name != stable_name):
                print(f"[GEOM-SWEEP] Overriding ML={stable_name}({smooth_conf:.1f}%) with GEOM={best_geom_name}({best_geom_acc:.1f}%)")
                stable_name = best_geom_name
                smooth_conf = max(smooth_conf, best_geom_acc * 0.90)
                is_stable   = True

            elif smooth_conf < 60:
                print(f"DEBUG: ML={stable_name}({smooth_conf:.1f}%) | GeomBest={best_geom_name}({best_geom_acc:.1f}%)")
                ring_angle = finger_angles.get("ring", 175)

                if stable_name == "pataka" and ring_angle < 110:
                    tri_score = geom_scores.get("tripataka",   0)
                    ard_score = geom_scores.get("ardhapataka", 0)
                    kng_score = geom_scores.get("kangula",     0)
                    best_alt_name, best_alt = max(
                        [("tripataka", tri_score), ("ardhapataka", ard_score), ("kangula", kng_score)],
                        key=lambda x: x[1]
                    )
                    if best_alt > 45:
                        stable_name = best_alt_name
                        smooth_conf = max(smooth_conf, best_alt * 0.85)
                        is_stable   = True

                elif stable_name == "tripataka" and ring_angle > 150:
                    pat_score = geom_scores.get("pataka", 0)
                    if pat_score > 45:
                        stable_name = "pataka"
                        smooth_conf = max(smooth_conf, pat_score * 0.85)
                        is_stable   = True

                is_curled_3 = (finger_angles.get("middle", 180) < 110 and
                               finger_angles.get("ring",   180) < 110 and
                               finger_angles.get("pinky",  180) < 110)
                index_dist      = dist_lm(lm_wrapper, 8, 0, palm_size)
                thumb_dist      = dist_lm(lm_wrapper, 4, 0, palm_size)
                
                # Absolute Fist Check (Loosened to 2.8 for inclusive detection in double-hand mudras)
                total_fist_dist = sum([dist_lm(lm_wrapper, t, 0, palm_size) for t in [8, 12, 16, 20]])
                is_fist_shape   = total_fist_dist < 2.8 
                
                signature_force = False

                if is_fist_shape and not target_key:
                    stable_name     = "mushti"
                    smooth_conf     = 95.0
                    is_stable       = True
                    signature_force = True
                
                elif is_curled_3 and index_dist > 0.45:
                    if thumb_dist > 0.45:
                        stable_name     = "chandrakala"
                        smooth_conf     = max(smooth_conf, 92.0)
                        is_stable       = True
                        signature_force = True
                    else:
                        stable_name     = "suchi"
                        smooth_conf     = max(smooth_conf, 92.0)
                        is_stable       = True
                        signature_force = True

                if not signature_force:
                    is_fist_mudra = best_geom_name in ["mushti", "shikhara"]
                    ml_is_open    = stable_name in ["pataka", "hamsapaksha", "sarpashira",
                                                    "ardhapataka", "chandrakala"]
                    if (best_geom_acc > 78 and smooth_conf < 40) or \
                       (best_geom_acc > 87 and best_geom_name != stable_name) or \
                       (is_fist_mudra and ml_is_open and best_geom_acc > 80):
                        stable_name = best_geom_name
                        smooth_conf = max(smooth_conf, best_geom_acc * 0.88)
                        is_stable   = True

                # --- TARGET LOCK CHECK ---
                # If we are in Learn mode (target_key is set) and the user is attempting the target mudra 
                # (target geometric accuracy is decent >= 60%), force the prediction to the target mudra.
                # However, if another mudra flawlessly matches (e.g. Pataka = 98%) while the target is barely passing (66%), DO NOT lock.
                if target_key:
                    target_geom_acc = geom_scores.get(target_key, 0)
                    if target_geom_acc >= 60 and (best_geom_acc - target_geom_acc < 25):
                        stable_name = target_key
                        smooth_conf = max(smooth_conf, target_geom_acc * 0.88)
                        is_stable   = True

        if raw_conf < 20 and smooth_conf < 25:
            return {
                "detected": False, "feedback": "Show your hand more clearly",
                "name": stable_name, "confidence": round(smooth_conf, 1),
                "accuracy": 0, "corrections": [], "meaning": "",
                "is_stable": False, "landmarks": lm_to_json(lm_list),
                "hold_progress": 0, "hold_state": "idle",
            }

        eval_mudra = target_key if target_key else stable_name
        corrections, art_accuracy = get_corrections(eval_mudra, finger_angles, lm_wrapper, palm_size)

        # SANITY CHECK: If ML picked an Open Mudra but it needs 'Straighten', 'Extend' etc.
        # and we have a high-accuracy Geometric Match (e.g. Pataka), SWAP!
        swap_keywords = ["Straighten", "Uncurl", "Extend", "Bend", "Tuck"]
        if not target_key and any(k in c for k in swap_keywords for c in corrections):
            if best_geom_acc > 88 and best_geom_name != stable_name:
                print(f"[SANITY-SWAP] Conflict Case: ML={stable_name} -> GEOM={best_geom_name}")
                stable_name = best_geom_name
                eval_mudra  = stable_name
                corrections, art_accuracy = get_corrections(eval_mudra, finger_angles, lm_wrapper, palm_size)
                is_stable   = True

        # --- STRICT VALIDATION LAYERS ---
        # 1. Identity Gate: If ML is sure it's the WRONG mudra, kill accuracy immediately.
        is_wrong_identity = (target_key and stable_name.lower().strip() != target_key and smooth_conf > 45)
        
        if is_wrong_identity:
            # Check if geometry is so perfect (>85%) it overrides the ML's wrong label
            # This is rare but useful for very similar mudras
            if art_accuracy < 85:
                print(f"[STRICT] Wrong Identity: ML={stable_name}, Target={target_key}. Killing accuracy.")
                total_accuracy = 0.0
                wrong_msg = f"Wrong mudra — you are showing {stable_name.capitalize()} instead of {target_key.capitalize()}"
                corrections = [c for c in corrections if not c.startswith("Wrong mudra")]
                corrections.insert(0, wrong_msg)
        elif target_key and stable_name.lower().strip() == target_key:
            # Boost accuracy slightly if it's the correct mudra and geometry is good
            total_accuracy = min(100.0, total_accuracy + 10)

        # 2. Layer 7 Noise Filter: Hard floor at 65%
        if total_accuracy < 65.0:
            total_accuracy = 0.0

        # --- STATE RESET & ASYMMETRIC SMOOTHING (GLOBAL REGISTRY) ---
        st = SMOOTHING_REGISTRY["single"]
        curr_target = target_mudra.lower().strip()
        
        # Reset if target changes
        if curr_target != st["last_target"]:
            st["smooth_acc"]  = total_accuracy
            st["prev_display"] = total_accuracy
            st["last_target"]  = curr_target

        # Asymmetric Rise (Instant Feedback)
        if total_accuracy > st["smooth_acc"]:
            st["smooth_acc"] = total_accuracy
        else:
            # Smooth Fall (Stability)
            alpha_smooth = 0.15
            st["smooth_acc"] = (st["smooth_acc"] * (1.0 - alpha_smooth)) + (total_accuracy * alpha_smooth)
        
        # Guard against rapid drops
        if st["smooth_acc"] < st["prev_display"]:
            st["smooth_acc"] = float(max(st["smooth_acc"], st["prev_display"] - 3.0))
        
        st["prev_display"] = st["smooth_acc"]
        total_accuracy = float(round(st["smooth_acc"], 1))

        # Layer 7 Noise Filter: Hard floor at 40% (allows earlier feedback)
        if total_accuracy < 40.0:
            total_accuracy = 0.0

        print(f"[DEBUG] Final Accuracy: {total_accuracy:.1f} (Geom: {art_accuracy:.1f}, ML: {smooth_conf:.1f})")

        # [PHASE 13] RESULT FALLBACK (Single Hand Update)
        target_key = target_mudra.lower().strip()
        
        # 1. Update Cache
        if total_accuracy >= 95.0 and target_key in JOINED_MUDRAS:
            last_good_data[target_key] = {
                'detected': True, 'name': stable_name, 'accuracy': total_accuracy,
                'is_stable': True, 'corrections': []
            }
        
        # 2. Serve Fallback if Noisy
        if total_accuracy < 25.0 and target_key in JOINED_MUDRAS and target_key in last_good_data:
            # We briefly serve the cached result to bridge a blink
            cached = last_good_data[target_key]
            return jsonify(cached)

        # Auto-save trigger at 75%+ (emitted via socket)
        is_good_frame = (smooth_conf >= 60 and total_accuracy >= 65)
        if is_good_frame:
            held, hold_progress = is_hand_held(lm_list, current_accuracy=total_accuracy)
        else:
            hold_frame_buffer.clear()
            held, hold_progress = False, 0

        feedback = (
            "Correct! Great form."                   if total_accuracy >= 75 else
            "Almost there — small adjustments needed" if total_accuracy >= 50 else
            "Try Again — adjust your hand position."
        )

        # Flicker filter
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
            # Extra field so frontend can show both detected and target names clearly
            "detected_mudra_name": stable_name,
            "target_mudra_name":   target_key,
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

        # Auto-save socket event when score >= 75
        if total_accuracy >= 75 and is_stable and target_key:
            socketio.emit("score_achieved", {
                "mudra":    target_key,
                "score":    total_accuracy,
                "feedback": feedback,
            })

        return result

    except Exception as e:
        print(f"[run_madm] Error: {e}")
        import traceback; traceback.print_exc()
        current_mudra["detected"] = False
        return {
            "detected": False, "feedback": "Evaluation error",
            "name": "", "confidence": 0, "accuracy": 0,
            "corrections": [], "meaning": "", "is_stable": False,
            "landmarks": [], "hold_progress": 0, "hold_state": "idle",
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
                ema_probs     = None
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
            "hold_progress": 0, "hold_state": "idle",
        }

        try:
            img_data = base64.b64decode(body['frame'].split(',')[-1])
        except Exception as e:
            return jsonify(base_response)

        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
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

    except Exception as e:
        print(f"[detect_frame] Error: {e}")
        return jsonify({"error": str(e), "detected": False}), 500

@app.route('/api/detect_landmarks', methods=['POST'])
def detect_landmarks():
    global current_mudra, is_double_mode
    try:
        is_double_mode = False # Reset flag for single hand mode
        body = request.get_json(force=True)
        if not body or 'landmarks' not in body:
            return jsonify({"error": "No landmarks"}), 400

        target    = body.get('targetMudra', '').lower().strip()
        landmarks = body['landmarks']

        if len(landmarks) != 21:
            return jsonify({"error": "Invalid landmark count"}), 400

        presence_score = body.get('presenceScore', 1.0)
        handedness     = body.get('handedness', 'Right')

        if presence_score < 0.25:
            return jsonify({
                "detected": False, "status": "No Hand Detected",
                "confidence": 0, "feedback": "Hand presence too low",
                "accuracy": 0, "corrections": [], "hold_progress": 0, "hold_state": "idle",
            })

        mudra_result = run_madm(landmarks, target, label=handedness, min_frames=3)
        mudra_result.update(current_navarasa)
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
            curr_angles = get_finger_angles_dict(last_landmarks.landmark)
        except Exception as e:
            print(f"[get_landmarks_route] Error: {e}")
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



# ============================================================================
# /api/predict  — STATELESS endpoint used ONLY by Detect.jsx
# ============================================================================
# Key differences from /api/detect_landmarks (used by Learn.jsx):
#   • Tries BOTH Right and Left hand feature extraction
#   • Picks whichever handedness gives higher model confidence
#   • Does NOT touch any global EMA / stability state
#   • No corrections, no scoring — just raw mudra name + confidence
#
# This completely isolates Detect.jsx from Learn.jsx.
# Add this route to flask_app.py just before `if __name__ == '__main__':`.
# ============================================================================

@app.route('/api/predict', methods=['POST'])
def predict_mudra():
    """
    Stateless mudra prediction for the Detect page.
    Tries Right-hand and Left-hand feature extraction, returns the best match.
    Does NOT modify any global state (no EMA, no stable_mudra, nothing).
    """
    try:
        body = request.get_json(force=True)
        if not body or 'landmarks' not in body:
            return jsonify({"name": "", "confidence": 0.0, "top3": []}), 400

        raw_lms = body['landmarks']
        if len(raw_lms) != 21:
            return jsonify({"name": "", "confidence": 0.0, "top3": []}), 400

        # Build LM objects from JSON
        lm_list = [LM(float(p['x']), float(p['y']), float(p['z'])) for p in raw_lms]


        best_name  = ""
        best_conf  = 0.0
        best_probs = None

                # Try both handedness options; pick the one the model is more confident about.
        # This compensates for the browser CSS mirror flip that inverts Left/Right labels.
        for hand_label in ('Right', 'Left'):
            try:
                feats = extract_features(lm_list, label=hand_label)
                probs = model.predict_proba([feats])[0]
                top_i = int(np.argmax(probs))
                conf  = float(probs[top_i]) * 100.0
                if conf > best_conf:
                    best_conf  = conf
                    best_name  = str(model.classes_[top_i])
                    best_probs = probs
            except Exception as e:
                print(f"[predict_mudra] {hand_label} error: {e}")
                continue

        # Build top-3 list for the Detect UI debug display
        top3 = []
        if best_probs is not None:
            idxs = np.argsort(best_probs)[::-1][:3]
            top3 = [
                {
                    "name": str(model.classes_[i]),
                    "conf": round(float(best_probs[i]) * 100.0, 1),
                }
                for i in idxs
            ]
        


        print(f"[predict_mudra] {best_name} ({best_conf:.1f}%)  top3={[t['name'] for t in top3]}")

        return jsonify({
            "name":       best_name,
            "confidence": round(best_conf, 1),
            "top3":       top3,
        })

    except Exception as e:
        print(f"[predict_mudra] Error: {e}")
        import traceback; traceback.print_exc()
        return jsonify({"name": "", "confidence": 0.0, "top3": []}), 500
# =============================================================================
# ENTRY POINT
# =============================================================================

# =============================================================================
# GHOST HAND EVALUATION
# =============================================================================
@app.route('/api/evaluate_session', methods=['POST'])
def evaluate_session():
    try:
        data = request.json
        landmarks = data.get('landmarks')
        active_mudras = [m.lower().strip() for m in data.get('activeMudras', [])]

        if not landmarks or len(landmarks) != 21:
            return jsonify({"error": "Invalid landmarks"}), 400

        lm_list = [LM(float(p['x']), float(p['y']), float(p['z'])) for p in landmarks]
        classes = list(model.classes_)

        # Try both hand orientations, collect all probs
        all_probs = []
        for hand_label in ('Right', 'Left'):
            try:
                feats = extract_features(lm_list, label=hand_label)
                probs = model.predict_proba([feats])[0]
                all_probs.append(probs)
            except Exception as e:
                print(f"[evaluate_session] {hand_label} error: {e}")

        if not all_probs:
            return jsonify({"matchedMudra": "", "score": 0, "status": "Incorrect / Not Detected", "detected": False})

        # Use the hand orientation with highest overall top confidence
        best_probs = max(all_probs, key=lambda p: float(max(p)))

        # If active_mudras specified, only score against those
        search_list = active_mudras if active_mudras else classes

        best_name = ""
        best_raw_conf = 0.0
        for m_name in search_list:
            if m_name not in classes:
                continue
            idx = classes.index(m_name)
            conf = float(best_probs[idx])
            if conf > best_raw_conf:
                best_raw_conf = conf
                best_name = m_name

        # Always normalize against ALL classes, then scale up
        # This keeps scores meaningful regardless of list size
        normalized_conf = best_raw_conf * 100.0

        # Boost: if the winner is clearly dominating among active mudras
        if active_mudras:
            active_sum = sum(
                float(best_probs[classes.index(m)])
                for m in active_mudras if m in classes
            )
            if active_sum > 0:
                subset_normalized = (best_raw_conf / active_sum) * 100.0
                # Take the higher of the two — raw or subset-normalized
                normalized_conf = max(normalized_conf, subset_normalized)

        score_pct = round(min(normalized_conf, 100.0), 1)

        # Also run geometry check for target mudra if only one target
        if len(active_mudras) == 1 and active_mudras[0] in MUDRA_REFERENCE_ANGLES:
            target_key = active_mudras[0]
            finger_angles = get_finger_angles_dict(lm_list)
            lm_wrapper = LMWrapper(lm_list)
            p_w = [lm_list[0].x, lm_list[0].y, lm_list[0].z]
            p_m = [lm_list[9].x, lm_list[9].y, lm_list[9].z]
            palm_size = get_distance(p_w, p_m) or 1.0
            _, geom_acc = get_corrections(target_key, finger_angles, lm_wrapper, palm_size)
            # Blend ML score (60%) + geometry (40%) for single-target mode
            score_pct = round((score_pct * 0.6) + (geom_acc * 0.4), 1)
            if best_name != target_key and geom_acc > score_pct:
                best_name = target_key

        status = "Correct" if score_pct >= 75 else \
                 "Needs Improvement" if score_pct >= 50 else \
                 "Incorrect / Not Detected"

        print(f"[evaluate_session] target={active_mudras} matched={best_name} score={score_pct}%")

        return jsonify({
            "matchedMudra": best_name,
            "score": score_pct,
            "status": status,
            "detected": bool(score_pct >= 50)
        })

    except Exception as e:
        print(f"[evaluate_session] Error: {e}")
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/predict_double', methods=['POST'])
def predict_double():
    if _double_model is None:
        return jsonify({
            "name": "Model not trained",
            "confidence": 0.0,
            "detected": False,
            "message": "Double-hand model (double_mudra_model.pkl) is missing. Please train it first."
        }), 503

    try:
        body = request.get_json(force=True)
        if not body or 'frame' not in body:
            return jsonify({"name": "", "confidence": 0.0, "detected": False}), 400

        img_data = base64.b64decode(body['frame'].split(',')[-1])
        nparr    = np.frombuffer(img_data, np.uint8)
        frame    = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return jsonify({"name": "", "confidence": 0.0, "detected": False})

        rgb   = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = hands_double.process(rgb)

        if not result.multi_hand_landmarks or len(result.multi_hand_landmarks) < 2:
            return jsonify({
                "name": "", "confidence": 0.0, "detected": False,
                "message": "Show both hands clearly"
            })

        lms_list = []
        for hand_lm in result.multi_hand_landmarks:
            lms_list.append([LM(lm.x, lm.y, lm.z) for lm in hand_lm.landmark])

        # Assign handedness
        hand_labels = {}
        for i, hand_info in enumerate(result.multi_handedness):
            hand_labels[i] = hand_info.classification[0].label  # 'Left' or 'Right'

        right_lm, left_lm = None, None
        for i, label in hand_labels.items():
            if label == 'Right':
                right_lm = lms_list[i]
            else:
                left_lm  = lms_list[i]

        # If both not detected cleanly, use positional fallback
        if right_lm is None and left_lm is None:
            return jsonify({"name": "", "confidence": 0.0, "detected": False})
        if right_lm is None: right_lm = left_lm
        if left_lm  is None: left_lm  = right_lm

        # Match signature: extract_double_features(left_landmarks, right_landmarks, ...)
        feats = extract_double_features(left_lm, right_lm)
        probs = _double_model.predict_proba([feats])[0]
        top_i = int(np.argmax(probs))
        name  = str(_double_model.classes_[top_i])
        conf  = round(float(probs[top_i]) * 100.0, 1)

        top3 = [
            {"name": str(_double_model.classes_[i]), "conf": round(float(probs[i]) * 100.0, 1)}
            for i in np.argsort(probs)[::-1][:3]
        ]

        print(f"[predict_double] {name} ({conf}%)")
        return jsonify({"name": name, "confidence": conf, "detected": conf >= 50, "top3": top3})

    except Exception as e:
        print(f"[predict_double] Error: {e}")
        return jsonify({"error": str(e)}), 500

def compute_double_geometric_score(target, right_lms, left_lms):
    """
    Returns a geometry-based accuracy score (0–100) for double-hand mudras.

    Uses raw JSON landmark dicts {"x":…, "y":…, "z":…} from the request body.
    Falls back to 50.0 on any error so the caller always gets a usable value.

    Landmark indices (MediaPipe 21-point skeleton [Ref 1]):
        0  = wrist          9  = mid-palm (metacarpal)
        8  = index tip     12  = middle tip
        16 = ring tip      20  = pinky tip
    """
    def p(lst, i):
        return (float(lst[i]['x']), float(lst[i]['y']))

    def d(a, b):
        return math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)

    def prox(dist, max_d):
        """Linear proximity: 0 apart → 100 %, max_d apart → 0 %."""
        return max(0.0, (max_d - dist) / max_d * 100.0)

    try:
        rW = p(right_lms,  0);  lW = p(left_lms,  0)   # wrists
        rI = p(right_lms,  8);  lI = p(left_lms,  8)   # index tips
        rM = p(right_lms, 12);  lM = p(left_lms, 12)   # middle tips
        rR = p(right_lms, 16);  lR = p(left_lms, 16)   # ring tips
        rP = p(right_lms, 20);  lP = p(left_lms, 20)   # pinky tips

        wd            = d(rW, lW)
        fingertip_avg = (d(rI, lI) + d(rM, lM) + d(rR, lR) + d(rP, lP)) / 4

        t = target

        # ── JOINED family ────────────────────────────────────────────────
        if t == 'anjali':
            # Palms pressed flat — primary signal is wrist proximity [Ref 3]
            p_score = prox(wd, 0.24)
            # Bonus: fingertips pointing upward (tip.y < wrist.y in normalised coords)
            r_up = 1.0 if rI[1] < rW[1] else 0.0
            l_up = 1.0 if lI[1] < lW[1] else 0.0
            return min(100.0, p_score * 0.85 + (r_up + l_up) * 7.5)

        elif t == 'kapotha':
            # Hollow pigeon — wrists edge-to-edge, slight gap at palm centre
            return prox(wd, 0.30)

        elif t == 'puspaputa':
            # Side-by-side cupped palms — wrists adjacent, slightly wider gap
            return prox(wd, 0.32)

        elif t == 'samputa':
            # Closed box — symmetric, very close
            return prox(wd, 0.26)

        elif t in ('sankha', 'chakra'):
            # Interlocked circular — moderate proximity
            return prox(wd, 0.28)

        # ── INTERLOCKED family ────────────────────────────────────────────
        elif t == 'karkata':
            # Fingers interdigitated — fingertip average distance is key
            return prox(fingertip_avg, 0.22)

        elif t in ('pasa', 'kilaka'):
            # Hooked index/pinky — single fingertip pair
            return prox(d(rI, lI), 0.20)

        # ── STACKED family ────────────────────────────────────────────────
        elif t == 'sivalinga':
            # Right fist ON left flat palm — clear vertical stack
            y_diff   = abs(rW[1] - lW[1])
            x_align  = max(0.0, (0.22 - abs(rW[0] - lW[0])) / 0.22 * 50)
            stk      = min(50.0, y_diff / 0.16 * 50)
            return min(100.0, stk + x_align)

        elif t in ('matsya', 'kurma', 'varaha'):
            # One hand on back of other — vertical proximity + mild stack
            y_diff  = abs(rW[1] - lW[1])
            p_score = prox(wd, 0.30)
            stk_b   = min(20.0, y_diff / 0.10 * 20)
            return min(100.0, p_score * 0.8 + stk_b)

        # ── CROSS/ARM family ──────────────────────────────────────────────
        elif t in ('svastika', 'garuda'):
            # Wrists crossed at centre
            return prox(wd, 0.20)

        elif t in ('utsanga', 'nagabandha', 'katva', 'bherunda',
                   'katakavardhana', 'kartarisvastika'):
            # Arms folded / crossed — slightly wider range
            return prox(wd, 0.38)

        # ── SPECIAL ───────────────────────────────────────────────────────
        elif t == 'dola':
            # Both hands hanging low — wrists should be in lower half of frame
            r_low = max(0.0, (rW[1] - 0.45) / 0.55 * 100)
            l_low = max(0.0, (lW[1] - 0.45) / 0.55 * 100)
            return min(100.0, (r_low + l_low) / 2)

        # ── Generic fallback ─────────────────────────────────────────────
        else:
            return prox(wd, 0.35)

    except Exception as e:
        print(f"[geo_score] Error for target='{target}': {e}")
        return 50.0   # safe fallback

@app.route('/api/detect_double_landmarks', methods=['POST'])
def detect_double_landmarks():
    """
    Target-verified double-hand detection for LearnDouble.jsx.

    Accuracy = 60 % ML confidence + 40 % geometric score [Ref 4].
    If ML predicts the wrong class but geometry is strong (≥ 68 %),
    we use geometry as an override so the user still gets feedback.

    Isolation: sets is_double_mode = True, which prevents single-hand EMA
    state from contaminating the double-hand pipeline (see run_madm guard).
    """
    global is_double_mode
    try:
        is_double_mode = True
        body       = request.get_json(force=True)
        left_lms   = body.get('left_landmarks',  [])
        right_lms  = body.get('right_landmarks', [])
        target     = body.get('targetMudra', '').lower().strip()

        # Normalise frontend names to model class names
        target = FRONTEND_TO_MODEL.get(target, target)

        # ── Mirroring fallback for overlapping / crossed-wrist mudras ─────
        # When both palms press together MediaPipe may only see one "blob".
        # We mirror the available hand so the ML model still receives a full
        # two-hand feature vector [Ref 2].
        OVERLAP_PRONE = [
            'anjali', 'kapotha', 'sivalinga', 'kartarisvastika', 'garuda',
            'svastika', 'nagabandha', 'puspaputa', 'samputa', 'sankha',
            'chakra', 'utsanga', 'bherunda', 'katakavardhana',
        ]
        if (not left_lms or not right_lms) and (left_lms or right_lms):
            if target in OVERLAP_PRONE:
                raw_pts  = left_lms if left_lms else right_lms
                mirrored = [{'x': 1.0 - p['x'], 'y': p['y'], 'z': p['z']} for p in raw_pts]
                if not left_lms:  left_lms  = mirrored
                if not right_lms: right_lms = mirrored

        if not left_lms or not right_lms:
            return jsonify({
                'detected': False, 'name': 'Missing Hand', 'confidence': 0,
                'accuracy': 0, 'corrections': ['Show both hands clearly'],
                'is_stable': False,
            })

        def to_pts(raw):
            return [LM(float(p['x']), float(p['y']), float(p['z'])) for p in raw]

        right_list = to_pts(right_lms)
        left_list  = to_pts(left_lms)

        # ── ML prediction ─────────────────────────────────────────────────
        feats   = extract_double_features(left_list, right_list)
        probs   = _double_model.predict_proba([feats])[0]
        classes = list(_double_model.classes_)
        top_i   = int(np.argmax(probs))
        name    = str(classes[top_i])
        conf    = round(float(probs[top_i]) * 100.0, 1)

        # Diagnostic: print top-3 every call
        top3_idx = np.argsort(probs)[::-1][:3]
        print(f"[detect_double] target={target!r} | ML top-3:", [
            f"{classes[i]}:{probs[i]*100:.0f}%" for i in top3_idx
        ])

        corrections = []
        raw_accuracy = 0.0

        # ── Geometric score (always computed for target, used as fallback) ─
        geo_score = compute_double_geometric_score(target, right_lms, left_lms) if target else 0.0

        if target:
            if name == target:
                # ML agrees: blend ML (60 %) + geometry (40 %) [Ref 4]
                raw_accuracy = round(min(conf * 0.60 + geo_score * 0.40, 100.0), 1)

            else:
                # ML disagrees — let geometry provide a rescue path
                if geo_score >= 50:
                    # Geometry strongly suggests the right mudra; rescue the detection.
                    # Blend: 75% Geometry + 25% AI (to respect the ML's uncertainty)
                    raw_accuracy = round(geo_score * 0.75 + conf * 0.25, 1)
                    corrections  = []   # suppress "wrong mudra" noise for strong rescues
                    print(f"[detect_double] Geo-Rescue: geo={geo_score:.1f}% AI={conf:.1f}% -> acc={raw_accuracy:.1f}%")
                elif geo_score >= 50:
                    # Geometry is partial — give limited credit
                    raw_accuracy = round(geo_score * 0.50, 1)
                else:
                    raw_accuracy = 0.0
                    corrections.insert(
                        0,
                        f"Wrong Mudra: Showing {name.capitalize()} instead of {target.capitalize()}"
                    )
        else:
            raw_accuracy = conf

        # ── Low-confidence safety gate (lowered 45 → 28) ─────────────────
        # Below 28 % ML confidence, rely on geometry alone
        if conf < 28:
            if target and geo_score >= 58:
                raw_accuracy = round(geo_score * 0.65, 1)
                corrections  = []
            else:
                raw_accuracy = 0.0

        # ── Asymmetric EMA smoothing (rise fast, fall slow) ───────────────
        st = SMOOTHING_REGISTRY["double"]
        if target != st["last_target"]:
            st["smooth_acc"]   = raw_accuracy
            st["prev_display"] = raw_accuracy
            st["last_target"]  = target

        if raw_accuracy > st["smooth_acc"]:
            st["smooth_acc"] = raw_accuracy
        else:
            alpha = 0.15
            st["smooth_acc"] = st["smooth_acc"] * (1.0 - alpha) + raw_accuracy * alpha

        # Guard rapid drops (max 3 % per frame)
        if st["smooth_acc"] < st["prev_display"]:
            st["smooth_acc"] = float(max(st["smooth_acc"], st["prev_display"] - 3.0))
        st["prev_display"] = st["smooth_acc"]

        accuracy = round(st["smooth_acc"], 1)

        # Noise floor: below 38 % is just noise [Ref 2]
        if accuracy < 38.0:
            accuracy = 0.0

        return jsonify({
            "detected":      conf >= 38.0 or geo_score >= 60.0,
            "name":          name,
            "confidence":    conf,
            "accuracy":      accuracy,
            "corrections":   corrections,
            "is_stable":     conf >= 72.0 or geo_score >= 72.0,
            "hold_progress": 0,
            "both_hands":    True
        })

    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f"[detect_double_landmarks] EXCEPTION:\n{tb}")
        return jsonify({
            "detected": False, "name": "", "confidence": 0,
            "accuracy": 0, "corrections": [f"Server error: {str(e)}"],
            "is_stable": False, "hold_progress": 0, "both_hands": False
        }), 500

if __name__ == '__main__':
    print("GestureIQ Flask API starting on http://0.0.0.0:5001")
    socketio.run(app, host='0.0.0.0', port=5001, debug=False,
                 allow_unsafe_werkzeug=True)