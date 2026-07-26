import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongod: MongoMemoryServer | null = null;

export const connectTestDb = async (): Promise<void> => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
};

export const clearTestDb = async (): Promise<void> => {
    const { collections } = mongoose.connection;
    await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
};

export const closeTestDb = async (): Promise<void> => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (mongod) await mongod.stop();
};
