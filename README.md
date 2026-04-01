# GestureIQ

GestureIQ is an AI-powered platform for learning and monitoring Bharatanatyam Mudras (hand gestures) using computer vision.

## Project Structure

- `backend/`: Node.js/Express server for authentication, user management, and live class coordination.
- `gestureiq-web/`: React/Vite frontend for students and admins.
- `notebooks/`: Python scripts for data collection, model training, and the Flask detection service.
- `models/`: Trained machine learning models (e.g., `mudra_model.pkl`).

## How to Run the Application

To run the full application, you need to start three separate services.

### 1. Backend (Node.js)
The backend handles authentication and database interactions.

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Install dependencies (if not already done):
    ```bash
    npm install
    ```
3.  Start the server:
    ```bash
    npm run dev
    ```
    The backend will run on `http://localhost:5000`.

### 2. Detection Service (Python/Flask)
The detection service processes camera frames to identify Mudras.

1.  Ensure you have Python installed.
2.  Navigate to the notebooks directory:
    ```bash
    cd notebooks
    ```
3.  Install required Python packages:
    ```bash
    pip install flask flask-cors opencv-python mediapipe numpy
    ```
4.  Start the Flask app:
    ```bash
    python flask_app.py
    ```
    The detection service will run on `http://localhost:5000` (Note: Ensure this doesn't conflict with the Node.js backend if both are on the same port. The Flask app usually defaults to 5000, while the Node backend is configured for the same in `.env`. You may need to change one of them if they conflict).

### 3. Frontend (React/Vite)
The frontend is the main user interface.

1.  Navigate to the web directory:
    ```bash
    cd gestureiq-web
    ```
2.  Install dependencies (if not already done):
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
    The application will be accessible at `http://localhost:5173`.

---

## Technical Details

- **Frontend**: React, Vite, Tailwind CSS, Lucide Icons.
- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT.
- **AI/ML**: Python, OpenCV, MediaPipe, Scikit-Learn (Pickle).
