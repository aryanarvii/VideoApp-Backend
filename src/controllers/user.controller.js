import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler( async(req, res) => {
    // 1. get user details from the frontend
    const {fullName, email, username, password} = req.body
    console.log(req.body)
    console.log("email: ", email)
    // 2. validation of the data being passed -> data not empty or etc

    // BEGINNERS METHOD TO VALIDATE DATA ->
    // if(fullName === ""){
    //     throw new ApiError(400, "Full name is required")
    // }

    // if(email === ""){
    //     throw new ApiError(400, "Email is required")
    // }

    // if(username === ""){
    //     throw new ApiError(400, "username is required")
    // }

    // if(password === ""){
    //     throw new ApiError(400, "password is required")
    // }    

    // PROS METHOD TO VALIDATE DATA
    

    if ( [fullName, email, username, password].some((field) => field?.trim() === "")    ) {
        throw new ApiError(400, "All fields are required")
    }

    // further we can also validate formating of the data like email includes '@' or not and etc etc
    // for this in production level we build a file of validation functions separately

    // 3. check if the user already exists -> username, email
    // 'User' from models file can communicate to the DB as it is built using mongoose!!

    // PRO method to check whether the user exists or not
    // here we are finding either username or email of the user
    // we can also find using just one property

    const existedUser = User.findOne({  // method returns reference of the existing user
        $or: [{ email }, { username }] // PRO SYNTAX
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    // 4. Check for compulsory data, like check for avatar and check for images
    
    const avatarLocalPath = req.files?.avatar[0]?.path;  // extracting local path which is used by the multer to store the file
    console.log(req.files)

    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }
    // checking only for avatar as it is mandatory and coverImage is optional that's why no need to check for it



    // 5. upload the media files to cloudinary using uploadOnCloudinary(), check avatar uploaded or not
    
    // Using 'await' as uploading a file can take some time, and before completing this upload we should not move forward!!
    const avatar = await uploadOnCloudinary(avatarLocalPath) 
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    // Again check avatar has been uploaded properly or not as it is a mandatory field, code fatt sakta hai
    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }
    
    //    after uploading uploadOnCloudinary() returns a response\


    // 6. Now create an user object (since we store data in the form of objects in mongodb)
    // Using 'User' we can communicate to the DB
    // 7. now create an entry for the new user in the DB
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "", // we have not checked for this hence here checking, if no coverImage then make it empty string
        email,
        password,
        username: username.toLowerCase()
    })

    // when an entry is created, in return all the data is received, even the hashed password of the user too
    // we don't want password in the response 

    // check whether the user created?
    // if the user exists we can remove the fields we want by function chaining
    // by default mongodb adds an '_id' field to each new entry 

    // 8. remove (password and refresh token field) from response --- handled above
    const createdUser = User.findById(user._id).select(" -password -refreshToken")

    // 9. Check has user created successfully or received null in response
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    
    // 10. return response (res) using our APiResponse Utility
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User created successfully!")
    )
} )

export {registerUser}