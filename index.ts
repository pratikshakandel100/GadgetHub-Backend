import app from './src/app';

import { PORT as SERVER_PORT } from './src/config/constant';
import { connectToMongoDB } from './src/database/mongodb';

connectToMongoDB()
    .then(()=>{
        console.log("MongoDB connection established, starting server....")
    })
    .catch((error) => {
        console.log("Failed to connect to MongoDB, server not started", error);
    });

    app.listen(
        SERVER_PORT,
        ()=>{
            console.log(`Server running: ${SERVER_PORT}`);
        }
    )