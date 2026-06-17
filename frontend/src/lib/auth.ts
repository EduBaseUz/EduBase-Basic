import { api } from "@/lib/api";
import type { Role, User } from "@/types";

/** Fetch the current user, or null if not authenticated. */
export async function getMe(): Promise<User | null> {
  try {
    const data = await api.get<{ user: User }>("/auth/me");
    return data.user;
  } catch {
    return null;
  }
}

/** Default landing route for a role. */
export function homeForRole(role: Role): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "mentor":
      return "/mentor/dashboard";
    case "student":
      return "/student/dashboard";
    default:
      return "/login";
  }
}

export const roleLabels: Record<Role, string> = {
  admin: "Administrator",
  mentor: "Mentor",
  student: "O'quvchi",
  parent: "Ota-ona",
};
