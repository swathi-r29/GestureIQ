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

const DOUBLE_HAND_MUDRAS = [
    'anjali', 'kapotha', 'karkata', 'svastika', 'dola', 'puspaputa', 'utsanga', 'sivalinga', 
    'katakavardhana', 'kartarisvastika', 'sakata', 'sankha', 'chakra', 'samputa', 'pasa', 
    'kilaka', 'matsya', 'kurma', 'varaha', 'garuda', 'nagabandha', 'bherunda', 'katva'
];

const upsertMudra = async (name, type) => {
    let mudra = await MudraContent.findOne({ mudraName: name });
    if (!mudra) {
        mudra = new MudraContent({
            mudraName: name,
            handType: type
        });
        await mudra.save();
        console.log(`Seeded: ${name} (${type})`);
    } else if (mudra.handType !== type) {
        mudra.handType = type;
        await mudra.save();
        console.log(`Updated handType for: ${name} to ${type}`);
    }
};

const seedMudras = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for seeding...');

        // Seed Single Hand Mudras
        for (const name of SINGLE_HAND_MUDRAS) {
            await upsertMudra(name, 'single');
        }

        // Seed Double Hand Mudras
        for (const name of DOUBLE_HAND_MUDRAS) {
            await upsertMudra(name, 'double');
        }

        console.log('Seeding completed.');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding mudras:', err.message);
        process.exit(1);
    }
};

seedMudras();
