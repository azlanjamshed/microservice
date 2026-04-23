const jwt = require("jsonwebtoken")
const request = require("supertest")
const app = require("../src/app")
const userModel = require("../src/models/user.model")

describe("GET /api/auth/me", () => {
    it("returns the current user for a valid auth cookie", async () => {
        const user = await userModel.create({
            username: "jane_doe",
            email: "jane@example.com",
            password: "hashed-password",
            fullName: {
                firstName: "Jane",
                lastName: "Doe"
            },
            role: "user"
        })

        const token = jwt.sign(
            {
                id: user._id,
                username: user.username,
                role: user.role,
                email: user.email
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        )

        const response = await request(app)
            .get("/api/auth/me")
            .set("Cookie", [`token=${token}`])

        expect(response.status).toBe(200)
        expect(response.body.message).toBe("user fetched successfully")
        expect(response.body.user).toMatchObject({
            username: "jane_doe",
            email: "jane@example.com",
            role: "user"
        })
        expect(response.body.user.password).toBeUndefined()
    })

    it("rejects requests without an auth cookie", async () => {
        const response = await request(app)
            .get("/api/auth/me")

        expect(response.status).toBe(401)
        expect(response.body.message).toBe("unauthorized")
    })
})
