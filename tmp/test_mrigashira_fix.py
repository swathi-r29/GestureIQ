import sys
import os

# Add the notebooks directory to the path so we can import from flask_app
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), 'notebooks')))

# We need to mock some things to import and run get_corrections
from flask_app import get_corrections

# Mock current angles for a CORRECT Mrigashira
# Thumb: Straight (~175), Index: Bent (~70), Middle: Bent (~70), Ring: Bent (~70), Pinky: Straight (~175)
correct_angles = {
    'thumb': 170.0,
    'index': 75.0,
    'middle': 72.0,
    'ring': 71.0,
    'pinky': 172.0
}

# Run corrections
deviations, accuracy = get_corrections("mrigashira", correct_angles)

print(f"Correct Gesture Test:")
print(f"Accuracy: {accuracy}%")
print(f"Deviations: {deviations}")

# Mock current angles for an INCORRECT Mrigashira (old expected one: index/middle straight)
incorrect_angles = {
    'thumb': 60.0,
    'index': 175.0,
    'middle': 175.0,
    'ring': 60.0,
    'pinky': 60.0
}

deviations_inc, accuracy_inc = get_corrections("mrigashira", incorrect_angles)

print(f"\nIncorrect Gesture Test (Old wrong pattern):")
print(f"Accuracy: {accuracy_inc}%")
print(f"Deviations: {deviations_inc}")
