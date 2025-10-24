// /server/config/db.js

const mongoose = require('mongoose');

// Get MONGO_URI from the environment variables (loaded by dotenv)
const MONGO_URI = process.env.MONGO_URI;

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
        });
        console.log('PocketLancer MongoDB Connected...');
    } catch (err) {
        console.error(`MongoDB Connection Error: ${err.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;