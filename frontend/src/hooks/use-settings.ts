"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AvatarGender, DefaultAvatar } from "@/types";

const KEY = ["default-avatars"];

export function useDefaultAvatars() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api.get<DefaultAvatar[]>("/settings/avatars"),
  });
}

export function useUploadDefaultAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, gender }: { file: File; gender: AvatarGender }) => {
      const fd = new FormData();
      fd.append("avatar", file);
      fd.append("gender", gender);
      return api.upload<DefaultAvatar>("/settings/avatars", fd);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteDefaultAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/settings/avatars/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
