require("dotenv").config()
const express = require("express")
const cookieParser = require("cookie-parser")
const app = express()
const authRoute = require("./routes/auth.route")

app.use(express.json())
app.use(cookieParser())


app.use("/api/auth", authRoute)


module.exports = app
