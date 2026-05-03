const cartModel = require("../models/cart.model")

async function buildCartResponse(cart) {
    if (!cart) {
        return {
            items: [],
            totals: {
                subtotal: 0,
                total: 0,
            }
        }
    }

    const items = await Promise.all(cart.items.map(async (item) => {
        const productId = item.productId.toString()
        const response = await fetch(`${process.env.PRODUCT_SERVICE_URL || "http://localhost:3001/products"}/${productId}`)

        if (!response.ok) {
            throw new Error("Unable to fetch product details")
        }

        const product = await response.json()
        const price = product.price
        const quantity = item.quantity

        return {
            productId,
            quantity,
            price,
            lineTotal: price * quantity,
        }
    }))

    const subtotal = items.reduce((total, item) => total + item.lineTotal, 0)

    return {
        items,
        totals: {
            subtotal,
            total: subtotal,
        }
    }
}

async function getCart(req, res) {

    try {
        const user = req.user;
        const cart = await cartModel.findOne({ user: user._id })
        const response = await buildCartResponse(cart)

        res.status(200).json(response)
    } catch (error) {
        res.status(500).json({ message: "Internal server error" })
    }


}
async function addItemToCart(req, res) {
    try {
        const { productId, quantity } = req.body;
        const user = req.user

        let cart = await cartModel.findOne({ user: user._id })

        if (!cart) {
            cart = new cartModel({
                user: user._id,
                items: []
            })
        }
        const existingItemIndex = cart.items.findIndex(item => item.productId.toString() === productId)

        if (existingItemIndex >= 0) {
            cart.items[existingItemIndex].quantity += quantity
        } else {
            cart.items.push({ productId, quantity })
        }
        await cart.save()

        res.status(200).json({ message: "Item added to cart successfully", cart })
    } catch (error) {
        console.error("Error adding item to cart:", error)
        res.status(500).json({ message: "Internal server error" })
    }

}

async function updateCartItem(req, res) {
    try {
        const { productId } = req.params
        const { quantity } = req.body
        const user = req.user

        const cart = await cartModel.findOne({ user: user._id })

        if (!cart) {
            return res.status(200).json(await buildCartResponse(null))
        }

        const existingItemIndex = cart.items.findIndex(item => item.productId.toString() === productId)

        if (existingItemIndex >= 0) {
            if (quantity <= 0) {
                cart.items.splice(existingItemIndex, 1)
            } else {
                cart.items[existingItemIndex].quantity = quantity
            }
        }

        await cart.save()

        res.status(200).json(await buildCartResponse(cart))
    } catch (error) {
        console.error("Error updating cart item:", error)
        res.status(500).json({ message: "Internal server error" })
    }
}
async function deleteCartItem(req, res) {
    try {
        const { id } = req.params;
        const user = req.user;

        // Find user's cart
        const cart = await cartModel.findOne({ user: user._id });

        // ❌ If no cart found
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        // ❌ If item not in cart
        const itemExists = cart.items.find(
            (item) => item.productId.toString() === id
        );

        if (!itemExists) {
            return res.status(404).json({ message: "Item not found in cart" });
        }

        // ✅ Remove item
        cart.items = cart.items.filter(
            (item) => item.productId.toString() !== id
        );

        // Save updated cart
        await cart.save();

        return res.status(200).json({
            message: "Item removed successfully",
            cart,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error",
            error: error.message,
        });
    }
}

async function clearCart(req, res) {
    try {
        const user = req.user;

        const cart = await cartModel.findOne({ user: user._id });

        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        // ✅ Empty cart
        cart.items = [];

        await cart.save();

        return res.status(200).json({
            message: "Cart cleared successfully",
            cart,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error",
            error: error.message,
        });
    }
}



module.exports = {
    getCart,
    addItemToCart,
    updateCartItem,
    deleteCartItem,
    clearCart
}
