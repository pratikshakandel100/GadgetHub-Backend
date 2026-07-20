import ShippingAddress, { IShippingAddress } from "../models/shipping-address.model";
import { CreateShippingAddressDTO, UpdateShippingAddressDTO } from "../dtos/shipping-address.dto";

export interface IShippingAddressRepository {
    getAllByUser(userId: string): Promise<IShippingAddress[]>;
    getById(id: string): Promise<IShippingAddress | null>;
    create(userId: string, data: CreateShippingAddressDTO): Promise<IShippingAddress>;
    update(id: string, data: UpdateShippingAddressDTO): Promise<IShippingAddress | null>;
    delete(id: string): Promise<boolean>;
    unsetDefaultForUser(userId: string, excludeId?: string): Promise<void>;
    countByUser(userId: string): Promise<number>;
    promoteMostRecentToDefault(userId: string): Promise<void>;
}

export class ShippingAddressMongoRepository implements IShippingAddressRepository {
    async getAllByUser(userId: string): Promise<IShippingAddress[]> {
        return await ShippingAddress.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });
    }

    async getById(id: string): Promise<IShippingAddress | null> {
        return await ShippingAddress.findById(id);
    }

    async create(userId: string, data: CreateShippingAddressDTO): Promise<IShippingAddress> {
        return await ShippingAddress.create({ ...data, user: userId });
    }

    async update(id: string, data: UpdateShippingAddressDTO): Promise<IShippingAddress | null> {
        return await ShippingAddress.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    }

    async delete(id: string): Promise<boolean> {
        const deleted = await ShippingAddress.findByIdAndDelete(id);
        return !!deleted;
    }

    async unsetDefaultForUser(userId: string, excludeId?: string): Promise<void> {
        const query: any = { user: userId, isDefault: true };
        if (excludeId) query._id = { $ne: excludeId };
        await ShippingAddress.updateMany(query, { $set: { isDefault: false } });
    }

    async countByUser(userId: string): Promise<number> {
        return await ShippingAddress.countDocuments({ user: userId });
    }

    async promoteMostRecentToDefault(userId: string): Promise<void> {
        const mostRecent = await ShippingAddress.findOne({ user: userId }).sort({ createdAt: -1 });
        if (mostRecent) {
            mostRecent.isDefault = true;
            await mostRecent.save();
        }
    }
}
