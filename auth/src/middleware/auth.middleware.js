const jwt = require("jsonwebtoken")
const userModel = require("../models/user.model")

async function authenticateUser(req, res, next) {
    try {
        const token = req.cookies?.token

        if (!token) {
            return res.status(401).json({
                message: "unauthorized"
            })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await userModel.findById(decoded.id)

        if (!user) {
            return res.status(404).json({
                message: "user not found"
            })
        }

        req.user = user
        return next()
    } catch (error) {
        return res.status(401).json({
            message: "invalid or expired token"
        })
    }
}

module.exports = {
    authenticateUser
}
