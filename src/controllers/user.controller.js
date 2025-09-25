import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        
        const user = await User.findById(userId)
        
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        // we save a copy of the refreshToken in the user's DB for our verification
        user.refreshToken = refreshToken
        // saving the new changes
        await user.save({ validateBeforeSave: false}) // validation is false to avoid password verification for this

        return {accessToken, refreshToken}
        
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating Access and Refresh tokens")
    }
}

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

    const existedUser = await User.findOne({  // method returns reference of the existing user
        $or: [{ email }, { username }] // PRO SYNTAX
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    // 4. Check for compulsory data, like check for avatar and check for images
    const avatarLocalPath = req.files?.avatar[0]?.path;  // extracting local path which is used by the multer to store the file
    console.log(req.files)
    // NOTE:- here we are using 'req.files' -> file in plural because we are accepting multiple files in an array using multer
     //const coverImageLocalPath = req.files?.coverImage[0]?.path;  <- // this syntax will create issue as we do not know that the coverImage is present or if present, is it an array or not
     // so use the following to check

    let coverImageLocalPath; // scope issues ke liye 'let' also 'const' value needs to be initiated while declaring
    // check:
    // 1. whether we have the coverImage file? -> req.files
    // 2. is the coverImage file an Array or not (multer makes it)
    // 3. if it is an array it has length > 0
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

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
    const createdUser = await User.findById(user._id).select(" -password -refreshToken")

    // 9. Check has user created successfully or received null in response
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    
    // 10. return response (res) using our APiResponse Utility
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User created successfully!")
    )
} )


const loginUser = asyncHandler( async(req, res) => {

    // 1. get data from req.body to analyse and process
    const {email, username, password} = req.body
    
    // 2. username or email based login
    if (!(username || email )){
        throw new ApiError(400, "email or username is required")
    }

    // 3. find if the user exists

    const user = await User.findOne({
        $or: [{email}, {username}]
    })
    // Note: 
    // 1. in the 'user', the refresh tokens are empty right not!
    // 2. the 'user' has password and refresh token fields which we do not want to sent in the response, so we should remove it

    if(!user){
        throw new ApiError(404, "User does not exist")
    }

    // 4. check correct password
    const isPasswordValid = await user.isPasswordCorrect(password)    // NOTE:- we call this Fn on 'user' not on 'User'

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials")
    }

    // 5. generate access and refresh tokens
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)  // method at the top of this file

    // since we have made changes to the user's tokens, we either need to get a fresh 'user' from the DB with latest values or we can simply update fields of the current refrence 'user'

    // getting fresh 'user' needs a DB query which can be expensive, so choose according to your needs
    // do not save password and refresh token
    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // setting options for cookies
    const options = {
        httpOnly: true,
        secure: true
    }

    // 6. send cookies containing tokens
    return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        // data we send in response
                        user : loggedInUser, 
                        accessToken, // accessToken: accessToken    --> since both key and value names are same, we can just write value
                        refreshToken // refreshToken: refreshToken
                    },
                    "User logged In Successfully"
                )
            )

    
})

const logoutUser = asyncHandler( async(req, res) => {
    // implementing the 'auth' middleware, we have added the user into the req
    // now we know details of the current user to logout
    await User.findByIdAndUpdate(    // this functtion finds and update in one go
        req.user._id,
        // update we need ->
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new: true   // indicates to send back the new updated info
        }

    ) 

    // setting options for cookies
    const options = {
        httpOnly: true,
        secure: true
    }

    // for logout we need to clear cookies too

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json( new ApiResponse(200, {}, "User Logged Out"))
})


const refreshAccessToken = asyncHandler( async (req, res) => {
    // taking out the refresh token sent from the frontend from the user

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken   // <- the RHS is for handling requests from mobile

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        // now verifying received token using JWT
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        // since we have saved '_id' in the refresh token as payload, we can use this ID to fetch user data from the DB
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid Refresh Token")
        }
    
        // now we can match users
        // first user is the one who is sending the incoming token
        // 2nd user is the one which we got from the DB when we decoded the payload_data using the 'incomingRefreshToken'
        // finally matching both the users
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh Token is expired or used")
        }
    
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(200,
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
        
    }
})

const changeCurrentPassword = asyncHandler( async (req, res) => {
    const {oldPassword, newPassword} = req.body

    // getting the user refrence from the DB using the auth middleware
    const user = await User.findOne(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid Old Password")
    }

    user.password = newPassword

    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse (200, {}, "Password changed successfully"))
})


// while routing for the updateAccountDetails, make sure the user is logged in
// for this we need middlewares
// one for logged in secured route
// 2nd to accept media files to update (in the updateAvatar controller)
const updateAccountDetails = asyncHandler(async (req, res) => {
    const {fullName, email} = req.body // just for example

    if(!fullName || !email){
        throw new ApiError(400, "All fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName, // fullName: fullName
                email // email: email
            }
        },
        {
            new: true   // return the updated values
        }

    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Account details updated successfully"))

})


const updateUserAvatar = asyncHandler( async (req, res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400, "Error while uploading Avatar on cloud")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,

        {
            $set : {
                avatar: avatar.url
            }
        },
        {
            new:true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar is updated successfully"))
})

const updateUserCoverImage = asyncHandler( async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover Image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400, "Error while uploading Cover Image on cloud")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,

        {
            $set : {
                coverImage: coverImage.url
            }
        },
        {
            new:true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image is updated successfully"))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage

}