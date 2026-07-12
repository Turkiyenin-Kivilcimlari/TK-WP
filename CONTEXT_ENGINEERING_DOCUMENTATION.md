# Context Engineering Dökümantasyonu
## Türkiye'nin Kıvılcımları Topluluk Platformu

### 📋 İçindekiler
1. [Proje Genel Bakış](#proje-genel-bakış)
2. [Sistem Mimarisi](#sistem-mimarisi)
3. [Teknoloji Stack](#teknoloji-stack)
4. [Veritabanı Yapısı](#veritabanı-yapısı)
5. [API Endpoint'leri](#api-endpointleri)
6. [Güvenlik ve Kimlik Doğrulama](#güvenlik-ve-kimlik-doğrulama)
7. [Bileşen Mimarisi](#bileşen-mimarisi)
8. [Geliştirici Rehberi](#geliştirici-rehberi)
9. [Deployment ve DevOps](#deployment-ve-devops)

---

## 🎯 Proje Genel Bakış

**Türkiye'nin Kıvılcımları**, Türkiye'nin geleceği gençlerle iş dünyasının profesyonellerini bir araya getirerek Yapay Zeka ve gelecek odaklı bir ekosistem inşa eden topluluk platformudur.

### Temel Özellikler
- **Blog/Makale Sistemi**: Kullanıcıların teknik içerik paylaşabileceği platform
- **Etkinlik Yönetimi**: Online/offline etkinlik organizasyonu ve katılım sistemi
- **Kullanıcı Yönetimi**: Rol tabanlı yetkilendirme sistemi
- **Yorum Sistemi**: Makaleler için etkileşimli yorum sistemi
- **Admin Paneli**: İçerik ve kullanıcı yönetimi için kapsamlı admin arayüzü
- **2FA Güvenlik**: İki faktörlü doğrulama sistemi

---

## 🏗️ Sistem Mimarisi

### Genel Mimari
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (API Routes)  │◄──►│   (MongoDB)     │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UI Components │    │   Middleware    │    │   File Storage  │
│   (Shadcn/ui)   │    │   (Auth/Admin)  │    │   (Cloudinary)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Katmanlı Mimari
1. **Presentation Layer**: Next.js App Router, React Components
2. **Business Logic Layer**: API Routes, Middleware
3. **Data Access Layer**: Mongoose ODM, MongoDB
4. **External Services**: Cloudinary, Email Services, 2FA

---

## 🛠️ Teknoloji Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui, Radix UI
- **State Management**: Zustand
- **Form Handling**: React Hook Form + Zod
- **Animations**: Framer Motion
- **Icons**: Lucide React, Tabler Icons

### Backend
- **Runtime**: Node.js
- **Framework**: Next.js API Routes
- **Database**: MongoDB
- **ODM**: Mongoose
- **Authentication**: NextAuth.js + Custom JWT
- **Validation**: Zod
- **File Upload**: Cloudinary
- **Email**: Nodemailer
- **2FA**: Custom TOTP Implementation

### DevOps & Deployment
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Environment**: Environment Variables
- **Security**: HTTPS, CORS, Rate Limiting

---

## 🗄️ Veritabanı Yapısı

### Ana Modeller

#### User Model
```typescript
interface IUser {
  name: string;
  lastname: string;
  email: string;
  password: string;
  phone?: string;
  avatar?: string;
  role: UserRole; // USER, ADMIN, MODERATOR, MEMBER, REPRESENTATIVE, SUPERADMIN
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  twoFactorVerified: boolean;
  lastTwoFactorVerification?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Article Model
```typescript
interface IArticle {
  title: string;
  slug?: string;
  blocks: Block[]; // Zengin içerik blokları
  author: ObjectId;
  status: ArticleStatus; // DRAFT, PENDING_APPROVAL, PUBLISHED, ARCHIVED
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
}
```

#### Event Model
```typescript
interface IEvent {
  title: string;
  slug: string;
  description: string;
  coverImage: string;
  eventDate: Date;
  eventType: EventType; // IN_PERSON, ONLINE, HYBRID
  location?: string;
  onlineUrl?: string;
  author: ObjectId;
  participants: Participant[];
  status: EventStatus; // DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, COMPLETED, CANCELLED
  rejectionReason?: string;
}
```

#### Comment Model
```typescript
interface IComment {
  content: string;
  author: ObjectId;
  article: ObjectId;
  parent?: ObjectId; // Üst yorum için
  reactions: Reaction[];
  likeCount: number;
  dislikeCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Token Model
```typescript
interface IToken {
  userId: ObjectId;
  token: string;
  type: TokenType; // RESET_PASSWORD, VERIFY_EMAIL
  createdAt: Date;
  expiresAt: Date;
  otpHash?: string;
}
```

### Veritabanı İlişkileri
```
User (1) ──── (N) Article
User (1) ──── (N) Event
User (1) ──── (N) Comment
User (1) ──── (N) Token
Article (1) ──── (N) Comment
Comment (1) ──── (N) Comment (parent-child)
```

---

## 🔌 API Endpoint'leri

### Kimlik Doğrulama Endpoint'leri
```
POST /api/auth/register          # Kullanıcı kaydı
POST /api/auth/login             # Kullanıcı girişi
POST /api/auth/logout            # Kullanıcı çıkışı
POST /api/auth/forgot-password   # Şifre sıfırlama isteği
POST /api/auth/reset-password    # Şifre sıfırlama
POST /api/auth/verify-email      # E-posta doğrulama
POST /api/auth/send-verification # Doğrulama e-postası gönderme
POST /api/auth/check-email       # E-posta kontrolü
POST /api/auth/check-account     # Hesap durumu kontrolü
```

### 2FA Endpoint'leri
```
GET  /api/auth/2fa/status        # 2FA durumu
POST /api/auth/2fa/setup         # 2FA kurulumu
POST /api/auth/2fa/enable        # 2FA etkinleştirme
POST /api/auth/2fa/disable       # 2FA devre dışı bırakma
POST /api/auth/2fa/verify        # 2FA doğrulama
POST /api/auth/2fa/signin        # 2FA ile giriş
GET  /api/auth/2fa/check-status  # 2FA durum kontrolü
```

### Kullanıcı Endpoint'leri
```
GET  /api/users                  # Kullanıcı listesi (admin)
GET  /api/users/me               # Kendi profil bilgileri
PUT  /api/users/me               # Profil güncelleme
GET  /api/users/[id]             # Kullanıcı detayları
```

### Makale Endpoint'leri
```
GET  /api/articles               # Makale listesi
POST /api/articles               # Yeni makale
GET  /api/articles/[id]          # Makale detayları
PUT  /api/articles/[id]          # Makale güncelleme
DELETE /api/articles/[id]        # Makale silme
GET  /api/articles/slug/[slug]   # Slug ile makale
POST /api/articles/[id]/reaction # Makale beğeni/beğenmeme
```

### Etkinlik Endpoint'leri
```
GET  /api/events                 # Etkinlik listesi
POST /api/events                 # Yeni etkinlik
GET  /api/events/[slug]          # Etkinlik detayları
PUT  /api/events/[slug]          # Etkinlik güncelleme
DELETE /api/events/[slug]        # Etkinlik silme
POST /api/events/[slug]/register # Etkinliğe katılım
DELETE /api/events/[slug]/register # Katılımı iptal
```

### Yorum Endpoint'leri
```
GET  /api/articles/[id]/comments           # Makale yorumları
POST /api/articles/[id]/comments           # Yeni yorum
PUT  /api/articles/[id]/comments/[commentId] # Yorum güncelleme
DELETE /api/articles/[id]/comments/[commentId] # Yorum silme
POST /api/comments/[id]/reaction           # Yorum beğeni
```

### Admin Endpoint'leri
```
GET  /api/admin/users            # Kullanıcı yönetimi
PUT  /api/admin/users/[id]       # Kullanıcı güncelleme
DELETE /api/admin/users/[id]     # Kullanıcı silme
GET  /api/admin/articles         # Makale yönetimi
PATCH /api/admin/articles/[id]/status # Makale durum güncelleme
POST /api/admin/articles/[id]/reject  # Makale reddetme
GET  /api/admin/events           # Etkinlik yönetimi
PATCH /api/admin/events/[id]/status   # Etkinlik durum güncelleme
POST /api/admin/events/[id]/reject    # Etkinlik reddetme
GET  /api/admin/comments         # Yorum yönetimi
DELETE /api/admin/comments       # Yorum silme
GET  /api/admin/stats            # İstatistikler
```

### Genel Endpoint'ler
```
POST /api/upload                 # Dosya yükleme
POST /api/upload/delete          # Dosya silme
POST /api/contact                # İletişim formu
GET  /api/public/articles        # Genel makale listesi
GET  /api/public/authors         # Yazar listesi
GET  /api/public/tags            # Etiket listesi
```

---

## 🔐 Güvenlik ve Kimlik Doğrulama

### Kimlik Doğrulama Sistemi
1. **NextAuth.js**: Session yönetimi
2. **JWT Tokens**: API kimlik doğrulama
3. **bcrypt**: Şifre hashleme
4. **2FA (TOTP)**: İki faktörlü doğrulama

### Güvenlik Katmanları

#### 1. Authentication Middleware
```typescript
// middleware/authMiddleware.ts
export async function authenticateUser(req: NextRequest) {
  // Session kontrolü
  // JWT token doğrulama
  // E-posta doğrulama kontrolü
}
```

#### 2. Admin Authorization
```typescript
export async function checkAdminAuthWithTwoFactor(req: NextRequest) {
  // Admin rolü kontrolü
  // 2FA zorunluluğu
  // Session timeout kontrolü (3 saat)
}
```

#### 3. Role-Based Access Control
```typescript
enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  MEMBER = 'MEMBER',
  REPRESENTATIVE = 'REPRESENTATIVE',
  SUPERADMIN = 'SUPERADMIN'
}
```

### 2FA Implementasyonu
- **TOTP Algorithm**: RFC 6238 standardı
- **Secret Generation**: Base32 encoded secrets
- **Time Window**: 30 saniye
- **Backup Codes**: Acil durum kodları
- **Session Timeout**: Admin işlemleri için 3 saat

### Güvenlik Önlemleri
- **Password Policy**: Minimum 8 karakter, büyük/küçük harf, rakam
- **Rate Limiting**: API endpoint'leri için
- **CORS Configuration**: Cross-origin istekler için
- **Input Validation**: Zod şemaları ile
- **SQL Injection Prevention**: Mongoose ODM ile
- **XSS Protection**: React'ın built-in koruması

---

## 🧩 Bileşen Mimarisi

### UI Component Hierarchy
```
App Layout
├── Header (Navigation, Auth, Theme)
├── Main Content
│   ├── Page Components
│   │   ├── HomePage
│   │   ├── ArticlesPage
│   │   ├── EventsPage
│   │   └── AdminPages
│   └── Shared Components
│       ├── Forms
│       ├── Cards
│       ├── Modals
│       └── Tables
└── Footer
```

### Shadcn/ui Components
- **Form Components**: Input, Textarea, Select, Button
- **Layout Components**: Card, Dialog, Sheet, Tabs
- **Navigation**: NavigationMenu, Dropdown, Pagination
- **Feedback**: Alert, Toast, Badge, Skeleton
- **Data Display**: Table, Avatar, Calendar

### Custom Components
- **ImageUpload**: Cloudinary entegrasyonu
- **RichTextEditor**: TipTap editörü
- **DatePicker**: Tarih seçici
- **CloudflareTurnstile**: Bot koruması
- **TracingBeam**: Animasyonlu scroll

### State Management
```typescript
// Zustand store örneği
interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: ProfileData) => Promise<void>;
}
```

---

## 👨‍💻 Geliştirici Rehberi

### Proje Kurulumu
```bash
# Repository klonlama
git clone <repository-url>
cd TK-WP

# Bağımlılıkları yükleme
npm install

# Environment variables ayarlama
cp .env.example .env.local

# Geliştirme sunucusunu başlatma
npm run dev
```

### Environment Variables
```env
# Database
MONGODB_URI=mongodb://localhost:27017/topluluk

# NextAuth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRE=30d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Cloudflare Turnstile
CLOUDFLARE_WIDGET_SECRET_KEY=your-secret-key
```

### Geliştirme Workflow
1. **Feature Branch**: `git checkout -b feature/new-feature`
2. **Development**: Kod yazma ve test etme
3. **Commit**: `git commit -m "feat: add new feature"`
4. **Push**: `git push origin feature/new-feature`
5. **Pull Request**: Code review süreci

### Code Standards
- **TypeScript**: Strict mode aktif
- **ESLint**: Kod kalitesi kontrolü
- **Prettier**: Kod formatlama
- **Conventional Commits**: Commit mesaj standardı

### Testing Strategy
- **Unit Tests**: Jest + React Testing Library
- **Integration Tests**: API endpoint testleri
- **E2E Tests**: Playwright (önerilen)

### Performance Optimization
- **Next.js Optimizations**: Image optimization, code splitting
- **Database Indexing**: MongoDB index stratejisi
- **Caching**: Redis cache (gelecek implementasyon)
- **CDN**: Cloudinary için asset delivery

---

## 🚀 Deployment ve DevOps

### Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - mongodb
  
  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:
```

### Deployment Checklist
- [ ] Environment variables ayarlandı
- [ ] Database bağlantısı test edildi
- [ ] SSL sertifikası yapılandırıldı
- [ ] Domain DNS ayarları yapıldı
- [ ] Backup stratejisi oluşturuldu
- [ ] Monitoring kuruldu
- [ ] Error tracking aktif

### Monitoring ve Logging
- **Application Logs**: Winston logger
- **Error Tracking**: Sentry (önerilen)
- **Performance Monitoring**: New Relic (önerilen)
- **Uptime Monitoring**: Pingdom (önerilen)

---

## 📊 Sistem Metrikleri ve KPI'lar

### Teknik Metrikler
- **Response Time**: API endpoint'leri için ortalama yanıt süresi
- **Uptime**: Sistem erişilebilirlik oranı
- **Error Rate**: Hata oranı ve türleri
- **Database Performance**: Query execution time

### İş Metrikleri
- **User Engagement**: Aktif kullanıcı sayısı
- **Content Creation**: Makale ve etkinlik oluşturma oranı
- **Community Growth**: Yeni üye kayıt oranı
- **Event Participation**: Etkinlik katılım oranları

---

## 🔄 Gelecek Geliştirmeler

### Kısa Vadeli (1-3 ay)
- [ ] Real-time notifications
- [ ] Advanced search functionality
- [ ] Mobile app development
- [ ] Performance optimizations

### Orta Vadeli (3-6 ay)
- [ ] AI-powered content recommendations
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] API rate limiting

### Uzun Vadeli (6+ ay)
- [ ] Microservices architecture
- [ ] GraphQL API
- [ ] Advanced caching strategies
- [ ] Machine learning integrations

---

## 📚 Kaynaklar ve Referanslar

### Dokümantasyon
- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Shadcn/ui Documentation](https://ui.shadcn.com/)

### Güvenlik
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [2FA Implementation Guide](https://tools.ietf.org/html/rfc6238)

### Performance
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [MongoDB Performance](https://docs.mongodb.com/manual/administration/analyzing-mongodb-performance/)

---

## 📞 İletişim ve Destek

### Geliştirici Ekibi
- **Lead Developer**: [İletişim bilgileri]
- **Backend Developer**: [İletişim bilgileri]
- **Frontend Developer**: [İletişim bilgileri]
- **DevOps Engineer**: [İletişim bilgileri]

### Topluluk
- **Website**: https://turkiyeninkivilcimlari.com
- **Email**: contact@turkiyeninkivilcimlari.com
- **GitHub**: [Repository URL]

---

*Bu döküman, Türkiye'nin Kıvılcımları topluluk platformunun teknik mimarisini ve geliştirme süreçlerini detaylandırmaktadır. Güncel tutulması ve sürekli geliştirilmesi önemlidir.*

**Son Güncelleme**: 18 Ağustos 2025
**Versiyon**: 1.0.0