# Geliştirici Rehberi ve Kullanım Kılavuzu
## Türkiye'nin Kıvılcımları Topluluk Platformu

Bu rehber, projeye katkıda bulunmak isteyen geliştiriciler için kapsamlı bir kılavuz niteliğindedir.

---

## 📋 İçindekiler

1. [Hızlı Başlangıç](#hızlı-başlangıç)
2. [Geliştirme Ortamı Kurulumu](#geliştirme-ortamı-kurulumu)
3. [Proje Yapısı](#proje-yapısı)
4. [Kod Standartları](#kod-standartları)
5. [API Kullanım Kılavuzu](#api-kullanım-kılavuzu)
6. [Bileşen Geliştirme](#bileşen-geliştirme)
7. [Veritabanı İşlemleri](#veritabanı-işlemleri)
8. [Test Yazma](#test-yazma)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

---

## 🚀 Hızlı Başlangıç

### Ön Gereksinimler
- Node.js 18+ 
- npm veya yarn
- MongoDB 6+
- Git

### 5 Dakikada Çalıştırma
```bash
# 1. Repository'yi klonla
git clone <repository-url>
cd TK-WP

# 2. Bağımlılıkları yükle
npm install

# 3. Environment dosyasını oluştur
cp .env.example .env.local

# 4. MongoDB'yi başlat (Docker ile)
docker run -d -p 27017:27017 --name mongodb mongo:6

# 5. Geliştirme sunucusunu başlat
npm run dev
```

Tarayıcınızda `http://localhost:3000` adresini açın.

---

## ⚙️ Geliştirme Ortamı Kurulumu

### Detaylı Kurulum

#### 1. Node.js ve npm Kurulumu
```bash
# Node.js versiyonunu kontrol et
node --version  # v18.0.0+
npm --version   # v8.0.0+

# Node Version Manager kullanımı (önerilen)
nvm install 18
nvm use 18
```

#### 2. MongoDB Kurulumu

**Docker ile (Önerilen):**
```bash
# MongoDB container'ı çalıştır
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:6

# MongoDB'ye bağlan
docker exec -it mongodb mongosh
```

**Manuel Kurulum:**
```bash
# Ubuntu/Debian
sudo apt-get install mongodb

# macOS
brew install mongodb-community

# Windows
# MongoDB Community Server'ı indirin ve kurun
```

#### 3. Environment Variables Ayarlama
```bash
# .env.local dosyasını oluştur
cp .env.example .env.local

# Gerekli değişkenleri düzenle
nano .env.local
```

**Temel Environment Variables:**
```env
# Database
MONGODB_URI=mongodb://localhost:27017/topluluk

# NextAuth
NEXTAUTH_SECRET=your-super-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRE=30d

# Cloudinary (isteğe bağlı - geliştirme için)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email (isteğe bağlı - geliştirme için)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### 4. IDE Kurulumu ve Eklentiler

**VS Code Önerilen Eklentiler:**
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-json"
  ]
}
```

---

## 📁 Proje Yapısı

### Dizin Yapısı
```
TK-WP/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/         # Kimlik doğrulama
│   │   ├── admin/        # Admin API'leri
│   │   ├── articles/     # Makale API'leri
│   │   ├── events/       # Etkinlik API'leri
│   │   └── users/        # Kullanıcı API'leri
│   ├── (pages)/          # Sayfa bileşenleri
│   │   ├── articles/     # Makale sayfaları
│   │   ├── events/       # Etkinlik sayfaları
│   │   ├── admin/        # Admin sayfaları
│   │   └── auth/         # Kimlik doğrulama sayfaları
│   ├── globals.css       # Global stiller
│   ├── layout.tsx        # Ana layout
│   └── page.tsx          # Ana sayfa
├── components/            # React bileşenleri
│   ├── ui/               # Temel UI bileşenleri
│   ├── forms/            # Form bileşenleri
│   ├── layout/           # Layout bileşenleri
│   └── features/         # Özellik bazlı bileşenler
├── lib/                  # Yardımcı kütüphaneler
│   ├── auth.ts           # Kimlik doğrulama
│   ├── db.ts             # Veritabanı bağlantısı
│   ├── utils.ts          # Yardımcı fonksiyonlar
│   └── constants.ts      # Sabitler
├── models/               # Mongoose modelleri
│   ├── User.ts           # Kullanıcı modeli
│   ├── Article.ts        # Makale modeli
│   ├── Event.ts          # Etkinlik modeli
│   └── Comment.ts        # Yorum modeli
├── middleware/           # Middleware fonksiyonları
│   ├── authMiddleware.ts # Kimlik doğrulama
│   └── adminMiddleware.ts# Admin yetkilendirme
├── types/                # TypeScript tip tanımları
├── hooks/                # Custom React hooks
├── public/               # Statik dosyalar
└── docs/                 # Dokümantasyon
```

### Dosya Adlandırma Kuralları
- **Components**: PascalCase (`UserProfile.tsx`)
- **Pages**: kebab-case (`user-profile.tsx`)
- **API Routes**: kebab-case (`reset-password.ts`)
- **Utilities**: camelCase (`formatDate.ts`)
- **Constants**: UPPER_SNAKE_CASE (`API_ENDPOINTS.ts`)

---

## 📝 Kod Standartları

### TypeScript Kuralları
```typescript
// ✅ İyi örnek
interface UserProps {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

const UserCard: React.FC<UserProps> = ({ id, name, email, role }) => {
  return (
    <div className="user-card">
      <h3>{name}</h3>
      <p>{email}</p>
      <span className={`role-${role.toLowerCase()}`}>{role}</span>
    </div>
  );
};

// ❌ Kötü örnek
const UserCard = (props: any) => {
  return (
    <div>
      <h3>{props.name}</h3>
      <p>{props.email}</p>
    </div>
  );
};
```

### React Component Kuralları
```typescript
// ✅ Functional Component with TypeScript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  children
}) => {
  const baseClasses = 'btn';
  const variantClasses = `btn-${variant}`;
  const sizeClasses = `btn-${size}`;
  
  return (
    <button
      className={`${baseClasses} ${variantClasses} ${sizeClasses}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
```

### API Route Kuralları
```typescript
// ✅ İyi API route örneği
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateUser } from '@/middleware/authMiddleware';

// Request validation schema
const createArticleSchema = z.object({
  title: z.string().min(1, 'Başlık gereklidir'),
  content: z.string().min(10, 'İçerik en az 10 karakter olmalıdır'),
  tags: z.array(z.string()).optional()
});

export async function POST(req: NextRequest) {
  try {
    // Authentication check
    const user = await authenticateUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Giriş yapmalısınız' },
        { status: 401 }
      );
    }

    // Request validation
    const body = await req.json();
    const validatedData = createArticleSchema.parse(body);

    // Business logic
    const article = await createArticle({
      ...validatedData,
      authorId: user.id
    });

    return NextResponse.json({
      success: true,
      data: article
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Geçersiz veri', errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
```

### CSS/Tailwind Kuralları
```tsx
// ✅ İyi Tailwind kullanımı
const Card = ({ children, variant = 'default' }) => {
  const baseClasses = 'rounded-lg border p-6 shadow-sm';
  const variantClasses = {
    default: 'bg-white border-gray-200',
    primary: 'bg-blue-50 border-blue-200',
    danger: 'bg-red-50 border-red-200'
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]}`}>
      {children}
    </div>
  );
};

// ❌ Kötü örnek - inline styles
const Card = ({ children }) => (
  <div style={{ 
    borderRadius: '8px', 
    border: '1px solid #ccc', 
    padding: '24px' 
  }}>
    {children}
  </div>
);
```

---

## 🔌 API Kullanım Kılavuzu

### Authentication API'leri

#### Kullanıcı Kaydı
```typescript
// POST /api/auth/register
const registerUser = async (userData: RegisterData) => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message);
  }
  
  return result;
};

// Kullanım
try {
  const result = await registerUser({
    name: 'John',
    lastname: 'Doe',
    email: 'john@example.com',
    password: 'SecurePass123',
    confirmPassword: 'SecurePass123',
    phone: '+905551234567'
  });
  
  console.log('Kayıt başarılı:', result);
} catch (error) {
  console.error('Kayıt hatası:', error.message);
}
```

#### Kullanıcı Girişi
```typescript
// POST /api/auth/login
const loginUser = async (credentials: LoginData) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message);
  }
  
  return result;
};
```

### Article API'leri

#### Makale Listesi
```typescript
// GET /api/articles
const getArticles = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  tag?: string;
  author?: string;
}) => {
  const searchParams = new URLSearchParams();
  
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.search) searchParams.set('search', params.search);
  if (params?.tag) searchParams.set('tag', params.tag);
  if (params?.author) searchParams.set('author', params.author);

  const response = await fetch(`/api/articles?${searchParams}`);
  const result = await response.json();
  
  return result;
};

// Kullanım
const articles = await getArticles({
  page: 1,
  limit: 10,
  search: 'javascript',
  tag: 'frontend'
});
```

#### Yeni Makale Oluşturma
```typescript
// POST /api/articles
const createArticle = async (articleData: CreateArticleData) => {
  const response = await fetch('/api/articles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`, // Token gerekli
    },
    body: JSON.stringify(articleData),
  });

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message);
  }
  
  return result;
};
```

### Error Handling
```typescript
// API çağrıları için genel error handler
const apiCall = async (url: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Bir hata oluştu');
    }

    return result;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};
```

---

## 🧩 Bileşen Geliştirme

### Yeni Bileşen Oluşturma

#### 1. Temel Bileşen Şablonu
```typescript
// components/ui/NewComponent.tsx
import React from 'react';
import { cn } from '@/lib/utils';

interface NewComponentProps {
  className?: string;
  children?: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

export const NewComponent: React.FC<NewComponentProps> = ({
  className,
  children,
  variant = 'default',
  size = 'md',
  ...props
}) => {
  return (
    <div
      className={cn(
        'base-component-classes',
        {
          'variant-default': variant === 'default',
          'variant-primary': variant === 'primary',
          'variant-secondary': variant === 'secondary',
          'size-sm': size === 'sm',
          'size-md': size === 'md',
          'size-lg': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
```

#### 2. Form Bileşeni Örneği
```typescript
// components/forms/ArticleForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const articleSchema = z.object({
  title: z.string().min(1, 'Başlık gereklidir'),
  content: z.string().min(10, 'İçerik en az 10 karakter olmalıdır'),
  tags: z.array(z.string()).optional(),
});

type ArticleFormData = z.infer<typeof articleSchema>;

interface ArticleFormProps {
  initialData?: Partial<ArticleFormData>;
  onSubmit: (data: ArticleFormData) => Promise<void>;
  isLoading?: boolean;
}

export const ArticleForm: React.FC<ArticleFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<ArticleFormData>({
    resolver: zodResolver(articleSchema),
    defaultValues: initialData
  });

  const handleFormSubmit = async (data: ArticleFormData) => {
    try {
      await onSubmit(data);
      reset();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <Input
          {...register('title')}
          placeholder="Makale başlığı"
          error={errors.title?.message}
        />
      </div>
      
      <div>
        <Textarea
          {...register('content')}
          placeholder="Makale içeriği"
          rows={10}
          error={errors.content?.message}
        />
      </div>
      
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
      </Button>
    </form>
  );
};
```

### Custom Hooks

#### 1. API Hook Örneği
```typescript
// hooks/useArticles.ts
import { useState, useEffect } from 'react';
import { Article } from '@/types';

interface UseArticlesOptions {
  page?: number;
  limit?: number;
  search?: string;
}

export const useArticles = (options: UseArticlesOptions = {}) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/articles?${new URLSearchParams({
          page: options.page?.toString() || '1',
          limit: options.limit?.toString() || '10',
          ...(options.search && { search: options.search })
        })}`);
        
        const result = await response.json();
        
        if (result.success) {
          setArticles(result.articles);
          setTotal(result.total);
        } else {
          setError(result.message);
        }
      } catch (err) {
        setError('Makaleler yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [options.page, options.limit, options.search]);

  return {
    articles,
    loading,
    error,
    total,
    refetch: () => fetchArticles()
  };
};
```

#### 2. Auth Hook Örneği
```typescript
// hooks/useAuth.ts
import { useSession } from 'next-auth/react';
import { UserRole } from '@/types';

export const useAuth = () => {
  const { data: session, status } = useSession();

  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';
  const user = session?.user;

  const hasRole = (role: UserRole) => {
    return user?.role === role;
  };

  const isAdmin = hasRole(UserRole.ADMIN) || hasRole(UserRole.SUPERADMIN);

  return {
    user,
    isAuthenticated,
    isLoading,
    isAdmin,
    hasRole
  };
};
```

---

## 🗄️ Veritabanı İşlemleri

### Mongoose Model Oluşturma

#### 1. Yeni Model Tanımlama
```typescript
// models/Category.ts
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  color: string;
  icon?: string;
  parentCategory?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, 'Kategori adı gereklidir'],
      trim: true,
      maxlength: [50, 'Kategori adı en fazla 50 karakter olabilir']
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    description: {
      type: String,
      maxlength: [200, 'Açıklama en fazla 200 karakter olabilir']
    },
    color: {
      type: String,
      required: true,
      match: [/^#[0-9A-F]{6}$/i, 'Geçerli bir hex renk kodu giriniz']
    },
    icon: {
      type: String,
      trim: true
    },
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
categorySchema.index({ slug: 1 });
categorySchema.index({ parentCategory: 1 });
categorySchema.index({ isActive: 1 });

// Virtual fields
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentCategory'
});

// Methods
categorySchema.methods.getFullPath = async function() {
  const path = [this.name];
  let current = this;
  
  while (current.parentCategory) {
    current = await mongoose.model('Category').findById(current.parentCategory);
    if (current) {
      path.unshift(current.name);
    }
  }
  
  return path.join(' > ');
};

// Static methods
categorySchema.statics.findBySlug = function(slug: string) {
  return this.findOne({ slug, isActive: true });
};

// Pre-save middleware
categorySchema.pre('save', function(next) {
  if (this.isModified('name') && !this.isModified('slug')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// Model export
let Category: Model<ICategory>;

try {
  Category = mongoose.models.Category || mongoose.model<ICategory>('Category', categorySchema);
} catch (error) {
  Category = mongoose.model<ICategory>('Category', categorySchema);
}

export default Category;
```

#### 2. Database Utility Functions
```typescript
// lib/database.ts
import mongoose from 'mongoose';
import { connectToDatabase } from './db';

export class DatabaseService {
  static async findWithPagination<T>(
    model: mongoose.Model<T>,
    query: any = {},
    options: {
      page?: number;
      limit?: number;
      sort?: any;
      populate?: string | string[];
    } = {}
  ) {
    await connectToDatabase();
    
    const {
      page = 1,
      limit = 10,
      sort = { createdAt: -1 },
      populate
    } = options;
    
    const skip = (page - 1) * limit;
    
    let queryBuilder = model.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    if (populate) {
      if (Array.isArray(populate)) {
        populate.forEach(field => {
          queryBuilder = queryBuilder.populate(field);
        });
      } else {
        queryBuilder = queryBuilder.populate(populate);
      }
    }
    
    const [data, total] = await Promise.all([
      queryBuilder.exec(),
      model.countDocuments(query)
    ]);
    
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }
  
  static async findByIdWithPopulate<T>(
    model: mongoose.Model<T>,
    id: string,
    populate?: string | string[]
  ) {
    await connectToDatabase();
    
    let query = model.findById(id);
    
    if (populate) {
      if (Array.isArray(populate)) {
        populate.forEach(field => {
          query = query.populate(field);
        });
      } else {
        query = query.populate(populate);
      }
    }
    
    return query.exec();
  }
}
```

---

## 🧪 Test Yazma

### Unit Test Örneği
```typescript
// __tests__/utils/formatDate.test.ts
import { formatDate, formatRelativeTime } from '@/lib/utils';

describe('Date Utilities', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2023-12-25T10:30:00Z');
      const formatted = formatDate(date);
      expect(formatted).toBe('25 Aralık 2023');
    });
    
    it('should handle invalid date', () => {
      const formatted = formatDate(null);
      expect(formatted).toBe('Geçersiz tarih');
    });
  });
  
  describe('formatRelativeTime', () => {
    it('should return "şimdi" for current time', () => {
      const now = new Date();
      const relative = formatRelativeTime(now);
      expect(relative).toBe('şimdi');
    });
    
    it('should return correct relative time for past dates', () => {
      const pastDate = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago
      const relative = formatRelativeTime(pastDate);
      expect(relative).toBe('2 dakika önce');
    });
  });
});
```

### Component Test Örneği
```typescript
// __tests__/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('renders correctly', () => {
    render(<Button>Test Button</Button>);
    const button = screen.getByRole('button', { name: /test button/i });
    expect(button).toBeInTheDocument();
  });
  
  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('applies correct variant classes', () => {
    render(<Button variant="primary">Primary Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn-primary');
  });
  
  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});
```

### API Test Örneği
```typescript
// __tests__/api/articles.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/app/api/articles/route';

describe('/api/articles', () => {
  it('should return articles list', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        page: '1',
        limit: '10'
      }
    });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(Array.isArray(data.articles)).toBe(true);
  });
  
  it('should create new article with valid data', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'authorization': 'Bearer valid-token'
      },
      body: {
        title: 'Test Article',
        content: 'This is a test article content',
        tags: ['test', 'article']
      }
    });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(201);
    
    const data = JSON.parse(res._getData());
    expect(