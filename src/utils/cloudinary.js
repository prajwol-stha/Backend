import { v2 as cloudinary} from "cloudinary";
import fs from 'fs'
import { response } from "express";


cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary=async(localFilePath)=>{
    try {
        if (!localFilePath) return null

        const response=cloudinary.uploader.upload(localFilePath,{resource_type:'auto'})
        console.log('File uploaded to cloudinary',response.url)
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath)//cleaning purpose in case upload fails, removes the locally saved file in case the upload fails  
    }
}

export {uploadOnCloudinary}