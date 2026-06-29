import os

# Define files to include in full
FILES_TO_INCLUDE = {
    # 2. Flask App specifically
    "notebooks/flask_app.py": "2. Flask App (notebooks/flask_app.py)",
    
    # 3. Every other Python file in the backend/AI service
    "utils/feature_engineering.py": "3. AI Service - Feature Engineering (utils/feature_engineering.py)",
    "utils/double_feature_engineering.py": "3. AI Service - Double Feature Engineering (utils/double_feature_engineering.py)",
    "notebooks/train_mudra_model_fixed.py": "3. AI Service - Mudra Model Training (notebooks/train_mudra_model_fixed.py)",
    "notebooks/train_double_mudra_model.py": "3. AI Service - Double Mudra Model Training (notebooks/train_double_mudra_model.py)",
    "notebooks/generate_mudra_library.py": "3. AI Service - Mudra Library Generator (notebooks/generate_mudra_library.py)",
    "notebooks/test_predict.py": "3. AI Service - Predict Test Script (notebooks/test_predict.py)",
    "notebooks/test_webcam.py": "3. AI Service - Webcam Test Script (notebooks/test_webcam.py)",
    
    # 4. Backend (Node.js/Express) files
    "backend/server.js": "4. Node.js Backend Server (backend/server.js)",
    
    # 5. gestureiq-web/src files
    "gestureiq-web/src/pages/Detect.jsx": "5. Live Detection Page (gestureiq-web/src/pages/Detect.jsx)",
    "gestureiq-web/src/pages/Learn.jsx": "5. Practice/Learn Page (gestureiq-web/src/pages/Learn.jsx)",
    "gestureiq-web/src/pages/LearnDouble.jsx": "5. Practice/Learn Double Hands Page (gestureiq-web/src/pages/LearnDouble.jsx)",
    "gestureiq-web/src/pages/StudentLiveClass.jsx": "5. Student Live Class Page (gestureiq-web/src/pages/StudentLiveClass.jsx)",
    "gestureiq-web/src/utils/socket.js": "5. Socket.io Client Setup (gestureiq-web/src/utils/socket.js)",
    "gestureiq-web/src/utils/constants.js": "5. Frontend Constants (gestureiq-web/src/utils/constants.js)",
    "gestureiq-web/src/utils/geometricRules.js": "5. Geometric Rules Scoring (gestureiq-web/src/utils/geometricRules.js)",
    
    # 6. Requirements and package.json
    "requirements.txt": "6. Python Requirements (requirements.txt)",
    "backend/package.json": "6. Node Backend package.json (backend/package.json)",
    "gestureiq-web/package.json": "6. Frontend package.json (gestureiq-web/package.json)",
    
    # 8. Config files
    "backend/.env": "8. Node Backend Environment Variables (backend/.env)",
    "gestureiq-web/.env": "8. Frontend Environment Variables (gestureiq-web/.env)",
    "gestureiq-web/vite.config.mjs": "8. Vite Config (gestureiq-web/vite.config.mjs)",
    "gestureiq-web/tailwind.config.js": "8. Tailwind CSS Config (gestureiq-web/tailwind.config.js)"
}

def generate_dir_tree(startpath):
    tree_lines = []
    exclude_dirs = {'.git', 'node_modules', 'venv', '__pycache__'}
    skip_extensions = {'.jpg', '.jpeg', '.png', '.mp4', '.avi', '.pkl', '.zip'}
    
    for root, dirs, files in os.walk(startpath):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        level = root.replace(startpath, '').count(os.sep)
        indent = ' ' * 4 * level
        
        path_parts = root.split(os.sep)
        is_large_media_dir = any(x in path_parts for x in ('dataset', 'crt images', 'tmp'))
        
        tree_lines.append('{}{}/'.format(indent, os.path.basename(root) or startpath))
        
        subindent = ' ' * 4 * (level + 1)
        if is_large_media_dir:
            media_files = [f for f in files if os.path.splitext(f)[1].lower() in skip_extensions]
            other_files = [f for f in files if os.path.splitext(f)[1].lower() not in skip_extensions]
            for f in other_files:
                tree_lines.append('{}{}'.format(subindent, f))
            if media_files:
                tree_lines.append('{}[... {} media/dataset files ...]'.format(subindent, len(media_files)))
        else:
            for f in files:
                if os.path.splitext(f)[1].lower() in skip_extensions:
                    continue
                tree_lines.append('{}{}'.format(subindent, f))
                
    return '\n'.join(tree_lines)

