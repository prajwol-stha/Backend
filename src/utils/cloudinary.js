import { v2 as cloudinary} from "cloudinary";
import fs from 'fs'

import {v2 as cloudinary} from 'cloudinary';

import {v2 as cloudinary} from 'cloudinary';
import { response } from "express";


cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const UploadOnCloudinary=async(localFilePath)=>{
    try {
        if (!localFilePath) return null
        cloudinary.uploader.upload(localFilePath,{resource_type:'auto'})
        console.log('File uploaded to cloudinary',response.url)
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath)//cleaning purpose in case upload fails    
    }
}

export {UploadOnCloudinary}