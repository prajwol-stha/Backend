import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from 'bcrypt'

const userSchema=new Schema({
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
    },
    fullName:{
        type:String,
        required:true,
        lowercase:true,
        trim:true,
        index:true,
    },
    avatar:{
        type:String,
        required:true,
    },
    coverImage:{
        type:String,
    },
    watchHistory:[
        {
            type:Schema.Types.ObjectId,
            ref:'Video'
        }
    ],
    password:{
        type:String,
        required:[true,'Password is required']
    },
    refreshToken:{
        type:String,
    }
},
    {timestamps:true}

)

userSchema.pre("save",async function(next){
    //dont use arrow function because it does not have #this
    if(!this.isModified('password')) return next();
    this.password= await bcrypt.hash(this.password,10) //takes time to encrypt
    next()
})

userSchema.methods.isPasswordCorrect=async function (password){
    
    return await bcrypt.compare(password,this.password)    //this.password is encrypted one
}
userSchema.methods.generateAccessToken= function (){
    return jwt.sign({
        _id:this._id,
        email:this.email,
        username:this.username,
        fullName:this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        // expiresIn:process.env.ACCESS_TOKEN_EXPIRY
        expiresIn:1000
    }
)
}
userSchema.methods.generateRefreshToken= function (){
    return jwt.sign({
        _id:this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        // expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        expiresIn:3600
    }
)
}

export const User=mongoose.model("User",userSchema)

//this user can directly connect with mongodb database
