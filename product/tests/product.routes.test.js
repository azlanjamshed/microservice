const jwt = require("jsonwebtoken");
const request = require("supertest");

jest.mock("../src/controller/product.controller", () => ({
  createProduct: jest.fn((req, res) =>
    res.status(201).json({
      message: "Product created successfully.",
      body: req.body,
    })
  ),
  getProduct: jest.fn((req, res) =>
    res.status(200).json({
      message: "Products fetched successfully",
      products: [
        {
          _id: "product-1",
          title: "Desk Lamp",
        },
      ],
      query: req.query,
    })
  ),
  getProductById: jest.fn((req, res) =>
    res.status(200).json({
      message: "Product fetched successfully",
      product: {
        _id: req.params.id,
        title: "Desk Lamp",
      },
    })
  ),
  updateProduct: jest.fn((req, res) =>
    res.status(200).json({
      message: "Product updated successfully",
      product: {
        _id: req.params.id,
        ...req.body,
      },
    })
  ),
  deleteProduct: jest.fn((req, res) =>
    res.status(200).json({
      message: "Product deleted successfully",
      productId: req.params.id,
    })
  ),
  allProducts: jest.fn((req, res) =>
    res.status(200).json({
      message: "Seller products fetched successfully",
      products: [
        {
          _id: "seller-product-1",
          title: "Seller Lamp",
        },
      ],
      sellerId: req.user.id,
    })
  ),
}));

const app = require("../src/app");
const productController = require("../src/controller/product.controller");

