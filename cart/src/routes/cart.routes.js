const express = require("express")
const router = express.Router()
const createAuthMiddleware = require("../middleware/auth.middleware")
const cartController = require("../controller/cart.controller")
const validator = require("../middleware/validation.middleware")







router.get("/", createAuthMiddleware(["user"]), cartController.getCart)

router.post("/items", validator.validateAddItemToCart, createAuthMiddleware(["user"]), cartController.addItemToCart)

router.patch("/items/:productId", validator.validateUpdateCartItem, createAuthMiddleware(["user"]), cartController.updateCartItem)
router.delete("/emptyCart", createAuthMiddleware(["user"]), cartController.clearCart)
router.delete("/items/:id", createAuthMiddleware(["user"]), cartController.deleteCartItem)







module.exports = router
