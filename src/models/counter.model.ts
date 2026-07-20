import mongoose, { Schema, Document } from "mongoose";

export interface ICounter extends Document {
    _id: mongoose.Types.ObjectId;
    key: string;
    seq: number;
}

const CounterMongoSchema: Schema = new Schema<ICounter>({
    key: { type: String, required: true, unique: true },
    seq: { type: Number, required: true, default: 0 }
});

export default mongoose.model<ICounter>("Counter", CounterMongoSchema);
