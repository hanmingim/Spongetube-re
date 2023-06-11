import mongoose from 'mongoose';

mongoose.connect(process.env.DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: process.env.DB_NAME,

});

const db = mongoose.connection;

const handleOpen = () => console.log('✅ Connected to DB');
const handelError = (error) => console.log('❌ DB Error', error);
db.on('error', handelError);
db.once('open', handleOpen);