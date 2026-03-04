const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const MudraContent = require('../models/MudraContent');

dotenv.config({ path: path.join(__dirname, '../.env') });

const fixPaths = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const mudras = await MudraContent.find();

        const uploadsDir = path.join(__dirname, '../uploads/mudras');
        const undefinedBase = path.join(uploadsDir, 'undefined');
        const unknownBase = path.join(uploadsDir, 'unknown');

        for (const mudra of mudras) {
            // Process Images
            const mudraImgDir = path.join(uploadsDir, mudra.mudraName, 'images');
            if (!fs.existsSync(mudraImgDir)) fs.mkdirSync(mudraImgDir, { recursive: true });

            for (const img of mudra.images) {
                const targetPath = path.join(mudraImgDir, img);
                if (fs.existsSync(targetPath)) continue;

                const sources = [
                    path.join(undefinedBase, 'images', img),
                    path.join(unknownBase, 'images', img)
                ];

                for (const src of sources) {
                    if (fs.existsSync(src)) {
                        fs.renameSync(src, targetPath);
                        console.log(`[IMAGE] Moved ${img} to ${mudra.mudraName}`);
                        break;
                    }
                }
            }

            // Process Videos
            const mudraVidDir = path.join(uploadsDir, mudra.mudraName, 'videos');
            if (!fs.existsSync(mudraVidDir)) fs.mkdirSync(mudraVidDir, { recursive: true });

            for (const vid of mudra.videos) {
                const targetPath = path.join(mudraVidDir, vid);
                if (fs.existsSync(targetPath)) continue;

                const sources = [
                    path.join(undefinedBase, 'videos', vid),
                    path.join(unknownBase, 'videos', vid),
                    path.join(undefinedBase, vid), // Sometimes they are direct children
                    path.join(unknownBase, vid)
                ];

                for (const src of sources) {
                    if (fs.existsSync(src)) {
                        fs.renameSync(src, targetPath);
                        console.log(`[VIDEO] Moved ${vid} to ${mudra.mudraName}`);
                        break;
                    }
                }
            }
        }
        console.log('Relocation completed.');
        process.exit(0);
    } catch (err) {
        console.error('Error during relocation:', err);
        process.exit(1);
    }
};

fixPaths();
