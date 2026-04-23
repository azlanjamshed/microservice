jest.mock("../src/db/redis", () => ({
    set: jest.fn(),
    disconnect: jest.fn()
}))

const mongoose = require("mongoose")
const { MongoMemoryServer } = require("mongodb-memory-server")

let mongoServer

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create()
    await mongoose.connect(mongoServer.getUri())
})

afterEach(async () => {
    const collections = mongoose.connection.collections

    for (const key of Object.keys(collections)) {
        await collections[key].deleteMany({})
    }
})

afterAll(async () => {
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
    await mongoServer.stop()
})
