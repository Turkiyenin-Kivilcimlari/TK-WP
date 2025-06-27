import { UserRole } from "@/models/User";

// Kullanıcı arayüzü için temel bir tip tanımı
export interface UserData {
  id: string;
  email?: string;
  role?: UserRole;
  name?: string;
}

// API URL'lerini oluşturmak için yardımcı fonksiyon
function getApiUrl(path: string): string {
  // Server tarafında çalışıyorsa tam URL oluştur
  if (typeof window === "undefined") {
    // Ortam değişkenlerinden URL al, yoksa localhost kullan
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.VERCEL_URL ||
      "http://localhost:3000";
    return `${baseUrl}${path}`;
  }

  // Client tarafında relatif URL kullan
  return path;
}

// Kullanıcı verilerini getir
async function getUsers(): Promise<UserData[]> {
  try {
    const url = getApiUrl("/api/users");
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Kullanıcı verileri alınamadı");
    }

    return await response.json();
  } catch (error) {
    return [];
  }
}

/**
 * ID'ye göre kullanıcı bilgilerini getirir
 * @param userId Kullanıcı ID'si
 */
export async function getUserById(
  userId: string
): Promise<UserData | undefined> {
  try {
    const url = getApiUrl(`/api/users/${userId}`);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return undefined;
      }
      throw new Error("Kullanıcı verileri alınamadı");
    }

    return await response.json();
  } catch (error) {
    return undefined;
  }
}

/**
 * Role göre kullanıcıları getirir
 * @param role Kullanıcı rolü
 */
export async function getUsersByRole(role: UserRole): Promise<UserData[]> {
  try {
    // URL'yi uygun şekilde oluştur - [role] yerine [id] kullanıyoruz
    const url = getApiUrl(`/api/users/by-role/${role}`);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Kullanıcı verileri alınamadı");
    }

    return await response.json();
  } catch (error) {
    return [];
  }
}

/**
 * E-posta adresiyle kullanıcı arar
 * @param email E-posta adresi
 */
export async function getUserByEmail(
  email: string
): Promise<UserData | undefined> {
  try {
    const encodedEmail = encodeURIComponent(email);
    const url = getApiUrl(`/api/users/by-email/${encodedEmail}`);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return undefined;
      }
      throw new Error("Kullanıcı verileri alınamadı");
    }

    return await response.json();
  } catch (error) {
    return undefined;
  }
}

/**
 * Kullanıcı oluşturur veya günceller
 * @param userData Kullanıcı verileri
 */
export async function saveUser(userData: UserData): Promise<UserData> {
  try {
    const url = getApiUrl("/api/users");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error("Kullanıcı kaydedilemedi");
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

// API'den kullanıcıları getir
export async function fetchUsersFromAPI() {
  return getUsers();
}
