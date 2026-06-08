import mongoose from "mongoose";
import { MONGODB_URL } from "../config/constant";

export const connectToMongoDB = async()=>{
    try{
        await mongoose.connect(MONGODB_URL);
        console.log("Connected to MOngoDB");
    } catch(error){
        console.error("Error connection to MongoDB:", error);
        throw error;
    }
}