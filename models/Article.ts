import mongoose, { Document, Model, Schema } from 'mongoose';
import { UserRole } from './User';

// Block types
export enum BlockType {
  TEXT = 'text',
  HEADING = 'heading',
  IMAGE = 'image',
  CODE = 'code' // New code block type added
}

// Block structure
export interface Block {
  id?: string;
  type: BlockType;
  content?: string;
  level?: number;
  imageUrl?: string;
  language?: string;
}

// Article status
export enum ArticleStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

// Reaction interface
export interface Reaction {
  user: mongoose.Types.ObjectId;
  type: 'like' | 'dislike';
  createdAt: Date;
}

// Article interface
export interface IArticle extends Document {
  title: string;
  slug?: string;
  blocks: Block[];
  author: mongoose.Types.ObjectId;
  status: ArticleStatus;
  tags: string[];
  views: number;
  thumbnail?: string;
  reactions: Reaction[];
  likeCount: number;
  dislikeCount: number;
  publishedAt?: Date;
  rejection?: {
    reason?: string;
    date?: Date;
  };
  updateReactionCounts: () => Promise<void>;
}

// Check if code is running on the server or in the browser
const isServer = typeof window === 'undefined';

// Only create schema on the server
let Article: any;

if (isServer) {
  // Schema definition - Only create these on the server
  const blockSchema = new Schema({
    type: {
      type: String,
      enum: Object.values(BlockType),
      required: true
    },
    content: {
      type: String,
      default: ''
    },
    level: {
      type: Number,
      min: 1,
      max: 4
    },
    imageUrl: {
      type: String
    },
    language: {
      type: String // Language info for code blocks
    }
  });

  // Reaction schema
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

  const articleSchema = new Schema(
    {
      title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: [100, 'Title can be at most 100 characters']
      },
      slug: {
        type: String,
        // Remove index: true here to avoid duplicate index
        trim: true,
        lowercase: true
      },
      blocks: {
        type: [blockSchema],
        required: true,
        validate: {
          validator: function(blocks: Block[]) {
            return blocks && blocks.length > 0;
          },
          message: 'At least one content block is required'
        }
      },
      author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Author information is required']
      },
      status: {
        type: String,
        enum: Object.values(ArticleStatus),
        default: ArticleStatus.DRAFT
      },
      tags: {
        type: [String],
        default: []
      },
      views: {
        type: Number,
        default: 0
      },
      thumbnail: {
        type: String, 
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
      },
      publishedAt: {
        type: Date
      },
      rejection: {
        reason: { type: String, default: null },
        date: { type: Date, default: null }
      }
    },
    {
      timestamps: true
    }
  );

  // Update reaction counts method
  articleSchema.methods.updateReactionCounts = async function() {
    const likes = this.reactions.filter((reaction: Reaction) => reaction.type === 'like').length;
    const dislikes = this.reactions.filter((reaction: Reaction) => reaction.type === 'dislike').length;
    
    this.likeCount = likes;
    this.dislikeCount = dislikes;
    
    await this.save();
  };

  // Schema indexing
  articleSchema.index({ title: 'text' });
  articleSchema.index({ author: 1, status: 1 });
  articleSchema.index({ tags: 1 });
  articleSchema.index({ slug: 1 }); // Keep only this index for slug

  // Safe model definition
  try {
    // Get or create Mongoose model
    Article = mongoose.models.Article || mongoose.model<IArticle>('Article', articleSchema);
  } catch (error) {
    // Create model if it doesn't exist
    Article = mongoose.model<IArticle>('Article', articleSchema);
  }
} else {
  // In the browser, just provide enums and empty implementation
  Article = {
    find: () => Promise.resolve([]),
    findById: () => Promise.resolve(null),
    findOne: () => Promise.resolve(null),
  };
}

export default Article;
