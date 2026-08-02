"""
generate_html_report.py — Generates a visual HTML dashboard report from comparison JSON.
"""

import json
import sys
import os

def generate_html_dashboard(json_path="report.json", html_output="report.html"):
    if not os.path.exists(json_path):
        print(f"Error: JSON file '{json_path}' not found.")
        return

    with open(json_path, "r") as f:
        data = json.load(f)

    score = data.get("overall_posture_match", 0)
    score_color = "#27ae60" if score >= 85 else ("#f39c12" if score >= 70 else "#e74c3c")
    
    rows = ""
    for item in data.get("deviations_timeline", []):
        issues_str = "<br>".join([f"• {issue}" for issue in item.get("issues", [])])
        m_angle = item.get("master_knee_angle", "N/A")
        s_angle = item.get("student_knee_angle", "N/A")
        item_score = item.get("similarity_score", 0)
        item_color = "#e74c3c" if item_score < 60 else "#f39c12"
        
        rows += f"""
        <tr>
            <td><strong>{item.get('timestamp')}</strong></td>
            <td><span style="color: {item_color}; font-weight: bold;">{item_score}%</span></td>
            <td>{m_angle}°</td>
            <td>{s_angle}°</td>
            <td style="color: #c0392b;">{issues_str}</td>
        </tr>
        """

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Posture Comparison Analytics Report</title>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #faf7f2; color: #2c1a0e; margin: 0; padding: 40px; }}
        .container {{ max-width: 900px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }}
        h1 {{ color: #7b1c1c; font-size: 28px; margin-bottom: 8px; }}
        .subtitle {{ color: #856040; font-size: 14px; margin-bottom: 24px; }}
        .score-card {{ display: flex; gap: 20px; background: #fbf7ef; padding: 24px; border-radius: 12px; border: 1px solid #ede3cc; margin-bottom: 30px; align-items: center; }}
        .badge {{ font-size: 48px; font-weight: bold; color: {score_color}; font-family: Georgia, serif; }}
        .details {{ flex: 1; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 16px; }}
        th, td {{ padding: 12px 16px; text-align: left; border-bottom: 1px solid #eee; font-size: 13.5px; }}
        th {{ background: #7b1c1c; color: #ffffff; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; }}
        tr:nth-child(even) {{ background: #fafafa; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Bharatanatyam Posture Comparison Analytics</h1>
        <div class="subtitle">Master Video: <strong>{data.get('master_video')}</strong> | Student Video: <strong>{data.get('student_video')}</strong></div>
        
        <div class="score-card">
            <div class="badge">{score}%</div>
            <div class="details">
                <h3 style="margin:0 0 6px 0; color:#7b1c1c;">Overall Posture Alignment Match</h3>
                <p style="margin:0; color:#6b3a2a; font-size:13px;">
                    Analyzed <strong>{data.get('analyzed_frames')}</strong> frames across performance clip. Found <strong>{data.get('significant_deviations_count')}</strong> deviation moments needing posture adjustment.
                </p>
            </div>
        </div>

        <h3 style="color:#7b1c1c; margin-top:30px;">Frame-by-Frame Posture Deviation Timeline</h3>
        <table>
            <thead>
                <tr>
                    <th>Timestamp</th>
                    <th>Match Score</th>
                    <th>Master Knee Angle</th>
                    <th>Student Knee Angle</th>
                    <th>Coaching Feedback & Correction</th>
                </tr>
            </thead>
            <tbody>
                {rows}
            </tbody>
        </table>
    </div>
</body>
</html>
"""

    with open(html_output, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"[OK] Visual HTML report generated: {html_output}")

if __name__ == "__main__":
    json_in = sys.argv[1] if len(sys.argv) > 1 else "report.json"
    html_out = sys.argv[2] if len(sys.argv) > 2 else "report.html"
    generate_html_dashboard(json_in, html_out)
