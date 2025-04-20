import NextAuth from "next-auth";
import { UserRole } from "@/models/User";

declare module "next-auth" {
  interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    requiresTwoFactor?: boolean;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
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
