const mongoose = require('mongoose');
const dotenv = require('dotenv');
const MudraContent = require('./models/MudraContent');

dotenv.config();

const SINGLE_HAND_MUDRAS = [
    'pataka', 'tripataka', 'ardhapataka', 'kartarimukha', 'mayura', 'ardhachandra', 'arala', 'shukatunda',
    'mushti', 'shikhara', 'kapittha', 'katakamukha', 'suchi', 'chandrakala', 'padmakosha', 'sarpashira',
    'mrigashira', 'simhamukha', 'kangula', 'alapadma', 'chatura', 'bhramara', 'hamsasya', 'hamsapaksha',
    'sandamsha', 'mukula', 'tamrachuda', 'trishula'
];

const seedMudras = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for seeding...');

        for (const name of SINGLE_HAND_MUDRAS) {
            let mudra = await MudraContent.findOne({ mudraName: name });
            if (!mudra) {
                mudra = new MudraContent({
                    mudraName: name,
                    handType: 'single'
                });
                await mudra.save();
                console.log(`Seeded: ${name}`);
            } else if (!mudra.handType) {
                mudra.handType = 'single';
                await mudra.save();
                console.log(`Updated handType for: ${name}`);
            }
        }

        console.log('Seeding completed.');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding mudras:', err.message);
        process.exit(1);
    }
};

seedMudras();
