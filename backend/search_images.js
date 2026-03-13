const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const MudraContent = require('./models/MudraContent');

dotenv.config({ path: path.join(__dirname, '.env') });

const searchImages = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const mudras = await MudraContent.find({});
        
        console.log(`Checking ${mudras.length} mudras...`);
        
        for (const mudra of mudras) {
            const inImages = mudra.images.some(img => img.includes('sarapashira'));
            const inPrimary = mudra.primaryImage && mudra.primaryImage.includes('sarapashira');
            
            if (inImages || inPrimary) {
                console.log(`FOUND in mudra: ${mudra.mudraName}`);
                console.log(`Primary Image: ${mudra.primaryImage}`);
                console.log(`Images: ${JSON.stringify(mudra.images, null, 2)}`);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

searchImages();
