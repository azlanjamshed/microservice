const express = require("express");
const multer = require("multer");

const createAuthMiddleware = require("../middleware/auth.middleware");
const {
    validateProduct,
    handleValidationErrors,
} = require("../validator/product.validator");
const productController = require("../controller/product.controller")
const router = express.Router();
const storage = multer.memoryStorage()

const upload = multer({ storage })


router.post(
    "/",
    createAuthMiddleware(["seller", "admin"]),
    upload.array("images", 5),
    validateProduct,
    handleValidationErrors,
    productController.createProduct

);
router.get(
    "/seller",
    createAuthMiddleware(["seller", "admin"]),
    productController.getProductBySeller
);

router.get(
    "/",
    productController.getProduct
)
router.get(
    "/:id",
    productController.getProductById
);
router.patch("/:id",
    createAuthMiddleware(["seller"]),

    validateProduct,
    handleValidationErrors,
    productController.updateProduct
)
router.delete(
    "/:id",
    createAuthMiddleware(["seller"]),
    productController.deleteProduct
)


module.exports = router;
