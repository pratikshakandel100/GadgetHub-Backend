import { ShippingAddressMongoRepository } from "../repositories/shipping-address.repository";
import { CreateShippingAddressDTO, UpdateShippingAddressDTO } from "../dtos/shipping-address.dto";
import { IShippingAddress } from "../models/shipping-address.model";
import { HttpException } from "../exceptions/http-exception";

const shippingAddressRepository = new ShippingAddressMongoRepository();

export class ShippingAddressService {
    async getUserAddresses(userId: string): Promise<IShippingAddress[]> {
        return await shippingAddressRepository.getAllByUser(userId);
    }

    async getAddressById(userId: string, id: string): Promise<IShippingAddress> {
        const address = await shippingAddressRepository.getById(id);
        if (!address || address.user.toString() !== userId) {
            throw new HttpException(404, "Shipping address not found");
        }
        return address;
    }

    async createAddress(userId: string, data: CreateShippingAddressDTO): Promise<IShippingAddress> {
        const isFirstAddress = (await shippingAddressRepository.countByUser(userId)) === 0;
        const makeDefault = isFirstAddress || data.isDefault === true;

        if (makeDefault) {
            await shippingAddressRepository.unsetDefaultForUser(userId);
        }

        return await shippingAddressRepository.create(userId, { ...data, isDefault: makeDefault });
    }

    async updateAddress(userId: string, id: string, data: UpdateShippingAddressDTO): Promise<IShippingAddress> {
        await this.getAddressById(userId, id);

        if (data.isDefault === true) {
            await shippingAddressRepository.unsetDefaultForUser(userId, id);
        }

        const updated = await shippingAddressRepository.update(id, data);
        if (!updated) {
            throw new HttpException(500, "Failed to update shipping address");
        }
        return updated;
    }

    async deleteAddress(userId: string, id: string): Promise<void> {
        const address = await this.getAddressById(userId, id);

        const deleted = await shippingAddressRepository.delete(id);
        if (!deleted) {
            throw new HttpException(500, "Failed to delete shipping address");
        }

        if (address.isDefault) {
            await shippingAddressRepository.promoteMostRecentToDefault(userId);
        }
    }

    async setDefaultAddress(userId: string, id: string): Promise<IShippingAddress> {
        await this.getAddressById(userId, id);

        await shippingAddressRepository.unsetDefaultForUser(userId, id);
        const updated = await shippingAddressRepository.update(id, { isDefault: true });
        if (!updated) {
            throw new HttpException(500, "Failed to set default shipping address");
        }
        return updated;
    }
}
