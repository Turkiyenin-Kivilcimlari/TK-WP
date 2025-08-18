import axios from "axios";
import { getSession } from "next-auth/react";
import { decrypt } from "./crypto";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "",
  headers: {
    "Content-Type": "application/json",
  },
});

// İstek öncesi token kontrolü
api.interceptors.request.use(
  async (config) => {
    if (typeof window !== "undefined") {
      const session = await getSession();

      // NextAuth oturumunda token doğrudan erişilebilir değil
      // Session'ı Bearer token formatına uygun olarak kullan
      if (session) {
        // NextAuth.js otomatik olarak bir session token üretir, bunu kullan
        const token = session.user?.id ? `${session.user.id}` : "";
        if (token) {
          config.headers["Authorization"] = `Bearer ${token}`;
        }
      }
    }

    // API endpoint'lerinin /api ile başlamasını sağla
    if (
      config.url &&
      !config.url.startsWith("/api") &&
      !config.url.startsWith("http")
    ) {
      // Admin API rotaları için özel işlem
      if (config.url.startsWith("/admin/")) {
        config.url = `/api${config.url}`;
      } else {
        config.url = `/api${config.url}`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// POST isteği
const post = async (url: string, data?: any) => {
  const response = await axios.post(url, data);
  return response;
};

// PUT isteği
const put = async (url: string, data?: any) => {
  const response = await axios.put(url, data);
  return response;
};

// Cevap hatası durumunda işlem
api.interceptors.response.use(
  (response) => {
    const data = response.data as any;
    if (data && typeof data.payload === "string") {
      try {
        const decrypted = decrypt(data.payload);
        response.data = JSON.parse(decrypted);
      } catch (err) {}
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token geçersiz veya süresi dolmuş
      if (typeof window !== "undefined") {
        // Admin API hatası mı kontrol et
        if (
          error.config?.url?.includes("/admin/") &&
          error.response?.data?.errorType === "2fa_required"
        ) {
          // 2FA doğrulama sayfasına yönlendir
          window.location.href =
            "/admin/verify-2fa?returnUrl=" +
            encodeURIComponent(window.location.pathname);
          return Promise.reject(error);
        }
      }
    } else if (error.response?.status === 404) {
    }

    // Özel event dispatch et
    const event = new CustomEvent("api-error", {
      detail: { error },
    });
    window.dispatchEvent(event);

    return Promise.reject(error);
  }
);

export default api;
