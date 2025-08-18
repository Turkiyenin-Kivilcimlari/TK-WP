# Sistem Mimarisi Diyagramları
## Türkiye'nin Kıvılcımları Topluluk Platformu

Bu dokümanda sistemin çeşitli katmanlarını ve bileşenlerini görselleştiren Mermaid diyagramları bulunmaktadır.

---

## 🏗️ Genel Sistem Mimarisi

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Browser]
        MOB[Mobile App]
    end
    
    subgraph "Frontend Layer"
        NEXT[Next.js App]
        UI[UI Components]
        STATE[State Management]
    end
    
    subgraph "Backend Layer"
        API[API Routes]
        MIDDLEWARE[Middleware]
        AUTH[Authentication]
    end
    
    subgraph "Data Layer"
        MONGO[(MongoDB)]
        CLOUD[Cloudinary]
        EMAIL[Email Service]
    end
    
    WEB --> NEXT
    MOB --> NEXT
    NEXT --> UI
    NEXT --> STATE
    NEXT --> API
    API --> MIDDLEWARE
    API --> AUTH
    API --> MONGO
    API --> CLOUD
    API --> EMAIL
```

---

## 🔐 Kimlik Doğrulama Akışı

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as Auth API
    participant DB as Database
    participant E as Email Service
    
    U->>F: Register/Login Request
    F->>A: POST /api/auth/login
    A->>DB: Validate Credentials
    DB-->>A: User Data
    
    alt 2FA Enabled
        A->>U: Request 2FA Code
        U->>A: Submit 2FA Code
        A->>A: Verify TOTP
    end
    
    A->>A: Generate JWT Token
    A-->>F: Return Token + User Data
    F->>F: Store Session
    F-->>U: Login Success
    
    alt Email Not Verified
        A->>E: Send Verification Email
        E-->>U: Verification Email
        U->>A: Verify Email
        A->>DB: Update Email Status
    end
```

---

## 📊 Veritabanı İlişki Diyagramı

```mermaid
erDiagram
    USER {
        ObjectId _id PK
        string name
        string lastname
        string email UK
        string password
        string phone
        string avatar
        enum role
        boolean emailVerified
        boolean twoFactorEnabled
        string twoFactorSecret
        boolean twoFactorVerified
        date lastTwoFactorVerification
        date createdAt
        date updatedAt
    }
    
    ARTICLE {
        ObjectId _id PK
        string title
        string slug UK
        array blocks
        ObjectId author FK
        enum status
        array tags
        number views
        string thumbnail
        array reactions
        number likeCount
        number dislikeCount
        date publishedAt
        object rejection
        date createdAt
        date updatedAt
    }
    
    EVENT {
        ObjectId _id PK
        string title
        string slug UK
        string description
        string coverImage
        date eventDate
        enum eventType
        string location
        string onlineUrl
        ObjectId author FK
        array participants
        enum status
        string rejectionReason
        date createdAt
        date updatedAt
    }
    
    COMMENT {
        ObjectId _id PK
        string content
        ObjectId author FK
        ObjectId article FK
        ObjectId parent FK
        array reactions
        number likeCount
        number dislikeCount
        date createdAt
        date updatedAt
    }
    
    TOKEN {
        ObjectId _id PK
        ObjectId userId FK
        string token
        enum type
        date createdAt
        date expiresAt
        string otpHash
    }
    
    USER ||--o{ ARTICLE : "creates"
    USER ||--o{ EVENT : "organizes"
    USER ||--o{ COMMENT : "writes"
    USER ||--o{ TOKEN : "has"
    ARTICLE ||--o{ COMMENT : "has"
    COMMENT ||--o{ COMMENT : "replies_to"
```

---

## 🌐 API Endpoint Mimarisi

```mermaid
graph LR
    subgraph "Public APIs"
        PUB_ART[/api/public/articles]
        PUB_AUTH[/api/public/authors]
        PUB_TAGS[/api/public/tags]
    end
    
    subgraph "Authentication APIs"
        AUTH_REG[/api/auth/register]
        AUTH_LOGIN[/api/auth/login]
        AUTH_2FA[/api/auth/2fa/*]
        AUTH_RESET[/api/auth/reset-password]
    end
    
    subgraph "User APIs"
        USER_ME[/api/users/me]
        USER_LIST[/api/users]
        USER_DETAIL[/api/users/id]
    end
    
    subgraph "Content APIs"
        ART_LIST[/api/articles]
        ART_DETAIL[/api/articles/id]
        EVENT_LIST[/api/events]
        EVENT_DETAIL[/api/events/slug]
        COMMENT_LIST[/api/articles/id/comments]
    end
    
    subgraph "Admin APIs"
        ADMIN_USERS[/api/admin/users]
        ADMIN_ARTICLES[/api/admin/articles]
        ADMIN_EVENTS[/api/admin/events]
        ADMIN_COMMENTS[/api/admin/comments]
        ADMIN_STATS[/api/admin/stats]
    end
    
    subgraph "Utility APIs"
        UPLOAD[/api/upload]
        CONTACT[/api/contact]
    end
```

