import NextAuth from "next-auth";
import { UserRole } from "@/models/User";

declare module "next-auth" {
  interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    slug?: string;
    requiresTwoFactor?: boolean;
    github?: string;
    linkedin?: string;
    kaggle?: string; 
    huggingface?: string;
    website?: string;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
      slug?: string;
      requiresTwoFactor?: boolean;
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole; 
    requiresTwoFactor?: boolean;
  }
}
