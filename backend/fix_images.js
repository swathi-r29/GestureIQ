const mongoose = require('mongoose');
const dotenv = require('dotenv');
const MudraContent = require('./models/MudraContent');

dotenv.config();

const fixImages = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ Connected to MongoDB');

        const mudras = await MudraContent.find({});
        console.log(`Found ${mudras.length} mudras to check.`);

        let updatedCount = 0;

        for (const mudra of mudras) {
            if (!mudra.primaryImage && mudra.images && mudra.images.length > 0) {
                // Remove extra spaces from image names if any
                const firstImage = mudra.images[0].trim();
                mudra.primaryImage = firstImage;
                await mudra.save();
                console.log(`✅ Updated ${mudra.mudraName}: Set primaryImage to ${firstImage}`);
                updatedCount++;
            }
        }

        console.log(`--- FINISHED ---`);
        console.log(`Updated ${updatedCount} mudras.`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during fix:', err);
        process.exit(1);
    }
};

fixImages();
