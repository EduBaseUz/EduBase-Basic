"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  Group,
  StudentAttendanceRow,
  StudentGradeRow,
} from "@/types";

export function useMyGroups() {
  return useQuery({
    queryKey: ["my-groups"],
    queryFn: () => api.get<Group[]>("/me/groups"),
  });
}

export function useMyAttendance() {
  return useQuery({
    queryKey: ["my-attendance"],
    queryFn: () => api.get<StudentAttendanceRow[]>("/me/attendance"),
  });
}

export function useMyGrades() {
  return useQuery({
    queryKey: ["my-grades"],
    queryFn: () => api.get<StudentGradeRow[]>("/me/grades"),
  });
}
