import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';


// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload function
const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null
        //uploads file to cloudinary
        const response = cloudinary.uploader.upload(localFilePath, { 
          resource_type: "auto",
        })
        //file has been uploaded
        console.log('Cloudinary Upload Response:', response.url);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) //remove the locally saved temperary file as the upload operation got failed
        return null;
    }
};
    
export { uploadOnCloudinary };