const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const MudraContent = require('../models/MudraContent');

dotenv.config({ path: path.join(__dirname, '../.env') });

const SRC_DIR = 'd:/GestureIQ/crt images';
const DEST_BASE = path.join(__dirname, '../uploads/mudras');

const MAPPINGS = {
    'anjali': [/anjali/i],
    'kapotha': [/kapotha/i],
    'karkata': [/karkata/i],
    'svastika': [/svastika/i],
    'dola': [/dola/i],
    'puspaputa': [/pushpaputa/i],
    'utsanga': [/utsanga/i],
    'sivalinga': [/shivalinga/i],
    'katakavardhana': [/katakavardhana/i],
    'kartarisvastika': [/kartarisvastika/i],
    'sakata': [/sakata/i],
    'sankha': [/shanka/i],
    'chakra': [/chakra/i],
    'samputa': [/samputa/i],
    'pasa': [/pasha/i],
    'kilaka': [/kilaka/i],
    'matsya': [/matsya/i],
    'kurma': [/kurma/i],
    'varaha': [/varaha/i],
    'garuda': [/garuda/i],
    'nagabandha': [/nagabandha/i],
    'bherunda': [/berunda/i],
    'katva': [/katva/i]
};

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB...');

        const files = fs.readdirSync(SRC_DIR);

        for (const [mudra, regexes] of Object.entries(MAPPINGS)) {
            const match = files.find(f => regexes.some(re => re.test(f)));
            if (match) {
                const destDir = path.join(DEST_BASE, mudra, 'images');
                if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

                const destPath = path.join(destDir, match);
                fs.copyFileSync(path.join(SRC_DIR, match), destPath);
                console.log(`Copied ${match} -> ${mudra}/images/`);

                await MudraContent.findOneAndUpdate(
                    { mudraName: mudra },
                    { 
                        primaryImage: match,
                        images: [match],
                        handType: 'double'
                    }
                );
                console.log(`Updated DB for ${mudra}`);
            } else {
                console.warn(`No image found for ${mudra}`);
            }
        }

        console.log('Import completed.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
