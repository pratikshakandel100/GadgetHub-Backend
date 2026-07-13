import app from './app';
import dotenv from "dotenv";

import { PORT as SERVER_PORT } from './config/constant';
import { connectToMongoDB } from './database/mongodb';

dotenv.config();
connectToMongoDB()
    .then(()=>{
        console.log("MongoDB connection established, starting server....")
    })
    .catch((error) => {
        console.log("Failed to connect to MongoDB, server not started", error);
    });

   app.listen(
    SERVER_PORT,  // start backend in this PORT
    () => {
        console.log(`Server: http://localhost:${SERVER_PORT}`); // backtick
    }
);
