"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  AdminDashboard,
  MentorDashboard,
  StudentDashboard,
} from "@/types";

export function useAdminDashboard() {
  return useQuery({
    queryKey: ["dashboard-admin"],
    queryFn: () => api.get<AdminDashboard>("/dashboard/admin"),
  });
}

export function useMentorDashboard() {
  return useQuery({
    queryKey: ["dashboard-mentor"],
    queryFn: () => api.get<MentorDashboard>("/dashboard/mentor"),
  });
}

export function useStudentDashboard() {
  return useQuery({
    queryKey: ["dashboard-student"],
    queryFn: () => api.get<StudentDashboard>("/dashboard/student"),
  });
}
