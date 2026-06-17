"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { User } from "@/types";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const data = await api.get<{ user: User }>("/auth/me");
      return data.user;
    },
    retry: false,
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: (input: { phone: string; password: string }) =>
      api.post<{ user: User; mustChangePassword: boolean }>(
        "/auth/login",
        input,
      ),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/auth/logout"),
    onSuccess: () => qc.clear(),
  });
}

export function useChangePassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      api.post("/auth/change-password", input),
    onSuccess: () => {
      // Parol o'zgardi: keshdagi foydalanuvchini darhol yangilaymiz, aks holda
      // AppShell hali ham mustChangePassword=true ko'rib qayta yo'naltiradi.
      qc.setQueryData<User | undefined>(["me"], (old) =>
        old ? { ...old, mustChangePassword: false } : old,
      );
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
