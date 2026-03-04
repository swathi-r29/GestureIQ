const mongoose = require('mongoose');
const dotenv = require('dotenv');
const MudraContent = require('./models/MudraContent');

dotenv.config();

const checkMudra = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const mudra = await MudraContent.findOne({ mudraName: 'pataka' });
        if (mudra) {
            console.log('--- PATAKA DATA ---');
            console.log('Name:', mudra.mudraName);
            console.log('Primary Image:', mudra.primaryImage);
            console.log('Images:', mudra.images);
            console.log('--- END ---');
        } else {
            console.log('Mudra "pataka" not found');
        }
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

checkMudra();
