const mongoose = require("mongoose")


async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log("Database connected Successful");

    } catch (error) {
        console.error("Error connecting to database:", error);
    }
}


module.exports = connectDB 