---

## 🔄 Makale Yayınlama Süreci

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> PendingApproval : Submit for Review
    PendingApproval --> Published : Admin Approves
    PendingApproval --> Rejected : Admin Rejects
    PendingApproval --> Draft : Author Edits
    Rejected --> Draft : Author Revises
    Published --> Archived : Admin Archives
    Archived --> Published : Admin Restores
    Draft --> [*] : Delete
    Rejected --> [*] : Delete
```

---

## 🎯 Etkinlik Yaşam Döngüsü

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> PendingApproval : Submit Event
    PendingApproval --> Approved : Admin Approves
    PendingApproval --> Rejected : Admin Rejects
    PendingApproval --> Draft : Organizer Edits
    Rejected --> Draft : Organizer Revises
    Approved --> Completed : Event Ends
    Approved --> Cancelled : Cancel Event
    Completed --> [*]
    Cancelled --> [*]
    Draft --> [*] : Delete
    Rejected --> [*] : Delete
```

---

## 🛡️ Güvenlik Katmanları

```mermaid
graph TD
    subgraph "Frontend Security"
        CSP[Content Security Policy]
        XSS[XSS Protection]
        CSRF[CSRF Protection]
    end
    
    subgraph "API Security"
        AUTH_MW[Authentication Middleware]
        ADMIN_MW[Admin Middleware]
        RATE[Rate Limiting]
        VALID[Input Validation]
    end
    
    subgraph "Data Security"
        ENCRYPT[Password Encryption]
        JWT_SEC[JWT Security]
        TFA[2FA TOTP]
        TOKEN_EXP[Token Expiration]
    end
    
    subgraph "Infrastructure Security"
        HTTPS[HTTPS/TLS]
        ENV[Environment Variables]
        CORS[CORS Configuration]
        HELMET[Security Headers]
    end
    
    CSP --> AUTH_MW
    XSS --> AUTH_MW
    CSRF --> AUTH_MW
    AUTH_MW --> ENCRYPT
    ADMIN_MW --> TFA
    RATE --> VALID
    VALID --> JWT_SEC
    ENCRYPT --> HTTPS
    JWT_SEC --> ENV
    TFA --> CORS
    TOKEN_EXP --> HELMET
```

---

## 📱 Bileşen Hiyerarşisi

```mermaid
graph TD
    APP[App Layout]
    
    subgraph "Layout Components"
        HEADER[Header]
        MAIN[Main Content]
        FOOTER[Footer]
    end
    
    subgraph "Page Components"
        HOME[HomePage]
        ARTICLES[ArticlesPage]
        EVENTS[EventsPage]
        PROFILE[ProfilePage]
        ADMIN[AdminPages]
    end
    
    subgraph "Shared Components"
        FORMS[Form Components]
        CARDS[Card Components]
        MODALS[Modal Components]
        TABLES[Table Components]
    end
    
    subgraph "UI Components"
        BUTTON[Button]
        INPUT[Input]
        SELECT[Select]
        DIALOG[Dialog]
        TOAST[Toast]
    end
    
    APP --> HEADER
    APP --> MAIN
    APP --> FOOTER
    MAIN --> HOME
    MAIN --> ARTICLES
    MAIN --> EVENTS
    MAIN --> PROFILE
    MAIN --> ADMIN
    HOME --> CARDS
    ARTICLES --> FORMS
    EVENTS --> TABLES
    PROFILE --> MODALS
    FORMS --> BUTTON
    FORMS --> INPUT
    FORMS --> SELECT
    MODALS --> DIALOG
    CARDS --> TOAST
```

---

## 🔄 State Management Akışı

```mermaid
graph LR
    subgraph "User Actions"
        CLICK[User Click]
        FORM[Form Submit]
        NAV[Navigation]
    end
    
    subgraph "State Management"
        ZUSTAND[Zustand Store]
        LOCAL[Local State]
        SERVER[Server State]
    end
    
    subgraph "API Layer"
        FETCH[API Fetch]
        CACHE[Cache]
        SYNC[Data Sync]
    end
    
    subgraph "UI Updates"
        RENDER[Re-render]
        TOAST_MSG[Toast Messages]
        REDIRECT[Redirects]
    end
    
    CLICK --> ZUSTAND
    FORM --> LOCAL
    NAV --> SERVER
    ZUSTAND --> FETCH
    LOCAL --> CACHE
    SERVER --> SYNC
    FETCH --> RENDER
    CACHE --> TOAST_MSG
    SYNC --> REDIRECT
```

