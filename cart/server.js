require("dotenv").config()
const app = require("./src/app")
const conectDB = require("./src/db/db")

conectDB()




app.listen(3002, () => {
    console.log("Cart service is running on port 3002")
})