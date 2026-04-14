import numpy as np

def calculate_accuracy(pred_name, target, proba, model_classes):
    num_classes = len(model_classes)
    chance = 1.0 / max(num_classes, 1)
    
    # Base proportional scaling
    raw_conf = float(proba[model_classes.index(pred_name)])
    if target and target in model_classes:
        target_idx = model_classes.index(target)
        target_conf = float(proba[target_idx])
        
        if pred_name == target:
            accuracy = max(0.0, (raw_conf - chance) / (1.0 - chance)) * 100
        else:
            if target_conf < (chance * 2):
                accuracy = 0.0
            else:
                accuracy = (target_conf / raw_conf) * 50
    else:
        accuracy = max(0.0, (raw_conf - chance) / (1.0 - chance)) * 100
        
    accuracy = round(min(100.0, accuracy), 1)
    
    # NEW: Relative Confidence Boost
    if target and target in model_classes and pred_name == target:
        sorted_probs = np.sort(proba)
        top1 = sorted_probs[-1]
        top2 = sorted_probs[-2] if len(sorted_probs) > 1 else 0.0
        conf_gap = top1 - top2
        
        if conf_gap > 0.15:
            accuracy = max(accuracy, 85.0 + (conf_gap * 10))
            accuracy = round(min(99.0, accuracy), 1)
            
    return accuracy

# Test Cases
model_classes = ["anjali", "karkata", "other"]
print("--- Relative Confidence Boost Tests ---")

# Case 1: Low raw conf but clear winner
# top1 = 0.4, top2 = 0.1, gap = 0.3. chance = 0.33
# base_acc = (0.4 - 0.33) / (1 - 0.33) = 0.1 -> 10%
# Boos should jump it to 85+ (0.3*10) = 88%
res = calculate_accuracy("karkata", "karkata", [0.1, 0.4, 0.5], model_classes) # Wait, pred_name must be target
res = calculate_accuracy("karkata", "karkata", [0.1, 0.6, 0.3], model_classes)
# top1 = 0.6, top2 = 0.3, gap = 0.3.
# base_acc = (0.6 - 0.33) / 0.66 = 0.27 / 0.66 = 40.9%
# Boost: max(40.9, 85 + 3) = 88%
print(f"Clear Winner (0.6 vs 0.3): {res}% (Expected: ~88%)")

# Case 2: Close race
# top1 = 0.4, top2 = 0.35, gap = 0.05. No boost.
res = calculate_accuracy("karkata", "karkata", [0.25, 0.4, 0.35], model_classes)
# base_acc = (0.4 - 0.33) / 0.66 = 10.6%
print(f"Close Race (0.4 vs 0.35): {res}% (Expected: ~10.6%)")

# Case 3: High raw confidence
# top1 = 0.95, top2 = 0.03, gap = 0.92
# base_acc = (0.95 - 0.33) / 0.66 = 93.9%
# Boost: max(93.9, 85 + 9.2) = 94.2% -> capped at 99.0
res = calculate_accuracy("karkata", "karkata", [0.02, 0.95, 0.03], model_classes)
print(f"High Conf (0.95): {res}% (Expected: >90%)")
