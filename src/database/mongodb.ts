import mongoose from "mongoose";
import dns from "dns";
import { MONGODB_URI } from "../config/constant";

// Some ISP/router DNS servers don't answer Node's c-ares SRV queries
// even though OS-level lookups work, which breaks mongodb+srv:// URIs.
// Force a public resolver so the SRV lookup for Atlas succeeds.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

export const connectToMongoDB = async()=>{
    try{
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MOngoDB");
    } catch(error){
        console.error("Error connection to MongoDB:", error);
        throw error;
    }
}