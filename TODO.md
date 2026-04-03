## GestureIQ 100% Working Detect/Learn Fix Plan

### Approved Plan Steps (User: OKKK)
1. ~~Explored files via search_files/read_file~~ (Detect.jsx, Learn.jsx, useVoiceGuide.jsx, flask_app.py, feature_engineering.py, test_webcam.py)
2. **Edit gestureiq-web/src/pages/Learn.jsx** → Add voice 5s cooldown + stable gate + 180ms loop (voice spam fix)
3. **Edit notebooks/test_webcam.py** → Lower conf 0.5 + backend /detect_landmarks call (detection fix)
4. **[Minor if needed] Edit useVoiceGuide.jsx** → Verify fromResult stable skip
5. **Test & Verify**
   - Backend: `cd notebooks && python flask_app.py`
   - Test cam: `cd notebooks && python test_webcam.py` (green Pataka)
   - Frontend: `cd gestureiq-web && npm run dev` → /detect, /learn (voice no-repeat, left/right hands)
6. **attempt_completion** → 100% working

**Progress: 2/6 (Learn.jsx ✅, test_webcam.py ✅) | Next: Test**

