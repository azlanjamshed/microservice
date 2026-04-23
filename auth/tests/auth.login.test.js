const bcrypt = require("bcryptjs")
const request = require("supertest")
const app = require("../src/app")
const userModel = require("../src/models/user.model")

describe("POST /api/auth/login", () => {
    it("logs in an existing user with email and password", async () => {
        const password = "secret123"
        const hashedPassword = await bcrypt.hash(password, 10)

        await userModel.create({
            username: "jane_doe",
            email: "jane@example.com",
            password: hashedPassword,
            fullName: {
                firstName: "Jane",
                lastName: "Doe"
            },
            role: "user"
        })

        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "jane@example.com",
                password
            })

        expect(response.status).toBe(200)
        expect(response.body.message).toBe("login successful")
        expect(response.body.user).toMatchObject({
            username: "jane_doe",
            email: "jane@example.com",
            role: "user"
        })
        expect(response.headers["set-cookie"]).toEqual(
            expect.arrayContaining([expect.stringContaining("token=")])
        )
    })

    it("logs in an existing user with username and password", async () => {
        const password = "secret123"
        const hashedPassword = await bcrypt.hash(password, 10)

        await userModel.create({
            username: "john_doe",
            email: "john@example.com",
            password: hashedPassword,
            fullName: {
                firstName: "John",
                lastName: "Doe"
            },
            role: "user"
        })

        const response = await request(app)
            .post("/api/auth/login")
            .send({
                username: "john_doe",
                password
            })

        expect(response.status).toBe(200)
        expect(response.body.message).toBe("login successful")
        expect(response.body.user).toMatchObject({
            username: "john_doe",
            email: "john@example.com",
            role: "user"
        })
    })

    it("rejects login with invalid credentials", async () => {
        const hashedPassword = await bcrypt.hash("secret123", 10)

        await userModel.create({
            username: "jane_doe",
            email: "jane@example.com",
            password: hashedPassword,
            fullName: {
                firstName: "Jane",
                lastName: "Doe"
            }
        })

        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "jane@example.com",
                password: "wrong-password"
            })

        expect(response.status).toBe(401)
        expect(response.body.message).toBe("invalid email or password")
    })

    it("rejects login when email and username are both missing", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                password: "secret123"
            })

        expect(response.status).toBe(400)
        expect(response.body.message).toBe("email or username is required")
    })
})
