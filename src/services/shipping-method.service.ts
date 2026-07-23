import { ShippingMethodMongoRepository } from "../repositories/shipping-method.repository";
import { CreateShippingMethodDTO, UpdateShippingMethodDTO } from "../dtos/shipping-method.dto";
import { IShippingMethod } from "../models/shipping-method.model";
import { HttpException } from "../exceptions/http-exception";

const shippingMethodRepository = new ShippingMethodMongoRepository();

export class ShippingMethodService {
    async createShippingMethod(data: CreateShippingMethodDTO): Promise<IShippingMethod> {
        const existing = await shippingMethodRepository.findByName(data.name);
        if (existing) {
            throw new HttpException(400, "A shipping method with this name already exists");
        }
        return await shippingMethodRepository.create(data);
    }

    async getAllShippingMethods(): Promise<IShippingMethod[]> {
        return await shippingMethodRepository.getAll();
    }

    async getActiveShippingMethods(): Promise<IShippingMethod[]> {
        return await shippingMethodRepository.getActive();
    }

    async getShippingMethodById(id: string): Promise<IShippingMethod> {
        const method = await shippingMethodRepository.getById(id);
        if (!method) {
            throw new HttpException(404, "Shipping method not found");
        }
        return method;
    }

    async updateShippingMethod(id: string, data: UpdateShippingMethodDTO): Promise<IShippingMethod> {
        const existing = await shippingMethodRepository.getById(id);
        if (!existing) {
            throw new HttpException(404, "Shipping method not found");
        }

        if (data.name && data.name !== existing.name) {
            const nameTaken = await shippingMethodRepository.findByName(data.name);
            if (nameTaken) {
                throw new HttpException(400, "A shipping method with this name already exists");
            }
        }

        const updated = await shippingMethodRepository.update(id, data);
        if (!updated) {
            throw new HttpException(500, "Failed to update shipping method");
        }
        return updated;
    }

    async deleteShippingMethod(id: string): Promise<void> {
        const existing = await shippingMethodRepository.getById(id);
        if (!existing) {
            throw new HttpException(404, "Shipping method not found");
        }
        const isDeleted = await shippingMethodRepository.delete(id);
        if (!isDeleted) {
            throw new HttpException(500, "Failed to delete shipping method");
        }
    }
}
