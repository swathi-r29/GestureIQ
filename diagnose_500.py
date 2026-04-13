
import sys, os
import json
import numpy as np
from flask import Flask, jsonify

# Setup paths
sys.path.append(os.path.abspath('.'))
sys.path.append(os.path.abspath('./notebooks'))

# mock flask request
class MockRequest:
    def get_json(self, force=True):
        return {
            'right_landmarks': [{'x': 0.5, 'y': 0.5, 'z': 0.0}] * 21,
            'left_landmarks': [{'x': 0.5, 'y': 0.5, 'z': 0.0}] * 21,
            'targetMudra': 'anjali'
        }

# Import the app to get global variables initialized
import flask_app

# Set up global state like in the app
flask_app._load_double_model()

def run_test():
    print("--- DIAGNOSTIC START ---")
    try:
        from flask import request
        # We need a dummy flask context to call the route
        app = Flask(__name__)
        # Test Case 2: One hand missing
        with app.test_request_context(
            path='/api/detect_double_landmarks',
            method='POST',
            data=json.dumps({
                'right_landmarks': [{'x': 0.5, 'y': 0.5, 'z': 0.0}] * 21,
                'left_landmarks':  None,
                'targetMudra':     'anjali'
            }),
            content_type='application/json'
        ):
            print("\n--- TEST CASE: LEFT HAND MISSING ---")
            response = flask_app.detect_double_landmarks()
            print("Response Status:", response[1] if isinstance(response, tuple) else 200)
            print("Response Body:", response[0].get_json() if isinstance(response, tuple) else response.get_json())
            
    except Exception as e:
        import traceback
        traceback.print_exc()
    print("--- DIAGNOSTIC END ---")

if __name__ == "__main__":
    run_test()
