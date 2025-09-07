import mongoose, { Schema }  from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
    {

        username:{
            type:String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },

        email:{
            type:String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        fullName :{
            type:String,
            required: true,
            trim: true,
            index: true,
        },

        avatar: {
            type: String, //cloudinary URL
            required: true
        },

        coverImage: {
            type: String //cloudinary URL
        },

        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],

        password: {
            type: String,
            required: [true, "Password is required"]
        },

        refreshToken:{
            type: String
        }
    
    },

    {
        timestamps: true
    }

)

userSchema.pre("save", async function (next){
    // the function is async as hashing can take time

    // applying a check to avoid unneccessary hashing of same password everytime we save changes in DB
    // specifically checking is password modified or not
    if(!this.isModified("password")) return next(); 

    // if password is modified then we do hashing
    this.password = await bcrypt.hash(this.password, 10)
    next()
})

// in the userSchema we have methods and in that 
// we can add our own methods to use it over the schema 
// if whatever we have specified is not already in the methods!!
// Adding our function below->
userSchema.methods.isPasswordCorrect = async function(password){ // Do not use arrow func as it 
// do not has reference 'this' for the current object
    return await bcrypt.compare(password, this.password) // returns a boolean value
}

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            // info we need in the payload ->
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            // it has less info than access tokens
            _id: this._id,
        },
        process.env.REFFRESH_TOKEN_SECRET,
        {
            expiresIn: REFFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema)