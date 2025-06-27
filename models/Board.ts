import mongoose, { Schema, Document } from 'mongoose';

export interface IBoard extends Document {
  name: string;
  designation: string;
  quote: string;
  src: string;
  order: number; // Sıralama alanı eklendi
}

const BoardSchema = new Schema({
  name: {
    type: String,
    required: [true, "İsim alanı zorunludur"],
    trim: true
  },
  designation: {
    type: String,
    required: [true, "Ünvan alanı zorunludur"],
    trim: true
  },
  quote: {
    type: String,
    required: [true, "Alıntı alanı zorunludur"],
    trim: true
  },
  src: {
    type: String,
    required: [true, "Fotoğraf URL'i zorunludur"]
  },
  order: {
    type: Number,
    default: 0 // Varsayılan değer 0
  }
}, { timestamps: true });

// Board koleksiyonu için indeks oluştur
BoardSchema.index({ order: 1 });

// Mongoose modelini export et
const Board = mongoose.models.Board || mongoose.model<IBoard>('Board', BoardSchema);
export default Board;
