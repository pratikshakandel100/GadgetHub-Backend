import app from './src/app';
import dotenv from "dotenv";

import { PORT as SERVER_PORT } from './src/config/constant';
import { connectToMongoDB } from './src/database/mongodb';
import { UserMongoRepository } from './src/repositories/user.repository';
import { ProductSearchService } from './src/services/product-search.service';

dotenv.config();

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function scheduleResetFieldsCleanup() {
    const userRepository = new UserMongoRepository();
    const runCleanup = () => {
        userRepository
            .cleanupExpiredResetFields(new Date(Date.now() - ONE_DAY_MS))
            .catch((error) => console.error("Failed to clean up expired reset-password fields", error));
    };
    runCleanup();
    setInterval(runCleanup, ONE_DAY_MS);
}

connectToMongoDB()
    .then(()=>{
        console.log("MongoDB connection established, starting server....")
        scheduleResetFieldsCleanup();
        const productSearch = new ProductSearchService();
        if (productSearch.enabled) {
            productSearch.rebuild().then(() => console.log("Meilisearch product index synchronized"))
                .catch((error) => console.error("Failed to synchronize Meilisearch product index", error));
        }
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
