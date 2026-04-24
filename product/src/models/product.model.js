const mongoose = require("mongoose")

const productSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    Description: {
        type: String
    },
    Price: {
        amount: { type: Number, required: true },
        country: {
            type: String,
            enum: ["USD", "INR"],
            default: "INR"
        }
    },
    Seller: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    images: [{
        url: String,
        thumbnail: String,
        id: String
    }]

})
productSchema.index({ title: "text", Description: "text" })
const Product = mongoose.model("Product", productSchema)

module.exports = Product;