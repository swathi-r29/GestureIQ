const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const classes = await mongoose.connection.db.collection('liveclasses').find({ status: 'live' }).toArray();
    console.log('Live Classes:', classes.map(c => ({ id: c._id, classId: c.classId, title: c.title, status: c.status })));
    
    const classesAll = await mongoose.connection.db.collection('liveclasses').find({}).toArray();
    console.log('All Classes Statuses:', classesAll.map(c => ({ classId: c.classId, title: c.title, status: c.status })));
    
    process.exit(0);
  });
