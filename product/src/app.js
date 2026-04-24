const express = require("express");
const cookieParser = require("cookie-parser");
const productRoutes = require("./Routes/product.routes")
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use("/api/products", productRoutes)

app.use((req, res) => {
    res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});


module.exports = app;
