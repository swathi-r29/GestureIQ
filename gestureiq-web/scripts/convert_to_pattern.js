// convert_to_pattern.js – reads dummy results.json and appends a pattern entry to natyamPatterns.json
import fs from 'fs';
import path from 'path';

// Expect: node scripts/convert_to_pattern.js <outDir> <label>
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node convert_to_pattern.js <outDir> <label>');
  process.exit(1);
}
const outDir = args[0];
const label = args[1];

const resultsPath = path.join(outDir, 'results.json');
if (!fs.existsSync(resultsPath)) {
  console.error(`results.json not found in ${outDir}`);
  process.exit(1);
}
const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

// Path to natyamPatterns.json (create if missing)
const patternsPath = path.join('src', 'data', 'natyamPatterns.json');
let patterns = [];
if (fs.existsSync(patternsPath)) {
  try {
    const existing = JSON.parse(fs.readFileSync(patternsPath, 'utf-8'));
    if (Array.isArray(existing)) patterns = existing;
  } catch (e) {
    console.warn('Failed to parse existing natyamPatterns.json, starting fresh');
  }
}

const newPattern = {
  label: label,
  outDir: outDir,
  results: results
};
patterns.push(newPattern);

fs.mkdirSync(path.dirname(patternsPath), { recursive: true });
fs.writeFileSync(patternsPath, JSON.stringify(patterns, null, 2), 'utf-8');
console.log(`Pattern '${label}' added to ${patternsPath}`);
