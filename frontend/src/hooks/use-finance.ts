"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  FinanceSummary,
  Paginated,
  Payout,
  TuitionLedger,
} from "@/types";

export function useFinanceSummary(params: { from?: string; to?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  return useQuery({
    queryKey: ["finance-summary", params],
    queryFn: () => api.get<FinanceSummary>(`/finance/summary?${qs.toString()}`),
  });
}

export function useTuition(period: string) {
  return useQuery({
    queryKey: ["tuition", period],
    queryFn: () =>
      api.get<Paginated<TuitionLedger>>(`/tuition?period=${period}&limit=200`),
  });
}

export function useAddTuitionTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.post<TuitionLedger>(`/tuition/${id}/transactions`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tuition"] }),
  });
}

export function useUpdateTuition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch<TuitionLedger>(`/tuition/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tuition"] }),
  });
}

export function usePayouts(period: string) {
  return useQuery({
    queryKey: ["payouts", period],
    queryFn: () =>
      api.get<Paginated<Payout>>(`/payouts?period=${period}&limit=200`),
  });
}

export function useAddPayoutTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.post<Payout>(`/payouts/${id}/transactions`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payouts"] }),
  });
}

export function useMyPayouts() {
  return useQuery({
    queryKey: ["my-payouts"],
    queryFn: () => api.get<Payout[]>("/me/payouts"),
  });
}