---

## 📊 Veri Akış Diyagramı

```mermaid
flowchart TD
    USER[User Input] --> VALIDATE{Input Valid?}
    VALIDATE -->|No| ERROR[Show Error]
    VALIDATE -->|Yes| AUTH{Authenticated?}
    AUTH -->|No| LOGIN[Redirect to Login]
    AUTH -->|Yes| PERMISSION{Has Permission?}
    PERMISSION -->|No| FORBIDDEN[403 Forbidden]
    PERMISSION -->|Yes| PROCESS[Process Request]
    PROCESS --> DATABASE[(Database)]
    DATABASE --> RESPONSE[Generate Response]
    RESPONSE --> CACHE[Update Cache]
    CACHE --> CLIENT[Send to Client]
    CLIENT --> UPDATE[Update UI]
    
    ERROR --> CLIENT
    LOGIN --> CLIENT
    FORBIDDEN --> CLIENT
```

---

## 🚀 Deployment Mimarisi

```mermaid
graph TB
    subgraph "Development"
        DEV_CODE[Source Code]
        DEV_BUILD[Build Process]
        DEV_TEST[Testing]
    end
    
    subgraph "CI/CD Pipeline"
        GIT[Git Repository]
        BUILD[Build & Test]
        DEPLOY[Deploy]
    end
    
    subgraph "Production Environment"
        DOCKER[Docker Container]
        NGINX[Nginx Proxy]
        APP[Next.js App]
        MONGO[MongoDB]
    end
    
    subgraph "External Services"
        CLOUDINARY[Cloudinary CDN]
        EMAIL_SRV[Email Service]
        MONITORING[Monitoring]
    end
    
    DEV_CODE --> DEV_BUILD
    DEV_BUILD --> DEV_TEST
    DEV_TEST --> GIT
    GIT --> BUILD
    BUILD --> DEPLOY
    DEPLOY --> DOCKER
    DOCKER --> NGINX
    NGINX --> APP
    APP --> MONGO
    APP --> CLOUDINARY
    APP --> EMAIL_SRV
    APP --> MONITORING
```

---

## 📈 Performans Optimizasyon Stratejisi

```mermaid
mindmap
  root((Performance))
    Frontend
      Code Splitting
      Image Optimization
      Lazy Loading
      Bundle Analysis
    Backend
      Database Indexing
      Query Optimization
      Caching Strategy
      API Response Time
    Infrastructure
      CDN Usage
      Server Optimization
      Load Balancing
      Monitoring
    User Experience
      Core Web Vitals
      Loading States
      Error Handling
      Responsive Design
```

---

## 🔍 Monitoring ve Logging

```mermaid
graph TD
    subgraph "Application"
        APP_LOGS[Application Logs]
        ERROR_LOGS[Error Logs]
        PERF_LOGS[Performance Logs]
    end
    
    subgraph "Monitoring Tools"
        WINSTON[Winston Logger]
        SENTRY[Error Tracking]
        ANALYTICS[Analytics]
    end
    
    subgraph "Alerts & Notifications"
        EMAIL_ALERT[Email Alerts]
        SLACK[Slack Notifications]
        DASHBOARD[Monitoring Dashboard]
    end
    
    subgraph "Metrics"
        UPTIME[Uptime Monitoring]
        RESPONSE_TIME[Response Time]
        ERROR_RATE[Error Rate]
        USER_METRICS[User Metrics]
    end
    
    APP_LOGS --> WINSTON
    ERROR_LOGS --> SENTRY
    PERF_LOGS --> ANALYTICS
    WINSTON --> EMAIL_ALERT
    SENTRY --> SLACK
    ANALYTICS --> DASHBOARD
    EMAIL_ALERT --> UPTIME
    SLACK --> RESPONSE_TIME
    DASHBOARD --> ERROR_RATE
    DASHBOARD --> USER_METRICS
```

---

*Bu diyagramlar, sistemin farklı katmanlarını ve bileşenler arası ilişkileri görselleştirmek için hazırlanmıştır. Sistem geliştikçe güncellenmelidir.*

**Son Güncelleme**: 18 Ağustos 2025
**Versiyon**: 1.0.0