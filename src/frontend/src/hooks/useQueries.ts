import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createActorWithConfig } from "../config";
import { useActor } from "./useActor";

export interface Transaction {
  txnRef: string;
  mobileNumber: string;
  amount: bigint;
  description: string;
  status: string;
  responseCode: string;
  responseMessage: string;
  timestamp: bigint;
}

export interface MerchantConfig {
  merchantId: string;
  isSandbox: boolean;
  isConfigured: boolean;
}

export interface PaymentRequest {
  mobileNumber: string;
  cnic: string;
  amount: bigint;
  description: string;
  txnRef: string;
  txnDateTime: string;
  txnExpiryDateTime: string;
  secureHash: string;
}

export interface PaymentResponse {
  txnRef: string;
  responseCode: string;
  responseMessage: string;
  status: string;
}

export function useMerchantConfig() {
  const { actor, isFetching } = useActor();
  return useQuery<MerchantConfig>({
    queryKey: ["merchantConfig"],
    queryFn: async () => {
      if (!actor)
        return { merchantId: "", isSandbox: true, isConfigured: false };
      return actor.getMerchantConfig();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useTransactions() {
  const { actor, isFetching } = useActor();
  return useQuery<Transaction[]>({
    queryKey: ["transactions"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTransactions();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUpdateMerchantConfig() {
  const { actor, isFetching } = useActor();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({
      merchantId,
      password,
      salt,
      isSandbox,
    }: {
      merchantId: string;
      password: string;
      salt: string;
      isSandbox: boolean;
    }) => {
      let activeActor = actor;
      if (!activeActor) {
        activeActor = await createActorWithConfig();
      }
      if (!activeActor)
        throw new Error("Backend not available. Please refresh and try again.");
      return activeActor.updateMerchantConfig(
        merchantId,
        password,
        salt,
        isSandbox,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchantConfig"] });
    },
  });

  return { ...mutation, isActorReady: !!actor && !isFetching };
}

export function useInitiatePayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (req: PaymentRequest): Promise<PaymentResponse> => {
      let activeActor = actor;
      if (!activeActor) {
        activeActor = await createActorWithConfig();
      }
      if (!activeActor)
        throw new Error("Backend not available. Please refresh and try again.");
      return activeActor.initiatePayment(req);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export async function getIntegritySalt(actor: any): Promise<string> {
  return actor.getIntegritySalt();
}
