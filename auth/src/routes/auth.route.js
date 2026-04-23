const express = require("express")
const validators = require("../middleware/validator.middleware")
const authMiddleware = require("../middleware/auth.middleware")
const authController = require("../controller/auth.controller")
const router = express.Router()


router.post("/register", validators.validateRegistration, authController.register)
router.post("/login", validators.validateLogin, authController.login)
router.get("/me", authMiddleware.authenticateUser, authController.me)
router.get("/users/me/addresses", authMiddleware.authenticateUser, authController.getAddresses)
router.post("/users/me/addresses", authMiddleware.authenticateUser, validators.addAddressValidate, authController.addAddress)
router.delete("/users/me/addresses/:addressId", authMiddleware.authenticateUser, authController.deleteAddress)
router.get("/logout", authController.logout)

module.exports = router
