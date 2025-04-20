import mongoose, { Document, Schema, Model } from 'mongoose';

// Beğeni/Beğenmeme için arayüz
export interface Reaction {
  user: mongoose.Types.ObjectId;
  type: 'like' | 'dislike';
  createdAt: Date;
}

export interface IComment extends Document {
  content: string;
  author: mongoose.Types.ObjectId | string;
  article: mongoose.Types.ObjectId | string;
  parent?: mongoose.Types.ObjectId | string | null; // Üst yorum ID'si
  reactions: Reaction[];
  likeCount: number;
  dislikeCount: number;
  createdAt: Date;
  updatedAt: Date;
  updateReactionCounts(): Promise<void>;
}

// Beğeni/Beğenmeme şeması
const reactionSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['like', 'dislike'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Şema tanımı
const commentSchema = new Schema<IComment>(
  {
    content: {
      type: String,
      required: [true, 'Yorum içeriği zorunludur'],
      trim: true,
      maxlength: [2000, 'Yorum en fazla 2000 karakter olabilir']
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Yazar bilgisi zorunludur']
    },
    article: {
      type: Schema.Types.ObjectId,
      ref: 'Article',
      required: [true, 'Makale bilgisi zorunludur']
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null
    },
    reactions: {
      type: [reactionSchema],
      default: []
    },
    likeCount: {
      type: Number,
      default: 0
    },
    dislikeCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Beğeni sayılarını güncelleme metodu
commentSchema.methods.updateReactionCounts = async function() {
  const likes = this.reactions.filter((reaction: Reaction) => reaction.type === 'like').length;
  const dislikes = this.reactions.filter((reaction: Reaction) => reaction.type === 'dislike').length;
  
  this.likeCount = likes;
  this.dislikeCount = dislikes;
  
  await this.save();
};

// Index ekle
commentSchema.index({ article: 1, parent: 1 });
commentSchema.index({ article: 1, createdAt: -1 });

// Güvenli model tanımlaması
let Comment: Model<IComment>;

try {
  // Mongoose modelini al veya oluştur
  Comment = mongoose.models.Comment || mongoose.model<IComment>('Comment', commentSchema);
} catch (error) {
  // Model yoksa oluştur
  Comment = mongoose.model<IComment>('Comment', commentSchema);
}

export default Comment;
