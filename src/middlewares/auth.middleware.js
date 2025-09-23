// this middleware will verify that the user is present or not.
// we can use this middleware whenever wherever we need to check the authentication of the logged user to proceed further

import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import {User} from "../models/user.model.js"

// We verify by checking the Access and Referesh Tokens.
// If the tokens are valid -> add 'user' object into the request (req) => req.user

export const verifyJWT = asyncHandler( async (req, res, next) =>{ // we are not using "res" here, so we can replace it with "_"

    try {
        // req has access to cookies since cookies is a middleware (refer app.js file)
        // for mobile applications we use header 
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    
        if(!token){
            throw new ApiError(401, "Unauthorized request")
        }
        
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET) // sometimes we need to use await for jwt
    
        const user = await User.findById(decodedToken?._id).select(" -password -refreshToken")
    
        if(!user){
            throw new ApiError(401, "Invalid Access Token")
        }
    
        // now adding an object user (or whatever name we like) in the req
        req.user = user  // the user as a value is the above user
        next() // move to next middleware if available 

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token")
    }

})