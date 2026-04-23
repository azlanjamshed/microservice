const mongoose = require("mongoose")

const addressSchema = new mongoose.Schema({
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String,
    phone: String,
    isDefault: {
        type: Boolean,
        default: false
    }
}, { _id: true })



const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        select: false,

    },
    fullName: {
        firstName: {
            type: String,
            required: true
        },
        lastName: {
            type: String,
            required: true
        }
    },
    role: {
        type: String,
        enum: ['user', 'seller'],
        default: 'user'
    },
    addresses: {
        type: [addressSchema],
        default: []
    }
})


const userModel = mongoose.model("user", userSchema)

module.exports = userModel;
