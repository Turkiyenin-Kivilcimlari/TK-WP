import mongoose, { Document, Schema, model, Model, Types } from "mongoose";
import slugify from "slugify";
import { nanoid } from "nanoid";

// Etkinlik Tipleri
export enum EventType {
  IN_PERSON = "IN_PERSON", // Fiziksel
  ONLINE = "ONLINE", // Çevrimiçi
  HYBRID = "HYBRID", // Hibrit
}

// Etkinlik Durumları
export enum EventStatus {
  DRAFT = "DRAFT", // Taslak
  PENDING_APPROVAL = "PENDING_APPROVAL", // Onay Bekliyor
  APPROVED = "APPROVED", // Onaylandı
  REJECTED = "REJECTED", // Reddedildi
  COMPLETED = "COMPLETED", // Tamamlandı
  CANCELLED = "CANCELLED", // İptal edildi
}

// Etkinlik Günü Arayüzü
interface IEventDay {
  date: Date; // Tarih
  startTime: string; // Başlangıç saati (HH:MM)
  endTime?: string; // Bitiş saati (HH:MM) - opsiyonel
  eventType: EventType; // Her günün kendi etkinlik tipi olabilir
  location?: string; // Konum (fiziksel etkinlik için)
  onlineUrl?: string; // Online URL (online etkinlik için)
}

// Etkinlik Arayüzü
export interface IEvent extends Document {
  title: string;
  slug: string;
  description: string;
  eventType: EventType;
  eventDays: IEventDay[];
  coverImage: string;
  author: Types.ObjectId | string; // Etkinliği oluşturan
  participants: Participant[];
  status: EventStatus;
  rejectionReason?: string;
  reviewedAt?: Date; // Onaylanan etkinlikler için tarih
  reviewedBy?: Types.ObjectId; // Onaylayan adminin ID'si
  eventDate?: Date; // Etkinlik tarihi (ilk günün tarihi)

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  generateSlug: () => string;
}

// Katılımcı tipi
interface Participant {
  userId: Schema.Types.ObjectId;
  name: string;
  lastname: string;
  email: string;
  registeredAt: Date;
}

// Etkinlik Günü Şeması
const EventDaySchema = new Schema<IEventDay>({
  date: {
    type: Date,
    required: true,
  },
  startTime: {
    type: String,
    required: true,
    validate: {
      validator: function (v: string) {
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
      },
      message: (props) =>
        `${props.value} geçerli bir saat formatı değil (HH:MM)`,
    },
  },
  endTime: {
    type: String,
    // Online etkinliklerde gerekli değil, diğer etkinliklerde gerekli
    required: function (this: any) {
      // this nesnesi Document yerine Object olarak işleniyor olabilir
      // Bu yüzden daha esnek bir kontrol yapıyoruz
      try {
        return this.eventType && this.eventType !== EventType.ONLINE;
      } catch (e) {
        // Eğer bir hata oluşursa genel durumda zorunlu kabul et
        // API tarafında özel işlem yapılacak
        return true;
      }
    },
    validate: {
      validator: function (v: string | undefined) {
        // Değer boşsa ve tür ONLINE ise geçerli
        try {
          if (this.eventType === EventType.ONLINE) return true;
        } catch (e) {
          // Tür kontrolü çalışmazsa format kontrolü yap
        }

        // Boş değilse format kontrolü
        return !v || /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
      },
      message: (props) =>
        `${props.value} geçerli bir saat formatı değil (HH:MM)`,
    },
  },
  eventType: {
    type: String,
    enum: EventType,
    required: true,
  },
  location: {
    type: String,
    required: function (this: IEventDay) {
      return (
        this.eventType === EventType.IN_PERSON ||
        this.eventType === EventType.HYBRID
      );
    },
  },
  onlineUrl: {
    type: String,
    required: function (this: IEventDay) {
      return (
        this.eventType === EventType.ONLINE ||
        this.eventType === EventType.HYBRID
      );
    },
  },
});

// Etkinlik Şeması
const EventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    coverImage: {
      type: String,
      required: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: Object.values(EventType),
    },
    eventDays: {
      type: [EventDaySchema],
      required: true,
      validate: {
        validator: (days: IEventDay[]) => days.length > 0,
        message: "En az bir etkinlik günü belirtilmelidir",
      },
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        lastname: {
          type: String,
          required: true,
        },
        email: {
          type: String,
          required: true,
        },
        registeredAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    status: {
      type: String,
      required: true,
      enum: Object.values(EventStatus),
      default: EventStatus.PENDING_APPROVAL,
    },
    rejectionReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Slug oluşturma metodu
EventSchema.methods.generateSlug = function (): string {
  const slugBase = this.title
    ? slugify(this.title, { lower: true })
    : nanoid(10);
  return `${slugBase}-${nanoid(5)}`;
};

// Slug değeri yoksa oluştur
EventSchema.pre("validate", function (next) {
  if (!this.slug) {
    this.slug = this.generateSlug();
  }
  next();
});

// Client-side model hatalarını önleyen düzeltmeler - Model oluşturma mantığını güncelliyoruz
let EventModel: Model<IEvent>;

// İstemci tarafı ve sunucu tarafı ortamlarını doğru şekilde işle
if (typeof window === "undefined") {
  // Sunucu tarafındayız, modeli güvenle oluşturabiliriz
  try {
    // Modelin zaten tanımlanıp tanımlanmadığını kontrol et
    EventModel =
      mongoose.models.Event || mongoose.model<IEvent>("Event", EventSchema);
  } catch (e) {
    // Model tanımlanmamışsa oluştur
    EventModel = mongoose.model<IEvent>("Event", EventSchema);
  }
} else {
  // İstemci tarafında, boş bir nesne döndür
  // @ts-ignore - Burayı TypeScript hatalarından kaçınmak için görmezden geliyoruz
  EventModel = {} as Model<IEvent>;
}

export default EventModel;
