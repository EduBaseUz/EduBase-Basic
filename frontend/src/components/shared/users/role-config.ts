import { GraduationCap, Users, UserCog, type LucideIcon } from "lucide-react";
import type { Role } from "@/types";

export type ManagedRole = Extract<Role, "mentor" | "student" | "parent">;

interface RoleMeta {
  icon: LucideIcon;
  plural: string;
  singular: string;
  createLabel: string;
  basePath: string;
}

export const roleMeta: Record<ManagedRole, RoleMeta> = {
  mentor: {
    icon: UserCog,
    plural: "Mentorlar",
    singular: "mentor",
    createLabel: "Yangi mentor",
    basePath: "/admin/users/mentors",
  },
  student: {
    icon: GraduationCap,
    plural: "Talabalar",
    singular: "talaba",
    createLabel: "Yangi talaba",
    basePath: "/admin/users/students",
  },
  parent: {
    icon: Users,
    plural: "Ota-onalar",
    singular: "ota-ona",
    createLabel: "Yangi ota-ona",
    basePath: "/admin/users/parents",
  },
};
