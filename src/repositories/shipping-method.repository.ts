import ShippingMethod, { IShippingMethod } from "../models/shipping-method.model";
import { CreateShippingMethodDTO } from "../dtos/shipping-method.dto";
import { stripUndefined } from "../utils/object.util";

export interface IShippingMethodRepository {
    create(data: CreateShippingMethodDTO): Promise<IShippingMethod>;
    getAll(): Promise<IShippingMethod[]>;
    getActive(): Promise<IShippingMethod[]>;
    getById(id: string): Promise<IShippingMethod | null>;
    findByName(name: string): Promise<IShippingMethod | null>;
    update(id: string, data: Partial<IShippingMethod>): Promise<IShippingMethod | null>;
    delete(id: string): Promise<boolean>;
}

export class ShippingMethodMongoRepository implements IShippingMethodRepository {
    async create(data: CreateShippingMethodDTO): Promise<IShippingMethod> {
        return await ShippingMethod.create(data);
    }

    async getAll(): Promise<IShippingMethod[]> {
        return await ShippingMethod.find().sort({ sortOrder: 1, createdAt: 1 });
    }

    async getActive(): Promise<IShippingMethod[]> {
        return await ShippingMethod.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 });
    }

    async getById(id: string): Promise<IShippingMethod | null> {
        return await ShippingMethod.findById(id);
    }

    async findByName(name: string): Promise<IShippingMethod | null> {
        return await ShippingMethod.findOne({ name });
    }

    async update(id: string, data: Partial<IShippingMethod>): Promise<IShippingMethod | null> {
        return await ShippingMethod.findByIdAndUpdate(
            id,
            { $set: stripUndefined(data) },
            { new: true, runValidators: true }
        );
    }

    async delete(id: string): Promise<boolean> {
        const deleted = await ShippingMethod.findByIdAndDelete(id);
        return !!deleted;
    }
}