describe("product route validation", () => {
  const sellerId = "66291f9f3e7f5bba9d557111";

  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
    jest.clearAllMocks();
  });

  function sellerToken(payload = {}) {
    return jwt.sign(
      {
        id: sellerId,
        role: "seller",
        ...payload,
      },
      process.env.JWT_SECRET
    );
  }

  it("rejects requests without a token before validation", async () => {
    const response = await request(app)
      .post("/api/products")
      .field("title", "Desk Lamp")
      .field("priceAmount", "1499");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Unauthorized" });
  });

  it("validates required product fields", async () => {
    const response = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${sellerToken()}`)
      .field("title", "")
      .field("priceAmount", "");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Validation failed.",
      errors: expect.arrayContaining([
        { field: "title", message: "Title is required." },
        { field: "priceAmount", message: "Price amount is required." },
      ]),
    });
  });

  it("validates price amount is greater than zero", async () => {
    const response = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${sellerToken()}`)
      .field("title", "Desk Lamp")
      .field("priceAmount", "0");

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        { field: "priceAmount", message: "Price amount must be greater than 0." },
      ])
    );
  });

  it("validates supported currency", async () => {
    const response = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${sellerToken()}`)
      .field("title", "Desk Lamp")
      .field("priceAmount", "1499")
      .field("priceCurrency", "EUR");

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        { field: "priceCurrency", message: "Price currency must be INR or USD." },
      ])
    );
  });

  it("validates description length", async () => {
    const response = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${sellerToken()}`)
      .field("title", "Desk Lamp")
      .field("priceAmount", "1499")
      .field("Description", "x".repeat(1001));

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        { field: "Description", message: "Description must be at most 1000 characters." },
      ])
    );
  });

  it("passes valid requests to the controller", async () => {
    const response = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${sellerToken()}`)
      .field("title", "Desk Lamp")
      .field("Description", "Warm light")
      .field("priceAmount", "1499")
      .field("priceCurrency", "INR")
      .attach("images", Buffer.from("fake-image"), {
        filename: "product.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(201);
    expect(productController.createProduct).toHaveBeenCalled();
    expect(response.body).toEqual({
      message: "Product created successfully.",
      body: {
        title: "Desk Lamp",
        Description: "Warm light",
        priceAmount: "1499",
        priceCurrency: "INR",
      },
    });
  });

  it("gets products", async () => {
    const response = await request(app).get("/api/products");

    expect(response.status).toBe(200);
    expect(productController.getProduct).toHaveBeenCalled();
    expect(response.body).toEqual({
      message: "Products fetched successfully",
      products: [
        {
          _id: "product-1",
          title: "Desk Lamp",
        },
      ],
      query: {},
    });
  });

  it("gets seller products for authenticated seller", async () => {
    const response = await request(app)
      .get("/api/products/seller")
      .set("Authorization", `Bearer ${sellerToken()}`);

    expect(response.status).toBe(200);
    expect(productController.allProducts).toHaveBeenCalled();
    expect(response.body).toEqual({
      message: "Seller products fetched successfully",
      products: [
        {
          _id: "seller-product-1",
          title: "Seller Lamp",
        },
      ],
      sellerId: sellerId,
    });
  });

  it("rejects unauthenticated seller products request", async () => {
    const response = await request(app).get("/api/products/seller");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Unauthorized" });
    expect(productController.allProducts).not.toHaveBeenCalled();
  });

  it("rejects non-seller seller-products request", async () => {
    const response = await request(app)
      .get("/api/products/seller")
      .set("Authorization", `Bearer ${sellerToken({ role: "user" })}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "Forbidden" });
    expect(productController.allProducts).not.toHaveBeenCalled();
  });

  it("passes query params to get products controller", async () => {
    const response = await request(app)
      .get("/api/products")
      .query({
        q: "lamp",
        minPrice: "100",
        maxPrice: "500",
        skip: "10",
        limit: "5",
      });

    expect(response.status).toBe(200);
    expect(productController.getProduct).toHaveBeenCalled();
    expect(response.body).toEqual({
      message: "Products fetched successfully",
      products: [
        {
          _id: "product-1",
          title: "Desk Lamp",
        },
      ],
      query: {
        q: "lamp",
        minPrice: "100",
        maxPrice: "500",
        skip: "10",
        limit: "5",
      },
    });
  });

  it("gets a product by id", async () => {
    const response = await request(app).get("/api/products/product-1");

    expect(response.status).toBe(200);
    expect(productController.getProductById).toHaveBeenCalled();
    expect(response.body).toEqual({
      message: "Product fetched successfully",
      product: {
        _id: "product-1",
        title: "Desk Lamp",
      },
    });
  });

  it("passes route params to get product by id controller", async () => {
    const response = await request(app).get("/api/products/abc123");

    expect(response.status).toBe(200);
    expect(productController.getProductById).toHaveBeenCalled();
    expect(response.body).toEqual({
      message: "Product fetched successfully",
      product: {
        _id: "abc123",
        title: "Desk Lamp",
      },
    });
  });

  it("updates product fields for seller", async () => {
    const response = await request(app)
      .patch("/api/products/product-1")
      .set("Authorization", `Bearer ${sellerToken()}`)
      .send({
        title: "Updated Lamp",
        Description: "Brighter light",
        priceAmount: "1999",
        priceCurrency: "INR",
      });

    expect(response.status).toBe(200);
    expect(productController.updateProduct).toHaveBeenCalled();
    expect(response.body).toEqual({
      message: "Product updated successfully",
      product: {
        _id: "product-1",
        title: "Updated Lamp",
        Description: "Brighter light",
        priceAmount: "1999",
        priceCurrency: "INR",
      },
    });
  });

  it("rejects partial seller product update with current validator rules", async () => {
    const response = await request(app)
      .patch("/api/products/product-1")
      .set("Authorization", `Bearer ${sellerToken()}`)
      .send({
        title: "Updated Lamp",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Validation failed.",
      errors: expect.arrayContaining([
        { field: "priceAmount", message: "Price amount is required." },
      ]),
    });
    expect(productController.updateProduct).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated product update", async () => {
    const response = await request(app)
      .patch("/api/products/product-1")
      .send({
        title: "Updated Lamp",
        priceAmount: "1999",
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Unauthorized" });
    expect(productController.updateProduct).not.toHaveBeenCalled();
  });

  it("deletes product for seller", async () => {
    const response = await request(app)
      .delete("/api/products/product-1")
      .set("Authorization", `Bearer ${sellerToken()}`);

    expect(response.status).toBe(200);
    expect(productController.deleteProduct).toHaveBeenCalled();
    expect(response.body).toEqual({
      message: "Product deleted successfully",
      productId: "product-1",
    });
  });

  it("rejects unauthenticated product delete", async () => {
    const response = await request(app).delete("/api/products/product-1");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Unauthorized" });
    expect(productController.deleteProduct).not.toHaveBeenCalled();
  });

  it("rejects non-seller product delete", async () => {
    const response = await request(app)
      .delete("/api/products/product-1")
      .set("Authorization", `Bearer ${sellerToken({ role: "user" })}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "Forbidden" });
    expect(productController.deleteProduct).not.toHaveBeenCalled();
  });
});
