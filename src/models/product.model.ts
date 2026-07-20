import mongoose, {Schema, Document} from "mongoose";

export interface ISpecification {
  key: string;
  value: string;
}

export interface IVariant {
  type: string;
  values: string;
}

export interface IVariantAttribute {
  key: string;
  value: string;
}

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  category: mongoose.Types.ObjectId;
  subcategory?: mongoose.Types.ObjectId;
  brand: mongoose.Types.ObjectId;
  shortDescription: string;
  fullDescription: string;
  originalPrice: number;
  sellingPrice: number;
  discount: number;
  taxMargin?: number;
  stockQuantity: number;
  minimumStockAlert: number;
  availability: string;
  soldQuantity: number;
  lastRestockedAt?: Date;
  lastStockUpdatedBy?: mongoose.Types.ObjectId;
  specifications: ISpecification[];
  variants: IVariant[];
  variantAttributes: IVariantAttribute[];
  variantKey: string;
  seller: mongoose.Types.ObjectId;
  attributes: Map<string, string>;
  weight?: string;
  dimensions?: string;
  shippingCharge?: number;
  estimatedDelivery?: string;
  manufacturer?: string;
  countryOfOrigin?: string;
  whatsIncluded?: string;
  warranty?: string;
  returnPolicy?: string;
  mainImage?: string;
  galleryImages?: string[];
  thumbnailImage?: string;
  metaTitle?: string;
  metaDescription?: string;
  tags?: string;
  featured: boolean;
  newArrival: boolean;
  bestSeller: boolean;
  onSale: boolean;
  status: 'Draft' | 'Published';
  createdAt: Date;
  updatedAt: Date;
}

const ProductMongoSchema: Schema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    subcategory: { type: Schema.Types.ObjectId, ref: "Subcategory", required: false },
    brand: { type: Schema.Types.ObjectId, ref: "Brand", required: true },
    shortDescription: { type: String, required: true },
    fullDescription: { type: String, required: true },
    originalPrice: { type: Number, required: true },
    sellingPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    taxMargin: { type: Number, required: false },
    stockQuantity: { type: Number, required: true, default: 0 },
    minimumStockAlert: { type: Number, required: true, default: 5 },
    availability: {
      type: String,
      enum: ['In Stock', 'Out of Stock', 'Pre-order'],
      default: 'In Stock'
    },
    soldQuantity: { type: Number, required: true, default: 0 },
    lastRestockedAt: { type: Date, required: false },
    lastStockUpdatedBy: { type: Schema.Types.ObjectId, ref: "User", required: false },
    specifications: [{
      key: { type: String, required: true },
      value: { type: String, required: true }
    }],
    variants: [{
      type: { type: String, required: true },
      values: { type: String, required: true }
    }],
    variantAttributes: [{
      key: { type: String, required: true },
      value: { type: String, required: true }
    }],
    variantKey: { type: String, required: true },
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true },
    attributes: { type: Map, of: String, default: {} },
    weight: { type: String, required: false },
    dimensions: { type: String, required: false },
    shippingCharge: { type: Number, required: false },
    estimatedDelivery: { type: String, required: false },
    manufacturer: { type: String, required: false },
    countryOfOrigin: { type: String, required: false },
    whatsIncluded: { type: String, required: false },
    warranty: { type: String, required: false },
    returnPolicy: { type: String, required: false },
    mainImage: { type: String, required: false },
    galleryImages: [{ type: String }],
    thumbnailImage: { type: String, required: false },
    metaTitle: { type: String, required: false },
    metaDescription: { type: String, required: false },
    tags: { type: String, required: false },
    featured: { type: Boolean, default: false },
    newArrival: { type: Boolean, default: false },
    bestSeller: { type: Boolean, default: false },
    onSale: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['Draft', 'Published'],
      default: 'Draft'
    }
  },
  {
    timestamps: true
  }
);


ProductMongoSchema.index({ variantKey: 1 }, { unique: true, sparse: true });

export default mongoose.model<IProduct>(
  "Product",
  ProductMongoSchema
);
