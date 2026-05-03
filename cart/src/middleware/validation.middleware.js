const { body, validationResult } = require('express-validator');
const { default: mongoose } = require('mongoose');


function validateResult(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
}



const validateAddItemToCart = [
    body('productId')
        .isString()
        .withMessage('Product ID must be a string')
        .custom(value => mongoose.Types.ObjectId.isValid(value))
        .withMessage('Invalid Product ID format'),
    body('quantity')
        .isInt({ min: 1 })
        .withMessage('Quantity must be an integer greater than 0'),

    validateResult

]

const validateUpdateCartItem = [
    body('quantity')
        .isInt()
        .withMessage('Quantity must be an integer'),

    validateResult
]

module.exports = {
    validateAddItemToCart,
    validateUpdateCartItem,
}
