const { mongoose } = require("mongoose");
const productSchema = require("../models/product.model")

const { uploadMultipleFiles } = require("../services/imagekit.service")

async function createProduct(req, res) {

    try {
        const { title, Description, priceAmount, priceCurrency = 'INR' } = req.body;
        if (!title || !priceAmount) {
            return res.status(400).json({ message: "Title and price amount are required." });
        }
        const seller = req.user.id;
        const price = {
            amount: Number(priceAmount),
            country: priceCurrency
        }
        let images = []
        const files = Array.isArray(req.files) ? req.files : (req.files?.images || []);
        for (const file of files) {
            const uploaded = await uploadMultipleFiles([file]);
            images.push(...uploaded);
        }

        const product = await productSchema.create({
            title,
            Description,
            Price: price,
            Seller: seller,
            images
        });

        return res.status(201).json({ message: "Product created successfully.", product });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error"
        })
    }
}
async function getProductBySeller(req, res) {
    try {
        const seller = req.user.id;
        const { skip = 0, limit = 20 } = req.query
        const products = await productSchema.find({ Seller: seller }).skip(Number(skip)).limit(Math.min(Number(limit), 20))
        return res.status(200).json({
            message: "Seller products fetched successfully",
            products,
            sellerId: seller
        })

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error"
        })
    }
}

async function getProduct(req, res) {
    const { q, minPrice, maxPrice, skip = 0, limit = 20 } = req.query;
    const filter = {};
    if (q) {
        filter.$text = { $search: q };
    }
    if (minPrice || maxPrice) {
        filter["Price.amount"] = {};
        if (minPrice) {
            filter["Price.amount"].$gte = Number(minPrice);
        }
        if (maxPrice) {
            filter["Price.amount"].$lte = Number(maxPrice);
        }
    }

    try {
        const products = await productSchema.find(filter).skip(Number(skip)).limit(Math.min(Number(limit), 20));
        return res.status(200).json({ message: "Products fetched successfully", products });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error"
        })
    }
}

async function getProductById(req, res) {
    try {
        const { id } = req.params;
        const product = await productSchema.findById(id);
        if (!product) {
            return res.status(404).json({ message: "Product not found." });
        }
        return res.status(200).json({ message: "Product fetched successfully", product: product });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error"
        })
    }
}

// async function updateProduct(req, res) {
//     try {
//         const { id } = req.params
//         if (!mongo.Types.ObjectId.isValid(id)) {
//             return res.status(400).json({ message: "Invalid product id" })
//         }
//         const product = await productSchema.findOne({
//             _id: id, Seller: req.user.id
//         })
//         if (!product) {
//             return res.status(404).json({ message: "Product not found or you are not the seller of this product" })
//         }
//         const allowedUpdate=["title", "Description", "Price"]
//         for(let key in req.body){
//             if(allowedUpdate.includes(key)){
//                 product[key]=req.body[key]
//             }
//         }

//         await product.save()
//         return res.status(200).json({ message: "Product updated successfully", product })
//     } catch (error) {

//     }
// }

async function updateProduct(req, res) {
    try {
        const { id } = req.params

        // ✅ validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid product id" })
        }

        // ✅ find product (ownership check)
        const product = await productSchema.findOne({
            _id: id,
            seller: req.user.id
        })

        if (!product) {
            return res.status(404).json({
                message: "Product not found or you are not the seller"
            })
        }

        // ✅ allowed fields
        const allowedUpdates = ["title", "description", "price"]

        for (let key in req.body) {
            if (allowedUpdates.includes(key)) {
                product[key] = req.body[key]
            }
        }

        // ✅ special handling for price
        if (req.body.priceAmount || req.body.priceCurrency) {
            product.price = {
                amount: Number(req.body.priceAmount || product.price.amount),
                currency: req.body.priceCurrency || product.price.currency
            }
        }

        await product.save()

        return res.status(200).json({
            message: "Product updated successfully",
            product
        })

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error"
        })
    }
}
async function deleteProduct(req, res) {
    try {
        const { id } = req.params
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid product id" })
        }

        const product = await productSchema.findOneAndDelete({
            _id: id,
            seller: req.user.id
        })
        if (!product) {
            return res.status(404).json({
                message: "Product not found or you are not the seller"
            })
        }
        return res.status(200).json({
            message: "Product deleted successfully",
            productId: id,

        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error"
        })
    }
}

module.exports = { createProduct, getProductBySeller, getProduct, getProductById, updateProduct, deleteProduct }
