import pickle
import os

model_path = "models/double_mudra_model.pkl"
if os.path.exists(model_path):
    with open(model_path, "rb") as f:
        model = pickle.load(f)
    print("Model type:", type(model))
    # Check if CalibratedClassifierCV
    if hasattr(model, "estimator"):
        print("Calibrated estimator:", model.estimator)
    
    # Check classes
    print("Classes:", list(model.classes_))
    # Let's inspect individual estimators if available
    if hasattr(model, "calibrated_classifiers_"):
        first_cal = model.calibrated_classifiers_[0]
        base_estimator = first_cal.estimator
        print("Base estimator classes:", list(base_estimator.classes_))
        print("Base estimator features:", base_estimator.n_features_in_)
    else:
        # Check n_features_in_ directly if available
        if hasattr(model, "n_features_in_"):
            print("Features in:", model.n_features_in_)
        elif hasattr(model, "estimator") and hasattr(model.estimator, "n_features_in_"):
            print("Features in estimator:", model.estimator.n_features_in_)
else:
    print("Model file not found!")
