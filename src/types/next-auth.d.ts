import type { DefaultSession } from "next-auth";
import type { Role } from "@/lib/auth/roles";

declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
    dealerId?: string | null;
    dealerName?: string | null;
    dealerActive?: boolean;
    dealerRolloutActive?: boolean;
    mustChangePassword?: boolean;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      dealerId: string | null;
      dealerName: string | null;
      dealerActive: boolean;
      dealerRolloutActive: boolean;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    dealerId: string | null;
    dealerName: string | null;
    dealerActive: boolean;
    dealerRolloutActive: boolean;
    mustChangePassword: boolean;
  }
}
