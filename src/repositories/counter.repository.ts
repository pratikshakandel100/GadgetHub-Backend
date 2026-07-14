import Counter from "../models/counter.model";

export interface ICounterRepository {
    getNextSequence(key: string): Promise<number>;
}

export class CounterMongoRepository implements ICounterRepository {
    async getNextSequence(key: string): Promise<number> {
        const counter = await Counter.findOneAndUpdate(
            { key },
            { $inc: { seq: 1 } },
            { upsert: true, new: true }
        );
        return counter.seq;
    }
}
