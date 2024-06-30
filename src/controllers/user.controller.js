import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

const generateAccessAndRefreshTokens=async(userId)=>{
    try {
        const user=await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})

        return {accessToken,refreshToken}
    } catch (error) {
        throw new ApiError(500,'Something went wrong while generating refresh and access token.')
    }
}

const registerUser=asyncHandler(async (req,res)=>{
    //get user details from frontend 
    //validation-not empty
    //check if user already exists: username, email
    //files
    //upload them to cloudinary
    //check avatar
    //create user object - create entry in db
    //remove password and refresh token fiels from response
    //check for user creation

    const {fullName, email,username,password}=req.body
    console.log("Email:",email)

    // if (fullName===""){
    //     throw new ApiError
    // }

    if([fullName,email,username,password].some((field)=>field?.trim()==="")){
        throw new ApiError(400,"All fields are required")
    }

    const existedUser= await User.findOne({
        $or:[{username},{email}]
    })

    if (existedUser){
        throw new ApiError(409,"User with email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path; //path from multer

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }


    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }
    const avatar=await uploadOnCloudinary(avatarLocalPath)
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar){
        throw new ApiError(400,"Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "", //need to check coverimage
        email,
        password,
        username:username.toLowerCase()
    })

    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken" 
    )

    if (!createdUser){
        throw new ApiError(500,"Something went wrong when registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered Successfully")
    )
    // res.status(200).json({
    //     message:'ok'
    // }
    // )
})

const loginUser=asyncHandler(async(req,res)=>{
    //req.body -> data
    // username or email
    // find the user
    // check pw
    // access and refresh token
    // send cookie
    const{username,email,password}=req.body
    
    if(!(username || email)){
        throw new ApiError(400,'Username or email is required.')
    }
    console.log("Finding user with", { username, email });
    const user= await User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new ApiError(400,'User Does not exist')
    }
     
    const isPasswordValid = await user.isPasswordCorrect(password)
    
    if (!isPasswordValid){
        throw new ApiError(400,'Invalid credentials')
    }

    const{accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)

    const loggedInUser=await User.findById(user._id).select(-password -refreshToken)

    const options={
        httpOnly:true,
        secure:true
    }
    return res.status(200)
                .cookie("accessToken",accessToken,options)
                .cookie("refreshToken",refreshToken,options)
                .json(
                    new ApiResponse(
                        200,
                    {
                        user:loggedInUser,accessToken,refreshToken
                    },"User Logged in successfully"
                    )
                )
})

const logoutUser=asyncHandler(async(req,res)=>{
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )
    const options={
        httpOnly:true,
        secure:true,
    }
    return res  
            .status(200)
            .clearCookie('accessToken')
            .clearCookie('refreshToken')
            .json(new ApiResponse(200,{},'User Logged Out'))
})

const refreshAccessToken= asyncHandler(async (req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken;

    if(incomingRefreshToken){
        throw new ApiError(401,"Unauthorized request") //token
    }
    try {
        const decodedToken=jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
    
        )
        const user=await User.findById(decodedToken?._id)
    
        if (!user){
            throw new ApiError(401,"Invalid refresh token")
        }
    
        if (incomingRefreshToken !==user?.refreshToken){
            throw new ApiError(401,"Refresh token is expired or used.")
        }
    
        const options ={
            httpOnly:true,
            secure:true
        }
        await generateAccessAndRefreshTokens(user._id)
        return res.status(200)
                    .cookie('accessToken',accessToken,options)
                    .cookie('refreshToken',newRefreshToken,options)
                    .json(
                        new ApiResponse(
                            200,
                            {accessToken,refreshToken:newRefreshToken},
                            'Access token refreshed'
                        )
                    )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh Token.")
    }
})

const changeCurrentPassword=asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body

    const user=await User.findById(req.user?._id)
    const isPasswordCorrect= await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(401,"Invalid old password.")
    }
    user.password=newPassword
    user.save({validateBeforeSave:false})

    return res
            .status(200)
            .json(new ApiResponse(200,{},"Password changed Successfully."))

})

const getCurrentUser=asyncHandler(async(req,res)=>{
    return res
            .status(200)
            .json(new ApiResponse(200,req.user,"Current user fetched sucessfully."))
})

const updateAccountDetails=asyncHandler(async(req,res)=>{
    const {fullName,email}=req.body

    if (!fullName || !email){
        throw new ApiError(400,"Username or email is required")
    }
    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email,
            }
        },
        {new:true}
    ).select("-password")

    return res  
            .status(200)
            .json(new ApiResponse(200,user,"Account details updated successfully"))
})

const updateUserAvatar=asyncHandler(async(req,res)=>{
    // TODO-delete old user
    const avatarLocalPath=req.file?.path
    if (!avatarLocalPath){
        throw new ApiError(400,"Avatar file missing.")
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading avatar.")
    }

    const user= await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res
            .status(200)
            .json(
                new ApiResponse(200,user,"Cover Image updated successfully.")
            )
})

const updateUserCoverImage=asyncHandler(async(req,res)=>{
    const coverImageLocalPath=req.file?.path
    if (!avatarLocalPath){
        throw new ApiError(400,"Cover Image file missing.")
    }

    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading cover Image")
    }

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password")

    return res
            .status(200)
            .json(
                new ApiResponse(200,user,"Cover Image updated successfully.")
            )
})

const getUserChannelProfile=asyncHandler(async(req,res)=>{
    const {username}=req.params

    if(!username?.trim()){
        throw new ApiError(400,"Username is missing.")
    }

    // const user=User.find({username})
    const channel = await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullName:1,
                usename:1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1,
            }
        }
    ])
// console.log(channel)
    if (!channel?.length){
        throw new ApiError(404,"Channel does not exist")
    }
    return res
            .status(200)
            .json(
                new ApiResponse(200,'User channel fetched successfully.')
            )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
}
