const userModel = require("../models/user.model")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const redis = require("../db/redis")


async function register(req, res) {
    try {
        const { username, email, password, fullName, role, address, addresses } = req.body

        if (!username || !email || !password || !fullName?.firstName || !fullName?.lastName) {
            return res.status(400).json({
                message: "username, email and password are required"
            })
        }

        const { firstName, lastName } = fullName
        const userExist = await userModel.findOne({
            $or: [
                { email: email },
                { username: username }
            ]
        })
        if (userExist) {
            return res.status(409).json({
                message: "user already exists"
            })
        }
        const hash = await bcrypt.hash(password, 10)
        const user = await userModel.create({
            username,
            email,
            password: hash,
            fullName: { firstName, lastName },
            role,
            addresses: addresses || (address ? [address] : [])
        })

        const token = jwt.sign({
            id: user._id,
            username: user.username,
            role: user.role,
            email: user.email
        }, process.env.JWT_SECRET, { expiresIn: "1d" })

        res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            maxAge: 24 * 60 * 60 * 1000
        })


        return res.status(201).json({
            message: "user registered successfully",
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                addresses: user.addresses

            }
        })
    } catch (error) {
        return res.status(500).json({
            message: "failed to register user",
            error: error.message
        })

    }
}

async function login(req, res) {
    try {
        const { email, username, password } = req.body

        if ((!email && !username) || !password) {
            return res.status(400).json({
                message: "email or username and password are required"
            })
        }

        const user = await userModel.findOne({
            ...(email ? { email } : { username })
        }).select("+password")

        if (!user) {
            return res.status(401).json({
                message: "invalid email or password"
            })
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return res.status(401).json({
                message: "invalid email or password"
            })
        }

        const token = jwt.sign({
            id: user._id,
            username: user.username,
            role: user.role,
            email: user.email
        }, process.env.JWT_SECRET, { expiresIn: "1d" })

        res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            maxAge: 24 * 60 * 60 * 1000
        })

        return res.status(200).json({
            message: "login successful",
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                addresses: user.addresses
            }
        })
    } catch (error) {
        return res.status(500).json({
            message: "failed to login user",
            error: error.message
        })
    }
}

async function me(req, res) {
    const user = req.user

    return res.status(200).json({
        message: "user fetched successfully",
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            addresses: user.addresses
        }
    })
}

async function logout(req, res) {
    const token = req.cookies.token

    if (!token) {
        return res.status(400).json({ message: "token not found" })
    }

    await redis.set(`blacklist:${token}`, "true", "EX", 60 * 60 * 24)

    res.clearCookie("token")

    res.status(200).json({ message: "logout successful" })
}

async function getAddresses(req, res) {
    try {

        const id = req.user.id
        const user = await userModel.findById(id).select("addresses")

        if (!user) {
            return res.status(404).json({
                message: "User not Found"
            })
        }
        return res.status(200).json({
            message: "User address fetch Successfully",
            addresses: user.addresses || []
        })


    } catch (error) {
        return res.status(500).json({
            error: error.message
        })
    }

}

async function addAddress(req, res) {
    try {
        const id = req.user.id
        const { street, city, state, zip, country, phone, isDefault } = req.body
        const user = await userModel.findById(id)

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            })
        }

        const shouldBeDefault = user.addresses.length === 0 || Boolean(isDefault)

        if (shouldBeDefault) {
            user.addresses.forEach((address) => {
                address.isDefault = false
            })
        }

        user.addresses.push({
            street,
            city,
            state,
            zip,
            country,
            phone,
            isDefault: shouldBeDefault
        })

        await user.save()

        return res.status(201).json({
            message: "Address added Successfully",
            address: user.addresses[user.addresses.length - 1]
        })

    } catch (error) {
        return res.status(500).json({
            message: "failed to add address",
            error: error.message
        })
    }
}

async function deleteAddress(req, res) {
    try {
        const id = req.user.id
        const { addressId } = req.params;
        const user = await userModel.findOneAndUpdate({ _id: id }, {
            $pull: {
                addresses: { _id: addressId }
            }
        }, { new: true })

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            })
        }
        const addressExist = user.addresses.some(addr => addr._id.toString() == addressId)
        if (addressExist) {
            return res.status(500).json({
                message: "Failed to delete address"
            })
        }

        return res.status(201).json({
            message: "Message Delete Successfully",
            address: user.addresses
        })
    } catch (error) {
        return res.status(500).json({
            message: "failed to delete address",
            error: error.message
        })
    }
}

module.exports = {
    register,
    login,
    me,
    logout,
    getAddresses,
    addAddress,
    deleteAddress
}
