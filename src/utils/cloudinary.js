import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs' // Nodejs by default provides facilty for file systems ie fs

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// local file path url to be passed in the method to upload the file on cloudinary
const uploadOnCloudinary = async (localFilePath) => 
    {
        try {
            if(!localFilePath){
                console.log("No file path found to upload");
                return null;
            }

            const response = await cloudinary.uploader.upload(localFilePath, {
                resource_type: "auto"
            })
            // file has been successfully uploaded
            //console.log("file is uploaded on cloudinary", response.url); // HW -> study response object
            fs.unlinkSync(localFilePath) // remove the local copy
            return response; // here we are returning whole response for study but we should only pass response.url !!
            // after successfull upload we should remove the locally stored files
            
        } catch (error) {
            // if for any reason upload operation gets failed
            // for safe cleaning purpose we should remove the files being uploaded 
            // from our local servers which are saved temporarily.
            // For this we use syncronous unlink file system function -> fs.unlinkSync(localPatch)
            // This function simply unlink the files from the file system (fs) tree, and 
            // since it is syncronous we won't move further without its completion.
            fs.unlinkSync(localFilePath);
            return null;
            
        }
    }

export {uploadOnCloudinary}