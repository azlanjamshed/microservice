const mongoose = require("mongoose");
const request = require("supertest");

const mockUserId = new mongoose.Types.ObjectId().toString();
const mockProductId = new mongoose.Types.ObjectId().toString();
const mockSecondProductId = new mongoose.Types.ObjectId().toString();
const mockSave = jest.fn();
const mockFindOne = jest.fn();

function MockCartModel(cart) {
  return {
    ...cart,
    save: mockSave,
  };
}

MockCartModel.findOne = mockFindOne;

jest.mock("../src/models/cart.model", () => MockCartModel);

jest.mock("../src/middleware/auth.middleware", () => {
  return jest.fn(() => (req, res, next) => {
    req.user = {
      _id: mockUserId,
      role: "user",
    };
    next();
  });
});

const app = require("../src/app");

describe("GET /api/cart", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    global.fetch = jest.fn(async (url) => {
      const requestedProductId = String(url).split("/").pop();
      const products = {
        [mockProductId]: {
          _id: mockProductId,
          name: "Keyboard",
          price: 100,
          availableQuantity: 10,
        },
        [mockSecondProductId]: {
          _id: mockSecondProductId,
          name: "Mouse",
          price: 50,
          availableQuantity: 5,
        },
      };

      return {
        ok: true,
        json: async () => products[requestedProductId],
      };
    });
  });

  afterEach(() => {
    delete global.fetch;
  });

  it("fetches the current cart and recomputes totals from Product Service prices", async () => {
    mockFindOne.mockResolvedValue({
      user: mockUserId,
      items: [
        {
          productId: mockProductId,
          quantity: 2,
          price: 1,
        },
        {
          productId: mockSecondProductId,
          quantity: 3,
          price: 999,
        },
      ],
    });

    const response = await request(app).get("/api/cart");

    expect(response.status).toBe(200);
    expect(mockFindOne).toHaveBeenCalledWith({ user: mockUserId });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(response.body).toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            productId: mockProductId,
            quantity: 2,
            price: 100,
            lineTotal: 200,
          }),
          expect.objectContaining({
            productId: mockSecondProductId,
            quantity: 3,
            price: 50,
            lineTotal: 150,
          }),
        ],
        totals: expect.objectContaining({
          subtotal: 350,
          total: 350,
        }),
      })
    );
  });

  it("returns an empty cart with zero totals when the user has no cart", async () => {
    mockFindOne.mockResolvedValue(null);

    const response = await request(app).get("/api/cart");

    expect(response.status).toBe(200);
    expect(mockFindOne).toHaveBeenCalledWith({ user: mockUserId });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(response.body).toEqual({
      items: [],
      totals: {
        subtotal: 0,
        total: 0,
      },
    });
  });
});

describe("POST /api/cart/items", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("adds a new item to an existing cart without using a real database", async () => {
    const cart = {
      user: mockUserId,
      items: [],
      save: mockSave,
    };

    mockFindOne.mockResolvedValue(cart);
    mockSave.mockResolvedValue(cart);

    const response = await request(app)
      .post("/api/cart/items")
      .send({ productId: mockProductId, quantity: 2 });

    expect(response.status).toBe(200);
    expect(mockFindOne).toHaveBeenCalledWith({ user: mockUserId });
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(response.body).toEqual(
      expect.objectContaining({
        message: "Item added to cart successfully",
        cart: expect.objectContaining({
          user: mockUserId,
          items: expect.arrayContaining([
            expect.objectContaining({
              productId: mockProductId,
              quantity: 2,
            }),
          ]),
        }),
      })
    );
  });

  it("increases quantity when the item already exists in the cart", async () => {
    const cart = {
      user: mockUserId,
      items: [{ productId: mockProductId, quantity: 1 }],
      save: mockSave,
    };

    mockFindOne.mockResolvedValue(cart);
    mockSave.mockResolvedValue(cart);

    const response = await request(app)
      .post("/api/cart/items")
      .send({ productId: mockProductId, quantity: 3 });

    expect(response.status).toBe(200);
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(response.body.cart.items).toEqual([
      expect.objectContaining({
        productId: mockProductId,
        quantity: 4,
      }),
    ]);
  });

  it("creates a cart when the user does not already have one", async () => {
    mockFindOne.mockResolvedValue(null);
    mockSave.mockImplementation(function save() {
      return Promise.resolve(this);
    });

    const response = await request(app)
      .post("/api/cart/items")
      .send({ productId: mockProductId, quantity: 1 });

    expect(response.status).toBe(200);
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(response.body.cart).toEqual(
      expect.objectContaining({
        user: mockUserId,
        items: expect.arrayContaining([
          expect.objectContaining({
            productId: mockProductId,
            quantity: 1,
          }),
        ]),
      })
    );
  });

  it("returns 400 when productId is not a valid ObjectId", async () => {
    const response = await request(app)
      .post("/api/cart/items")
      .send({ productId: "bad-id", quantity: 1 });

    expect(response.status).toBe(400);
    expect(mockFindOne).not.toHaveBeenCalled();
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "productId",
        }),
      ])
    );
  });

  it("returns 400 when quantity is less than 1", async () => {
    const response = await request(app)
      .post("/api/cart/items")
      .send({ productId: mockProductId, quantity: 0 });

    expect(response.status).toBe(400);
    expect(mockFindOne).not.toHaveBeenCalled();
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "quantity",
        }),
      ])
    );
  });
});

