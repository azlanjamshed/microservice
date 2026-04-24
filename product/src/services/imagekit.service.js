const ImageKit = require("imagekit")
const { randomUUID } = require("crypto")

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
})

async function uploadFile({ buffer, filename, folder = "/products" }) {
  return new Promise((resolve, reject) => {
    imagekit.upload(
      {
        file: buffer,
        fileName: filename || randomUUID(),
        folder
      },
      (error, result) => {
        if (error) {
          return reject(error)
        }
        resolve(result)
      }
    )
  })
}
async function uploadMultipleFiles(files = []) {
  if (!Array.isArray(files)) {
    throw new Error("files must be an array")
  }

  const results = await Promise.all(
    files.map(file =>
      uploadFile({
        buffer: file.buffer,
        filename: file.originalname
      })
    )
  )

  return results
}

module.exports = { uploadMultipleFiles }
