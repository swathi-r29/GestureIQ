// process_youtube.js – minimal placeholder that extracts frames (stub) and writes dummy results.json
import fs from 'fs';
import path from 'path';

// Simple argument parser
const args = process.argv.slice(2);
let outDir = null;
let fps = 2;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--outDir' && i + 1 < args.length) {
    outDir = args[i + 1];
    i++;
  } else if (args[i] === '--fps' && i + 1 < args.length) {
    fps = parseInt(args[i + 1]);
    i++;
  }
}
if (!outDir) {
  console.error('Missing --outDir');
  process.exit(1);
}
// Ensure output directory exists
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
// Copy source video if present
const sourceVideo = path.resolve('src/data/raw_videos/source.mp4');
if (fs.existsSync(sourceVideo)) {
  const destVideo = path.join(outDir, path.basename(sourceVideo));
  fs.copyFileSync(sourceVideo, destVideo);
}
// Dummy results: a single frame with empty landmarks array
const dummyResults = [{ frame: 0, landmarks: [] }];
fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(dummyResults, null, 2));
console.log(`Dummy results written to ${path.join(outDir, 'results.json')}`);