def list_non_py_files():
    result = []
    folders = ['models', 'notebooks']
    for folder in folders:
        if os.path.exists(folder):
            result.append(f"### Folder: {folder}")
            for root, dirs, files in os.walk(folder):
                for f in files:
                    if not f.endswith('.py') and '__pycache__' not in root:
                        path = os.path.join(root, f)
                        size_bytes = os.path.getsize(path)
                        # Format size in MB or KB
                        if size_bytes > 1024 * 1024:
                            size_str = f"{size_bytes / (1024 * 1024):.2f} MB"
                        else:
                            size_str = f"{size_bytes / 1024:.2f} KB"
                        result.append(f"- `{f}` ({size_str})")
            result.append("")
    return '\n'.join(result)

def list_routes():
    route_dir = "backend/routes"
    routes = []
    if os.path.exists(route_dir):
        for f in os.listdir(route_dir):
            if f.endswith('.js'):
                routes.append(f"- `backend/routes/{f}`")
    return '\n'.join(routes)

def main():
    report_path = r"C:\Users\HP\.gemini\antigravity-ide\brain\438904b6-2992-474b-ac1d-61b0a38406ce\technical_survey_report.md"
    
    with open(report_path, "w", encoding="utf-8") as out:
        out.write("# GestureIQ Repository Technical Survey Report\n\n")
        out.write("This report contains a complete technical survey of the GestureIQ repository. It includes directory trees, route lists, file specifications, and verbatim contents of all requested code/configuration files.\n\n")
        
        # 1. Directory Tree
        print("Generating directory tree...")
        out.write("## 1. Full Directory Tree\n\n")
        out.write("```text\n")
        out.write(generate_dir_tree("."))
        out.write("\n```\n\n")
        
        # 4. List of all route files (Pre-requisite for route section)
        out.write("## 4. Backend Route Files (Express)\n\n")
        out.write("Here is the list of all route files in the backend service:\n\n")
        out.write(list_routes())
        out.write("\n\n")
        
        # 7. Non-py files in models/notebooks
        out.write("## 7. Non-Python Files in models/ and notebooks/\n\n")
        out.write(list_non_py_files())
        out.write("\n")
        
        # Code sections
        out.write("## Code and Configuration Files (Verbatim)\n\n")
        
        for filepath, title in FILES_TO_INCLUDE.items():
            print(f"Adding file: {filepath}...")
            out.write(f"### {title}\n\n")
            
            if not os.path.exists(filepath):
                out.write(f"*File not found: {filepath}*\n\n")
                continue
                
            out.write(f"**Path**: `{filepath}`\n\n")
            
            # Determine language for markdown code blocks
            ext = os.path.splitext(filepath)[1].lower()
            lang = "python"
            if ext in (".js", ".json"):
                lang = "javascript" if ext == ".js" else "json"
            elif ext == ".jsx":
                lang = "jsx"
            elif ext == ".txt":
                lang = "text"
            elif filepath.endswith(".env"):
                lang = "properties"
                
            out.write(f"```{lang}\n")
            try:
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                out.write(content)
            except Exception as e:
                out.write(f"Error reading file: {str(e)}")
            out.write("\n```\n\n")
            
    print(f"Report generated successfully at: {report_path}")

if __name__ == "__main__":
    main()
