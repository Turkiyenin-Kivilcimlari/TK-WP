import mongoose, { Document, Model, Schema } from 'mongoose';

// Define the interface for Supporter document
export interface ISupporter extends Document {
  name: string;
  title: string;
  photo?: string;
  order: number;
}

// Create the schema
const SupporterSchema = new Schema<ISupporter>({
  name: { type: String, required: true },
  title: { type: String, required: true },
  photo: { type: String },
  order: { type: Number, default: 0 },
});

// Handle client-side rendering to prevent model compilation errors
let Supporter: Model<ISupporter>;

// Handle server-side vs client-side environments properly
if (typeof window === "undefined") {
  // We're on the server side
  try {
    // Check if the model is already registered
    Supporter = mongoose.models.Supporter || 
                mongoose.model<ISupporter>("Supporter", SupporterSchema);
  } catch (e) {
    // Create the model if not registered
    Supporter = mongoose.model<ISupporter>("Supporter", SupporterSchema);
  }
} else {
  // We're on the client side, return an empty object
  // @ts-ignore - Ignore TypeScript errors here
  Supporter = {} as Model<ISupporter>;
}

export default Supporter;
