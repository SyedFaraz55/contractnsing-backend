require("dotenv").config();
const aws = require('aws-sdk')
const fs = require("fs")
const crypto = require('crypto')
const {promisify} =  require('util')
const region = 'ap-south-1'
const bucketName = 'natmarts'
const accessKeyId = process.env.ACCESS_KEY_ID
const secretAccessKey = process.env.SECRET_KEY

const s3 = new aws.S3({
    region,
    accessKeyId,
    secretAccessKey,
    signatureVersion:'v4'
})


module.exports.generateUploadURL =async  ()=> {
    const rawBytes = await crypto.randomBytes(16)
    const image = rawBytes.toString('hex')

    const params = {
        Bucket:bucketName,
        Key:image,
        Expires:60
    }

    const url =  await s3.getSignedUrlPromise('putObject',params) 
    return url
}

module.exports.uploadFile = file => {
    console.log(file)
    const fileStream = fs.createReadStream(file.path)

    const params = {
        Bucket:bucketName,
        Body:fileStream,
        Key:file.filename
    }

    return s3.upload(params).promise()
}