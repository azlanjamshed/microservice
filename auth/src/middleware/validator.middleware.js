const { body, validationResult } = require("express-validator")

const buildValidationErrorResponder = (message) => (req, res, next) => {
    const error = validationResult(req)
    if (!error.isEmpty()) {
        return res.status(400).json({
            message,
            errors: error.array()
        })
    }
    next()
}

const respondWithRegistrationValidationErrors = buildValidationErrorResponder("username, email and password are required")
const respondWithAddressValidationErrors = buildValidationErrorResponder("street, city, state, zip, country and phone are required")
const respondWithLoginValidationErrors = buildValidationErrorResponder("email or username and password are required")
const validateRegistration = [
    body("username")
        .isString()
        .withMessage("username must be a string")
        .notEmpty()
        .withMessage("username is required")
        .isLength({ min: 3 })
        .withMessage("username must be at least 3 characters long"),


    body("email")
        .isEmail()
        .withMessage("Invalid Email address"),

    body("password")
        .isLength({ min: 6 })
        .withMessage("password must be at least 6 characters long"),
    body("fullName.firstName")
        .isString()
        .withMessage("firstName must be a string")
        .notEmpty()
        .withMessage("firstName is required"),
    body("fullName.lastName")
        .isString()
        .withMessage("lastName must be a string")
        .notEmpty()
        .withMessage("lastName is required"),

    respondWithRegistrationValidationErrors
]

const validateLogin = [
    body("email")
        .optional()
        .isEmail()
        .withMessage("Invalid Email address"),
    body("username")
        .optional()
        .isString()
        .withMessage("username must be a string")
        .notEmpty()
        .withMessage("username cannot be empty"),
    body("password")
        .notEmpty()
        .withMessage("password is required"),
    (req, res, next) => {
        if (!req.body.email && !req.body.username) {
            return res.status(400).json({
                message: "email or username is required"
            })
        }

        return respondWithLoginValidationErrors(req, res, next)
    }
]
const addAddressValidate = [
    body("street")
        .isString()
        .withMessage("Street must be a String")
        .notEmpty()
        .withMessage("Street is Required"),
    body("city")
        .isString()
        .withMessage("city must be a String")
        .notEmpty()
        .withMessage("city is Required"),
    body("state")
        .isString()
        .withMessage("state must be a String")
        .notEmpty()
        .withMessage("state is Required"),
    body("zip")
        .isString()
        .withMessage("zip must be a String")
        .notEmpty()
        .withMessage("zip is Required"),
    body("country")
        .isString()
        .withMessage("country must be a String")
        .notEmpty()
        .withMessage("country is Required"),
    body("phone")
        .isString()
        .withMessage("phone must be a String")
        .notEmpty()
        .withMessage("phone is Required"),
    body("isDefault")
        .optional()
        .isBoolean()
        .withMessage("isDefault must be a boolean"),
    respondWithAddressValidationErrors
]

module.exports = {
    validateRegistration,
    validateLogin,
    addAddressValidate
}
