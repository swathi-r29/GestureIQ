
import json
from flask import Flask, request, jsonify
import sys, os

# Setup paths
sys.path.append(os.path.abspath('./notebooks'))

import flask_app

def test_get_voice():
    print("--- DIAGNOSTIC: /api/get_voice ---")
    app = Flask(__name__)
    
    # Test cases: different languages
    languages = ['en', 'ta', 'hi']
    
    for lang in languages:
        print(f"\nTesting lang: {lang}")
        with app.test_request_context(
            path='/api/get_voice',
            method='POST',
            data=json.dumps({'text': 'Hello world' if lang=='en' else 'வணக்கம்' if lang=='ta' else 'नमस्ते', 'lang': lang}),
            content_type='application/json'
        ):
            try:
                response = flask_app.get_voice()
                status_code = 200
                if isinstance(response, tuple):
                    status_code = response[1]
                    body = response[0].get_json()
                else:
                    body = response.get_json()
                
                print(f"Status: {status_code}")
                if status_code == 500:
                    print(f"Error Body: {body}")
                else:
                    print(f"Success: Audio length {len(body.get('audio', ''))} chars")
            except Exception as e:
                import traceback
                traceback.print_exc()

if __name__ == "__main__":
    test_get_voice()
