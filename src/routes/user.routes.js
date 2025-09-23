import { Router } from "express";
import { loginUser, logoutUser, refreshAccessToken, registerUser } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(  // <-- agar 'register' route pe aaye toh 'post' method use karo
    upload.fields([             // upload is a multer middleware to handle media files being received
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        },
    ]),
    registerUser)


router.route("/login").post(loginUser)

// secured routes which is accessable only when the user is logged-in
router.route("/logout").post(verifyJWT ,logoutUser) // verifyJWT is a middleware
router.route("/refresh-token").post(refreshAccessToken)


export default router