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

async function callJazzCashDirect(
  req: PaymentRequest & {
    merchantId: string;
    password: string;
    isSandbox: boolean;
  },
): Promise<PaymentResponse> {
  const baseUrl = req.isSandbox
    ? "https://sandbox.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction"
    : "https://jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction";

  const amountStr = req.amount.toString();

  const body = {
    pp_Version: "1.1",
    pp_TxnType: "MWALLET",
    pp_Language: "EN",
    pp_MerchantID: req.merchantId,
    pp_SubMerchantID: "",
    pp_Password: req.password,
    pp_BillReference: `BILL${req.txnRef}`,
    pp_Amount: amountStr,
    pp_TxnCurrency: "PKR",
    pp_TxnDateTime: req.txnDateTime,
    pp_TxnExpiryDateTime: req.txnExpiryDateTime,
    pp_TxnRefNo: req.txnRef,
    pp_MobileNumber: req.mobileNumber,
    pp_CNIC: req.cnic,
    pp_Description: req.description,
    pp_SecureHash: req.secureHash,
    ppmpf_1: "",
    ppmpf_2: "",
    ppmpf_3: "",
    ppmpf_4: "",
    ppmpf_5: "",
  };

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `JazzCash API error: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  const code: string = data.pp_ResponseCode ?? data.responseCode ?? "999";
  const message: string =
    data.pp_ResponseMessage ?? data.responseMessage ?? "Unknown error";
  const status =
    code === "000" ? "SUCCESS" : code === "157" ? "PENDING" : "FAILED";

  return {
    txnRef: req.txnRef,
    responseCode: code,
    responseMessage: message,
    status,
  };
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

      const result = await callJazzCashDirect({
        ...req,
        merchantId: stored.merchantId,
        password: stored.password,
        isSandbox: stored.isSandbox,
      });

      // Save transaction to local history
      saveTransaction({
        txnRef: result.txnRef,
        mobileNumber: req.mobileNumber,
        amount: req.amount,
        description: req.description,
        status: result.status,
        responseCode: result.responseCode,
        responseMessage: result.responseMessage,
        timestamp: BigInt(Date.now()),
      });

      return result;
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
