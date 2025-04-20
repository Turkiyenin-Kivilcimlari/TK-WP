import mongoose, { Document, Schema, Model } from 'mongoose';
import { nanoid } from 'nanoid';
import slugify from 'slugify';

// Etkinlik tipleri
export enum EventType {
  IN_PERSON = 'IN_PERSON',
  ONLINE = 'ONLINE',
  HYBRID = 'HYBRID'
}

// Etkinlik durumu
export enum EventStatus {
  DRAFT = 'DRAFT', // Taslak
  PENDING_APPROVAL = 'PENDING_APPROVAL', // Onay bekliyor
  APPROVED = 'APPROVED', // Onaylandı
  REJECTED = 'REJECTED', // Reddedildi
  COMPLETED = 'COMPLETED', // Tamamlandı
  CANCELLED = 'CANCELLED', // İptal edildi
}

// Katılımcı tipi
interface Participant {
  userId: Schema.Types.ObjectId;
  name: string;
  lastname: string;
  email: string;
  registeredAt: Date;
}

// Etkinlik interface'i
export interface IEvent extends Document {
  title: string;
  slug: string;
  description: string;
  coverImage: string;
  eventDate: Date;
  eventType: EventType;
  location?: string;
  onlineUrl?: string;
  author: Schema.Types.ObjectId;
  participants: Participant[];
  status: EventStatus;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
  generateSlug: () => string;
}

// Etkinlik şeması
const EventSchema = new Schema<IEvent>(
  {
    title: { 
      type: String, 
      required: [true, 'Başlık zorunludur'],
      trim: true
    },
    slug: { 
      type: String, 
      required: true, 
      unique: true,
      index: true 
    },
    description: { 
      type: String, 
      required: [true, 'Açıklama zorunludur'],
      minlength: [20, 'Açıklama en az 20 karakter olmalıdır']
    },
    coverImage: { 
      type: String, 
      required: [true, 'Kapak görseli zorunludur']
    },
    eventDate: { 
      type: Date, 
      required: [true, 'Etkinlik tarihi zorunludur']
    },
    eventType: { 
      type: String, 
      enum: Object.values(EventType),
      required: [true, 'Etkinlik türü zorunludur'],
      default: EventType.IN_PERSON
    },
    location: { 
      type: String,
      required: function(this: IEvent) {
        return this.eventType === EventType.IN_PERSON || this.eventType === EventType.HYBRID;
      }
    },
    onlineUrl: { 
      type: String,
      required: function(this: IEvent) {
        return this.eventType === EventType.ONLINE || this.eventType === EventType.HYBRID;
      }
    },
    author: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    participants: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        name: { type: String, required: true },
        lastname: { type: String, required: true },
        email: { type: String, required: true },
        registeredAt: { type: Date, default: Date.now }
      }
    ],
    status: { 
      type: String, 
      enum: Object.values(EventStatus),
      default: EventStatus.PENDING_APPROVAL
    },
    rejectionReason: { 
      type: String
    }
  },
  { 
    timestamps: true 
  }
);

// Etkinlik kaydedilmeden önce slug oluştur
EventSchema.pre('save', async function(next) {
  // Yeni oluşturuluyorsa veya başlık değiştiyse
  if (this.isNew || this.isModified('title')) {
    this.slug = this.generateSlug();
  }
  next();
});

// Slug oluşturma metodu
EventSchema.methods.generateSlug = function(): string {
  const base = slugify(this.title, {
    lower: true,
    strict: true,
    locale: 'tr'
  });
  
  // Benzersizlik için nanoid ekle
  return `${base}-${nanoid(6)}`;
};

// Modeli export et
// Prevent conflict with the browser's built-in Event constructor
// by checking if we're in a browser environment
let EventModel: Model<IEvent>;

// Check if mongoose is available (server-side only)
if (mongoose.models && mongoose.models.Event) {
  EventModel = mongoose.models.Event;
} else if (mongoose.model) {
  // Only create a new model if mongoose.model is available
  try {
    EventModel = mongoose.model<IEvent>('Event');
  } catch {
    // If the model doesn't exist yet, create it
    EventModel = mongoose.model<IEvent>('Event', EventSchema);
  }
} else {
  // Create a dummy model for client-side
  // This won't be used but prevents errors during hydration
  EventModel = {} as Model<IEvent>;
}

export default EventModel;
