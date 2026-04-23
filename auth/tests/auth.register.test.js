const request = require("supertest")
const app = require("../src/app")
const userModel = require("../src/models/user.model")

describe("POST /api/auth/register", () => {
    it("registers a new user in the in-memory database", async () => {
        const payload = {
            username: "jane_doe",
            email: "jane@example.com",
            password: "secret123",
            role: "user",
            fullName: {
                firstName: "Jane",
                lastName: "Doe"
            }
        }
        
        const response = await request(app)
            .post("/api/auth/register")
            .send(payload)

        expect(response.status).toBe(201)
        expect(response.body.message).toBe("user registered successfully")
        expect(response.body.user).toMatchObject({
            username: payload.username,
            email: payload.email,
            role: payload.role
        })

        const savedUser = await userModel.findOne({ email: payload.email }).lean()

        expect(savedUser).toBeTruthy()
        expect(savedUser.username).toBe(payload.username)
    })

    it("rejects a duplicate user", async () => {
        const payload = {
            username: "jane_doe",
            email: "jane@example.com",
            password: "secret123",
            role: "user",
            fullName: {
                firstName: "Jane",
                lastName: "Doe"
            }
        }

        await request(app)
            .post("/api/auth/register")
            .send(payload)

        const response = await request(app)
            .post("/api/auth/register")
            .send(payload)

        expect(response.status).toBe(409)
        expect(response.body.message).toBe("user already exists")

        const savedUsers = await userModel.find({ email: payload.email }).lean()

        expect(savedUsers).toHaveLength(1)
    })

    it("rejects registration when required values are missing", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                username: "jane_doe"
            })

        expect(response.status).toBe(400)
        expect(response.body.message).toBe("username, email and password are required")

        const savedUsers = await userModel.find({ username: "jane_doe" }).lean()

        expect(savedUsers).toHaveLength(0)
    })
})
