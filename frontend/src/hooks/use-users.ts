"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Paginated, User, UserDetail } from "@/types";

export function useUsers(params: { role?: string; search?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.role) qs.set("role", params.role);
  if (params.search) qs.set("search", params.search);
  qs.set("limit", "100");
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => api.get<Paginated<User>>(`/users?${qs.toString()}`),
  });
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => api.get<User>(`/users/${id}`),
    enabled: Boolean(id),
  });
}

export function useUserDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["user-detail", id],
    queryFn: () => api.get<UserDetail>(`/users/${id}/detail`),
    enabled: Boolean(id),
  });
}

export function useAssignParent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, parentId }: { id: string; parentId: string }) =>
      api.post(`/users/${id}/parent`, { parentId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useSetChildren() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, studentIds }: { id: string; studentIds: string[] }) =>
      api.post(`/users/${id}/children`, { studentIds }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["user-detail", v.id] });
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<User>("/users", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch<User>(`/users/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (id: string) => api.post(`/users/${id}/reset-password`),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.patch<User>("/me/profile", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}
