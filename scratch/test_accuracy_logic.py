import sys
import numpy as np

# Mocking the logic from flask_app.py
def calculate_accuracy(pred_name, target, raw_conf, num_classes, right_pts, left_pts, CROSS_MUDRAS, proba, model_classes):
    chance = 1.0 / max(num_classes, 1)
    accuracy = 0.0
    
    if target:
        if target not in model_classes:
            accuracy = max(0.0, (raw_conf - chance) / (1.0 - chance)) * 100
        elif pred_name == target:
            accuracy = max(0.0, (raw_conf - chance) / (1.0 - chance)) * 100
            if not (right_pts and left_pts) and target not in CROSS_MUDRAS:
                accuracy *= 0.7
        else:
            target_idx = model_classes.index(target)
            target_conf = float(proba[target_idx])
            if target_conf < (chance * 2):
                accuracy = 0.0
            else:
                accuracy = (target_conf / raw_conf) * 50
    else:
        accuracy = max(0.0, (raw_conf - chance) / (1.0 - chance)) * 100
        
    return round(min(100.0, accuracy), 1)

# Test cases
model_classes = ["anjali", "kapotha", "karkata"] # Simplified
num_classes = len(model_classes)
CROSS_MUDRAS = ["anjali"]

print("--- Accuracy Logic Tests ---")

# Case 1: Correct mudra, high confidence, both hands
res = calculate_accuracy("anjali", "anjali", 0.9, num_classes, True, True, CROSS_MUDRAS, [0.9, 0.05, 0.05], model_classes)
print(f"Correct (0.9 conf): {res}% (Expected: ~100%)")

# Case 2: Correct mudra, moderate confidence (0.4), both hands
res = calculate_accuracy("anjali", "anjali", 0.4, num_classes, True, True, CROSS_MUDRAS, [0.4, 0.3, 0.3], model_classes)
# chance = 1/3 = 0.333
# (0.4 - 0.333) / (1 - 0.333) = 0.066 / 0.666 = 0.1 -> 10%
print(f"Correct (0.4 conf): {res}% (Expected: ~10%)")

# Case 3: Correct mudra but missing a hand (not crossed)
res = calculate_accuracy("karkata", "karkata", 0.9, num_classes, True, False, CROSS_MUDRAS, [0.05, 0.05, 0.9], model_classes)
# (0.9 - 0.333) / 0.666 = 0.567 / 0.666 = 0.85 -> 85.1%
# 85.1 * 0.7 = 59.5%
print(f"Correct (0.9 conf, missing hand): {res}% (Expected: ~59.5%)")

# Case 4: Wrong mudra, target confidence is very low
res = calculate_accuracy("kapotha", "karkata", 0.8, num_classes, True, True, CROSS_MUDRAS, [0.1, 0.8, 0.1], model_classes)
# chance * 2 = 0.666. target_conf = 0.1. 0.1 < 0.666 -> 0%
print(f"Wrong (Target 0.1 conf): {res}% (Expected: 0.0%)")

# Case 5: Wrong mudra, target confidence is significant
res = calculate_accuracy("kapotha", "karkata", 0.6, num_classes, True, True, CROSS_MUDRAS, [0.1, 0.6, 0.3], model_classes)
# target_conf = 0.3. 0.3 >= 0.666 (wait, chance*2 is 0.666 for 3 classes. For 28 classes it is 0.07).
# Let's use 28 classes for a real test.
num_classes_28 = 28
chance_28 = 1.0 / 28 # 0.0357
# target_conf = 0.1. 0.1 >= 0.07 -> True.
# (0.1 / 0.6) * 50 = 8.3%
print(f"Wrong (Target 0.1 conf, 28 classes): {calculate_accuracy('kapotha', 'karkata', 0.6, 28, True, True, CROSS_MUDRAS, [0.1]*28, ['kapotha', 'karkata'] + ['other']*26)}% (Expected: 8.3%)")
