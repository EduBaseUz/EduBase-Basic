"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  DebtorsResponse,
  FinanceSummary,
  MentorPayout,
  OrgTransaction,
  Paginated,
  Payout,
  StudentLedger,
  TuitionLedger,
} from "@/types";

const ORG_KEY = ["org-transactions"];

export function useOrgTransactions() {
  return useQuery({
    queryKey: ORG_KEY,
    queryFn: () =>
      api.get<Paginated<OrgTransaction>>(
        "/finance/org-transactions?limit=200",
      ),
  });
}

export function useCreateOrgTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<OrgTransaction>("/finance/org-transactions", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ORG_KEY }),
  });
}

export function useUpdateOrgTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch<OrgTransaction>(`/finance/org-transactions/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ORG_KEY }),
  });
}

export function useDeleteOrgTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/finance/org-transactions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ORG_KEY }),
  });
}

export function useFinanceSummary(params: { from?: string; to?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  return useQuery({
    queryKey: ["finance-summary", params],
    queryFn: () => api.get<FinanceSummary>(`/finance/summary?${qs.toString()}`),
  });
}

export function useTuition(courseId: string, period: string) {
  return useQuery({
    queryKey: ["tuition", courseId, period],
    queryFn: () =>
      api.get<StudentLedger[]>(
        `/tuition?courseId=${courseId}&period=${period}`,
      ),
    enabled: Boolean(courseId && period),
  });
}

export function useStudentTuitionHistory(studentId: string | undefined) {
  return useQuery({
    queryKey: ["tuition-history", studentId],
    queryFn: () => api.get<TuitionLedger[]>(`/tuition/student/${studentId}`),
    enabled: Boolean(studentId),
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

export function useDeleteTuitionTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, txnId }: { id: string; txnId: string }) =>
      api.delete<TuitionLedger>(`/tuition/${id}/transactions/${txnId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tuition"] });
      qc.invalidateQueries({ queryKey: ["tuition-history"] });
    },
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

export function usePayouts(courseId: string, period: string) {
  return useQuery({
    queryKey: ["payouts", courseId, period],
    queryFn: () =>
      api.get<MentorPayout[]>(`/payouts?courseId=${courseId}&period=${period}`),
    enabled: Boolean(courseId && period),
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

export function useDeletePayoutTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, txnId }: { id: string; txnId: string }) =>
      api.delete<Payout>(`/payouts/${id}/transactions/${txnId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payouts"] }),
  });
}

export function useDebtors() {
  return useQuery({
    queryKey: ["debtors"],
    queryFn: () => api.get<DebtorsResponse>("/finance/debtors"),
  });
}

export function useMyPayouts() {
  return useQuery({
    queryKey: ["my-payouts"],
    queryFn: () => api.get<Payout[]>("/me/payouts"),
  });
}
