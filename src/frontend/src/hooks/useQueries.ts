import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createActorWithConfig } from "../config";
import { useActor } from "./useActor";

const STORAGE_KEY = "jazzcash_merchant_config";

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

export interface StoredConfig {
  merchantId: string;
  password: string;
  salt: string;
  isSandbox: boolean;
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

function loadStoredConfig(): StoredConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredConfig;
  } catch {
    return null;
  }
}

function saveStoredConfig(cfg: StoredConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export function useMerchantConfig() {
  return useQuery<MerchantConfig>({
    queryKey: ["merchantConfig"],
    queryFn: async () => {
      const stored = loadStoredConfig();
      if (!stored)
        return { merchantId: "", isSandbox: true, isConfigured: false };
      return {
        merchantId: stored.merchantId,
        isSandbox: stored.isSandbox,
        isConfigured: !!(stored.merchantId && stored.password && stored.salt),
      };
    },
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useTransactions() {
  const { actor, isFetching } = useActor();
  return useQuery<Transaction[]>({
    queryKey: ["transactions"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getTransactions();
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUpdateMerchantConfig() {
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
      // Save to localStorage -- no backend needed
      saveStoredConfig({ merchantId, password, salt, isSandbox });
      // Best-effort sync to backend (ignore errors)
      try {
        const actor = await createActorWithConfig();
        await Promise.race([
          actor.updateMerchantConfig(merchantId, password, salt, isSandbox),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 5000),
          ),
        ]);
      } catch {
        // Silently ignore backend sync errors -- credentials are saved locally
      }
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchantConfig"] });
    },
  });

  return { ...mutation, isActorReady: true };
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

export async function getIntegritySalt(_actor: any): Promise<string> {
  const stored = loadStoredConfig();
  if (stored?.salt) return stored.salt;
  // Fallback to backend
  try {
    return await _actor.getIntegritySalt();
  } catch {
    throw new Error(
      "Integrity salt not configured. Please save credentials in Settings.",
    );
  }
}
