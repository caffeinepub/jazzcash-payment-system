import {
  computeJazzCashHash,
  formatJazzCashDateTime,
  generateTxnRef,
} from "@/utils/jazzcash";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const STORAGE_KEY = "jazzcash_merchant_config";
const TRANSACTIONS_KEY = "jazzcash_transactions";

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
  txnRef?: string;
  txnDateTime?: string;
  txnExpiryDateTime?: string;
  secureHash?: string;
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

function loadTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<{
      txnRef: string;
      mobileNumber: string;
      amount: string;
      description: string;
      status: string;
      responseCode: string;
      responseMessage: string;
      timestamp: string;
    }>;
    return parsed.map((t) => ({
      ...t,
      amount: BigInt(t.amount),
      timestamp: BigInt(t.timestamp),
    }));
  } catch {
    return [];
  }
}

function saveTransaction(txn: Transaction): void {
  const existing = loadTransactions();
  const serialized = [
    {
      txnRef: txn.txnRef,
      mobileNumber: txn.mobileNumber,
      amount: txn.amount.toString(),
      description: txn.description,
      status: txn.status,
      responseCode: txn.responseCode,
      responseMessage: txn.responseMessage,
      timestamp: txn.timestamp.toString(),
    },
    ...existing.map((t) => ({
      txnRef: t.txnRef,
      mobileNumber: t.mobileNumber,
      amount: t.amount.toString(),
      description: t.description,
      status: t.status,
      responseCode: t.responseCode,
      responseMessage: t.responseMessage,
      timestamp: t.timestamp.toString(),
    })),
  ];
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(serialized));
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
  return useQuery<Transaction[]>({
    queryKey: ["transactions"],
    queryFn: async () => loadTransactions(),
    staleTime: 0,
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
      saveStoredConfig({ merchantId, password, salt, isSandbox });
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchantConfig"] });
    },
  });

  return { ...mutation, isActorReady: true };
}

export function useInitiatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (req: PaymentRequest): Promise<PaymentResponse> => {
      const stored = loadStoredConfig();
      if (!stored) {
        throw new Error(
          "Merchant credentials not configured. Please save credentials in Settings.",
        );
      }

      // Build payment parameters entirely in the browser
      const txnRef = generateTxnRef();
      const now = new Date();
      const expiry = new Date(now.getTime() + 30 * 60 * 1000);
      const txnDateTime = formatJazzCashDateTime(now);
      const txnExpiryDateTime = formatJazzCashDateTime(expiry);
      const amountFormatted = Number(req.amount).toFixed(0);
      const billRef = `BILL${txnRef}`;

      const params: Record<string, string> = {
        pp_Amount: amountFormatted,
        pp_BankID: "TBANK",
        pp_BillReference: billRef,
        pp_CNIC: req.cnic,
        pp_Description: req.description || "Payment",
        pp_Language: "EN",
        pp_MerchantID: stored.merchantId,
        pp_MobileNumber: req.mobileNumber,
        pp_Password: stored.password,
        pp_ProductID: "RETL",
        pp_SubMerchantID: "",
        pp_TxnCurrency: "PKR",
        pp_TxnDateTime: txnDateTime,
        pp_TxnExpiryDateTime: txnExpiryDateTime,
        pp_TxnRefNo: txnRef,
        pp_TxnType: "MWALLET",
        pp_Version: "1.1",
        ppmpf_1: "",
        ppmpf_2: "",
        ppmpf_3: "",
        ppmpf_4: "",
        ppmpf_5: "",
      };

      const secureHash = await computeJazzCashHash(params, stored.salt);

      const endpoint = stored.isSandbox
        ? "https://sandbox.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction"
        : "https://payments.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction";

      // Use CORS proxy to avoid browser CORS restrictions
      const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(endpoint)}`;

      const body = JSON.stringify({ ...params, pp_SecureHash: secureHash });

      let responseData: Record<string, string> | null = null;

      try {
        const res = await fetch(proxyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        if (res.ok) {
          responseData = (await res.json()) as Record<string, string>;
        }
      } catch {
        // proxy failed, try direct call as fallback
      }

      if (!responseData) {
        // Fallback: try direct call (may work on some networks)
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          });
          if (res.ok) {
            responseData = (await res.json()) as Record<string, string>;
          }
        } catch {
          throw new Error(
            "Unable to reach JazzCash. Check your internet connection and try again.",
          );
        }
      }

      if (!responseData) {
        throw new Error("No response from JazzCash. Please try again.");
      }

      const respCode = responseData.pp_ResponseCode ?? "999";
      const respMsg =
        responseData.pp_ResponseMessage ??
        responseData.pp_TxnMessage ??
        "Unknown error";
      const respTxnRef = responseData.pp_TxnRefNo ?? txnRef;
      const status = respCode === "000" ? "SUCCESS" : "FAILED";

      // Save transaction to local history
      saveTransaction({
        txnRef: respTxnRef,
        mobileNumber: req.mobileNumber,
        amount: req.amount,
        description: req.description,
        status,
        responseCode: respCode,
        responseMessage: respMsg,
        timestamp: BigInt(Date.now()),
      });

      return {
        txnRef: respTxnRef,
        responseCode: respCode,
        responseMessage: respMsg,
        status,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export async function getIntegritySalt(_actor: unknown): Promise<string> {
  const stored = loadStoredConfig();
  if (stored?.salt) return stored.salt;
  throw new Error(
    "Integrity salt not configured. Please save credentials in Settings.",
  );
}