describe("PATCH /api/cart/items/:productId", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    global.fetch = jest.fn(async (url) => {
      const requestedProductId = String(url).split("/").pop();
      const products = {
        [mockProductId]: {
          _id: mockProductId,
          name: "Keyboard",
          price: 100,
          availableQuantity: 10,
        },
        [mockSecondProductId]: {
          _id: mockSecondProductId,
          name: "Mouse",
          price: 50,
          availableQuantity: 5,
        },
      };

      return {
        ok: true,
        json: async () => products[requestedProductId],
      };
    });
  });

  afterEach(() => {
    delete global.fetch;
  });

  it("changes item quantity and returns recalculated totals", async () => {
    const cart = {
      user: mockUserId,
      items: [
        {
          productId: mockProductId,
          quantity: 1,
          price: 999,
        },
        {
          productId: mockSecondProductId,
          quantity: 2,
          price: 1,
        },
      ],
      save: mockSave,
    };

    mockFindOne.mockResolvedValue(cart);
    mockSave.mockResolvedValue(cart);

    const response = await request(app)
      .patch(`/api/cart/items/${mockProductId}`)
      .send({ quantity: 3 });

    expect(response.status).toBe(200);
    expect(mockFindOne).toHaveBeenCalledWith({ user: mockUserId });
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(response.body).toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            productId: mockProductId,
            quantity: 3,
            price: 100,
            lineTotal: 300,
          }),
          expect.objectContaining({
            productId: mockSecondProductId,
            quantity: 2,
            price: 50,
            lineTotal: 100,
          }),
        ],
        totals: expect.objectContaining({
          subtotal: 400,
          total: 400,
        }),
      })
    );
  });

  it("removes the item when quantity is less than or equal to zero", async () => {
    const cart = {
      user: mockUserId,
      items: [
        {
          productId: mockProductId,
          quantity: 1,
          price: 999,
        },
        {
          productId: mockSecondProductId,
          quantity: 2,
          price: 1,
        },
      ],
      save: mockSave,
    };

    mockFindOne.mockResolvedValue(cart);
    mockSave.mockResolvedValue(cart);

    const response = await request(app)
      .patch(`/api/cart/items/${mockProductId}`)
      .send({ quantity: 0 });

    expect(response.status).toBe(200);
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(response.body).toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            productId: mockSecondProductId,
            quantity: 2,
            price: 50,
            lineTotal: 100,
          }),
        ],
        totals: expect.objectContaining({
          subtotal: 100,
          total: 100,
        }),
      })
    );
    expect(response.body.items).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ productId: mockProductId })])
    );
  });
});

describe("DELETE /api/cart/items/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("removes an item from the current user's cart", async () => {
    const cart = {
      user: mockUserId,
      items: [
        {
          productId: mockProductId,
          quantity: 1,
        },
        {
          productId: mockSecondProductId,
          quantity: 2,
        },
      ],
      save: mockSave,
    };

    mockFindOne.mockResolvedValue(cart);
    mockSave.mockResolvedValue(cart);

    const response = await request(app).delete(`/api/cart/items/${mockProductId}`);

    expect(response.status).toBe(200);
    expect(mockFindOne).toHaveBeenCalledWith({ user: mockUserId });
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(response.body).toEqual(
      expect.objectContaining({
        message: "Item removed successfully",
        cart: expect.objectContaining({
          user: mockUserId,
          items: [
            expect.objectContaining({
              productId: mockSecondProductId,
              quantity: 2,
            }),
          ],
        }),
      })
    );
  });

  it("returns 404 when the item is not in the cart", async () => {
    const cart = {
      user: mockUserId,
      items: [
        {
          productId: mockSecondProductId,
          quantity: 2,
        },
      ],
      save: mockSave,
    };

    mockFindOne.mockResolvedValue(cart);

    const response = await request(app).delete(`/api/cart/items/${mockProductId}`);

    expect(response.status).toBe(404);
    expect(mockFindOne).toHaveBeenCalledWith({ user: mockUserId });
    expect(mockSave).not.toHaveBeenCalled();
    expect(response.body).toEqual({ message: "Item not found in cart" });
  });
});

describe("DELETE /api/cart/emptyCart", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("clears all items from the current user's cart", async () => {
    const cart = {
      user: mockUserId,
      items: [
        {
          productId: mockProductId,
          quantity: 1,
        },
        {
          productId: mockSecondProductId,
          quantity: 2,
        },
      ],
      save: mockSave,
    };

    mockFindOne.mockResolvedValue(cart);
    mockSave.mockResolvedValue(cart);

    const response = await request(app).delete("/api/cart/emptyCart");

    expect(response.status).toBe(200);
    expect(mockFindOne).toHaveBeenCalledWith({ user: mockUserId });
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(response.body).toEqual(
      expect.objectContaining({
        message: "Cart cleared successfully",
        cart: expect.objectContaining({
          user: mockUserId,
          items: [],
        }),
      })
    );
  });

  it("returns 404 when the user has no cart to clear", async () => {
    mockFindOne.mockResolvedValue(null);

    const response = await request(app).delete("/api/cart/emptyCart");

    expect(response.status).toBe(404);
    expect(mockFindOne).toHaveBeenCalledWith({ user: mockUserId });
    expect(mockSave).not.toHaveBeenCalled();
    expect(response.body).toEqual({ message: "Cart not found" });
  });
});
