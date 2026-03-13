const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const MudraContent = require('./models/MudraContent');

dotenv.config({ path: path.join(__dirname, '.env') });

const checkMudras = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const mrigashira = await MudraContent.findOne({ mudraName: 'mrigashira' }).lean();
        const sarpashira = await MudraContent.findOne({ mudraName: 'sarpashira' }).lean();

        const result = {
            mrigashira,
            sarpashira
        };

        fs.writeFileSync('db_check_result.json', JSON.stringify(result, null, 2));
        console.log('Results saved to db_check_result.json');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkMudras();
