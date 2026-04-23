const authController = require("../src/controller/auth.controller")
const userModel = require("../src/models/user.model")

jest.mock("../src/models/user.model")

const createResponse = () => {
    const res = {}

    res.status = jest.fn().mockReturnValue(res)
    res.json = jest.fn().mockReturnValue(res)

    return res
}

describe("Address controller", () => {
    describe("getAddresses", () => {
        it("returns the saved address for the authenticated user", async () => {
            const req = {
                user: {
                    id: "user-1"
                }
            }
            const res = createResponse()

            userModel.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue({
                    addresses: [
                        {
                            street: "221 Baker Street",
                            city: "Mumbai",
                            state: "Maharashtra",
                            zip: "400001",
                            country: "India"
                        }
                    ]
                })
            })

            await authController.getAddresses(req, res)

            expect(userModel.findById).toHaveBeenCalledWith("user-1")
            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith({
                message: "User address fetch Successfully",
                addresses: [
                    {
                        street: "221 Baker Street",
                        city: "Mumbai",
                        state: "Maharashtra",
                        zip: "400001",
                        country: "India"
                    }
                ]
            })
        })
        it("returns empty array when no address exists", async () => {
            userModel.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue({
                    addresses: undefined
                })
            })

            const req = { user: { id: "user-1" } }
            const res = createResponse()

            await authController.getAddresses(req, res)

            expect(res.json).toHaveBeenCalledWith({
                message: "User address fetch Successfully",
                addresses: []
            })
        })
    })

    describe("addAddress", () => {
        it("adds a new address for the authenticated user", async () => {
            const req = {
                user: {
                    id: "user-1"
                },
                body: {
                    street: "12 Lake View",
                    city: "Bengaluru",
                    state: "Karnataka",
                    zip: "560001",
                    country: "India",
                    phone: "9876543210",
                    isDefault: true
                }
            }
            const res = createResponse()

            userModel.findById.mockResolvedValue({
                addresses: [
                    {
                        street: "Old Street",
                        city: "Mumbai",
                        state: "Maharashtra",
                        zip: "400001",
                        country: "India",
                        phone: "9999999999",
                        isDefault: true
                    }
                ],
                save: jest.fn().mockResolvedValue()
            })

            await authController.addAddress(req, res)

            expect(userModel.findById).toHaveBeenCalledWith("user-1")
            expect(res.status).toHaveBeenCalledWith(201)
            expect(res.json).toHaveBeenCalledWith({
                message: "Address added Successfully",
                address: {
                        street: "12 Lake View",
                        city: "Bengaluru",
                        state: "Karnataka",
                        zip: "560001",
                        country: "India",
                        phone: "9876543210",
                        isDefault: true
                    }
            })
        })

        it("returns 404 when the user is not found", async () => {
            const req = {
                user: {
                    id: "missing-user"
                },
                body: {
                    street: "Broken Street",
                    city: "Delhi",
                    state: "Delhi",
                    zip: "110001",
                    country: "India",
                    phone: "12345",
                    isDefault: false
                }
            }
            const res = createResponse()

            userModel.findById.mockResolvedValue(null)

            await authController.addAddress(req, res)

            expect(userModel.findById).toHaveBeenCalledWith("missing-user")
            expect(res.status).toHaveBeenCalledWith(404)
            expect(res.json).toHaveBeenCalledWith({
                message: "User not found"
            })
        })

        it("returns 500 when add address fails", async () => {
            const req = {
                user: {
                    id: "user-1"
                },
                body: {
                    street: "12 Lake View",
                    city: "Bengaluru",
                    state: "Karnataka",
                    zip: "560001",
                    country: "India",
                    phone: "9876543210",
                    isDefault: true
                }
            }
            const res = createResponse()

            userModel.findById.mockRejectedValue(new Error("db failed"))

            await authController.addAddress(req, res)

            expect(res.status).toHaveBeenCalledWith(500)
            expect(res.json).toHaveBeenCalledWith({
                message: "failed to add address",
                error: "db failed"
            })
        })

        it("keeps only one default address when a new default is added", async () => {
            const req = {
                user: {
                    id: "user-1"
                },
                body: {
                    street: "New Street",
                    city: "Delhi",
                    state: "Delhi",
                    zip: "110001",
                    country: "India",
                    phone: "8888888888",
                    isDefault: true
                }
            }
            const existingAddress = {
                street: "Old Street",
                city: "Mumbai",
                state: "Maharashtra",
                zip: "400001",
                country: "India",
                phone: "9999999999",
                isDefault: true
            }
            const user = {
                addresses: [existingAddress],
                save: jest.fn().mockResolvedValue()
            }
            const res = createResponse()

            userModel.findById.mockResolvedValue(user)

            await authController.addAddress(req, res)

            expect(existingAddress.isDefault).toBe(false)
            expect(user.addresses[1]).toMatchObject({
                street: "New Street",
                zip: "110001",
                isDefault: true
            })
            expect(user.save).toHaveBeenCalled()
        })
    })

    describe("deleteAddress", () => {
        it("deletes an address for the authenticated user", async () => {
            const req = {
                user: {
                    id: "user-1"
                },
                params: {
                    addressId: "addr-1"
                }
            }
            const res = createResponse()

            userModel.findOneAndUpdate.mockResolvedValue({
                addresses: [
                    {
                        _id: "addr-2",
                        street: "Office Street",
                        city: "Delhi"
                    }
                ]
            })

            await authController.deleteAddress(req, res)

            expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
                { _id: "user-1" },
                {
                    $pull: {
                        addresses: { _id: "addr-1" }
                    }
                },
                { new: true }
            )
            expect(res.status).toHaveBeenCalledWith(201)
            expect(res.json).toHaveBeenCalledWith({
                message: "Message Delete Successfully",
                address: [
                    {
                        _id: "addr-2",
                        street: "Office Street",
                        city: "Delhi"
                    }
                ]
            })
        })

        it("returns 404 when the user is not found", async () => {
            const req = {
                user: {
                    id: "missing-user"
                },
                params: {
                    addressId: "addr-1"
                }
            }
            const res = createResponse()

            userModel.findOneAndUpdate.mockResolvedValue(null)

            await authController.deleteAddress(req, res)

            expect(res.status).toHaveBeenCalledWith(404)
            expect(res.json).toHaveBeenCalledWith({
                message: "User not found"
            })
        })

        it("returns 500 when the address still exists after delete", async () => {
            const req = {
                user: {
                    id: "user-1"
                },
                params: {
                    addressId: "addr-1"
                }
            }
            const res = createResponse()

            userModel.findOneAndUpdate.mockResolvedValue({
                addresses: [
                    {
                        _id: {
                            toString: () => "addr-1"
                        },
                        street: "Still Here"
                    }
                ]
            })

            await authController.deleteAddress(req, res)

            expect(res.status).toHaveBeenCalledWith(500)
            expect(res.json).toHaveBeenCalledWith({
                message: "Failed to delete address"
            })
        })

        it("returns 500 when delete address fails", async () => {
            const req = {
                user: {
                    id: "user-1"
                },
                params: {
                    addressId: "addr-1"
                }
            }
            const res = createResponse()

            userModel.findOneAndUpdate.mockRejectedValue(new Error("db failed"))

            await authController.deleteAddress(req, res)

            expect(res.status).toHaveBeenCalledWith(500)
            expect(res.json).toHaveBeenCalledWith({
                message: "failed to delete address",
                error: "db failed"
            })
        })
    })
})
