const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI;
console.log('Connecting to:', mongoUri);

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('Connected!');
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (let c of collections) {
      const docs = await mongoose.connection.db.collection(c.name).find({}).toArray();
      console.log(`Collection "${c.name}": ${docs.length} documents`);
      if (docs.length > 0) {
        console.log('Sample:', docs[0]);
      }
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
