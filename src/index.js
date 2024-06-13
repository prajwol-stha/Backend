// require('dotenv').config({path:'./env'})
import dotenv from 'dotenv'
import connectDB from "./db/index.js";
import { app } from './app.js';

// import mongoose from "mongoose";
// import {DB_NAME} from './constants'
// import express from 'express'
// const app=express()

/* first approach
;(async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        application.on("error",()=>{
            console.log("ERRR:",error);
            throw error
        })
        app.listen(process.env.PORT,()=>{
            console.log(`App is listing on port ${process.env.PORT}`);
        })
    } catch (error) {
        console.log("ERROR:",error)
        throw error
    }
})()

*/

dotenv.config({
    path:'./env'
})

connectDB()
    .then(()=>{
        app.listen(process.env.PORT || 8000,()=>{
            console.log(`Server started at port:${process.env.PORT || 8000}`)
        })
    })
    .catch((err)=>{
        console.log("MONGODB CONNECTION IS FAILED:",err)
    })
