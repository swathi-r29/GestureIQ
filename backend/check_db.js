const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI;
console.log('Connecting to:', mongoUri);

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('Connected!');
    const classes = await mongoose.connection.db.collection('classes').find({}).toArray();
    console.log('Classes:', classes.map(c => ({ id: c._id, title: c.title, status: c.status, code: c.code })));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
