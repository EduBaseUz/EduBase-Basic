"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Group, GroupDetail, Paginated, RatingRow } from "@/types";

export function useGroups() {
  return useQuery({
    queryKey: ["groups"],
    queryFn: () => api.get<Paginated<Group>>("/groups?limit=100"),
  });
}

export function useGroup(id: string | undefined) {
  return useQuery({
    queryKey: ["group", id],
    queryFn: () => api.get<GroupDetail>(`/groups/${id}`),
    enabled: Boolean(id),
  });
}

export function useGroupRating(id: string | undefined) {
  return useQuery({
    queryKey: ["group-rating", id],
    queryFn: () => api.get<RatingRow[]>(`/groups/${id}/rating`),
    enabled: Boolean(id),
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<Group>("/groups", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch<Group>(`/groups/${id}`, body),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      qc.invalidateQueries({ queryKey: ["group", v.id] });
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/groups/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useSetGroupMentors() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, mentorIds }: { id: string; mentorIds: string[] }) =>
      api.post(`/groups/${id}/mentors`, { mentorIds }),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["group", v.id] }),
  });
}

export function useAddStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, studentId }: { id: string; studentId: string }) =>
      api.post(`/groups/${id}/students`, { studentId }),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["group", v.id] }),
  });
}

export function useRemoveStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, studentId }: { id: string; studentId: string }) =>
      api.delete(`/groups/${id}/students/${studentId}`),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["group", v.id] }),
  });
}

export function useMoveStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      studentId,
      toGroupId,
    }: {
      id: string;
      studentId: string;
      toGroupId: string;
    }) => api.post(`/groups/${id}/students/${studentId}/move`, { toGroupId }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["group", v.id] });
      qc.invalidateQueries({ queryKey: ["group", v.toGroupId] });
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export interface PromotionItem {
  studentId: string;
  outcome: "passed" | "repeat";
  targetGroupId: string;
}

export function usePromoteStudents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, items }: { id: string; items: PromotionItem[] }) =>
      api.post(`/groups/${id}/promote`, { items }),
    onSuccess: () => {
      // Bir nechta guruh o'zgaradi — barchasini yangilaymiz.
      qc.invalidateQueries({ queryKey: ["group"] });
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}
