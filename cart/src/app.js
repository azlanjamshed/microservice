const express = require("express")
const router = require("./routes/cart.routes")
const app = express()
const cookiesParser = require("cookie-parser")

app.use(cookiesParser())

app.use(express.json())
app.use("/api/cart", router)



module.exports = app