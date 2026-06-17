"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Lesson, LessonRoster, Paginated } from "@/types";

export function useLessons(groupId: string | undefined) {
  return useQuery({
    queryKey: ["lessons", groupId],
    queryFn: () =>
      api.get<Paginated<Lesson>>(`/groups/${groupId}/lessons?limit=100`),
    enabled: Boolean(groupId),
  });
}

export function useLessonRoster(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => api.get<LessonRoster>(`/lessons/${lessonId}`),
    enabled: Boolean(lessonId),
  });
}

export function useCreateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      body,
    }: {
      groupId: string;
      body: Record<string, unknown>;
    }) => api.post<Lesson>(`/groups/${groupId}/lessons`, body),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: ["lessons", v.groupId] }),
  });
}

export function useUpdateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch<Lesson>(`/lessons/${id}`, body),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["lessons"] });
      qc.invalidateQueries({ queryKey: ["lesson", v.id] });
    },
  });
}

export function useDeleteLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/lessons/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lessons"] }),
  });
}

export function useSetAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      lessonId,
      items,
    }: {
      lessonId: string;
      items: { studentId: string; status: string }[];
    }) => api.post(`/lessons/${lessonId}/attendance`, { items }),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: ["lesson", v.lessonId] }),
  });
}

export function useSetGrades() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      lessonId,
      items,
    }: {
      lessonId: string;
      items: { studentId: string; type: string; score: number }[];
    }) => api.post(`/lessons/${lessonId}/grades`, { items }),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: ["lesson", v.lessonId] }),
  });
}
