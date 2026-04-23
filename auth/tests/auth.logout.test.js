jest.mock("../src/db/redis", () => ({
    set: jest.fn()
}))

const express = require("express")
const cookieParser = require("cookie-parser")
const request = require("supertest")
const jwt = require("jsonwebtoken")

const authController = require("../src/controller/auth.controller")
const redis = require("../src/db/redis")

describe("POST /api/auth/logout", () => {
    let app

    beforeEach(() => {
        app = express()
        app.use(cookieParser())

        app.post("/api/auth/logout", authController.logout)

        jest.clearAllMocks()
    })

    // ✅ SUCCESS CASE
    it("should logout user, clear cookie, and blacklist token", async () => {
        const token = jwt.sign(
            { id: "123", email: "test@test.com" },
            "testsecret" // use fixed secret for test
        )

        const res = await request(app)
            .post("/api/auth/logout")
            .set("Cookie", [`token=${token}`])

        expect(res.status).toBe(200)
        expect(res.body.message).toBe("logout successful")

        // Redis called
        expect(redis.set).toHaveBeenCalledWith(
            `blacklist:${token}`,
            "true",
            "EX",
            expect.any(Number)
        )

        // Cookie cleared
        expect(res.headers["set-cookie"]).toEqual(
            expect.arrayContaining([
                expect.stringContaining("token=;")
            ])
        )
    })

    // ❌ NO TOKEN CASE
    it("should return 400 if token not found", async () => {
        const res = await request(app)
            .post("/api/auth/logout")

        expect(res.status).toBe(400)
        expect(res.body.message).toBe("token not found")

        expect(redis.set).not.toHaveBeenCalled()
    })
})