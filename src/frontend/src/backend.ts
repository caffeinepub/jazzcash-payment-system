import { Actor, HttpAgent } from "@dfinity/agent";
import { IDL } from "@dfinity/candid";

// Candid IDL factory
const idlFactory = ({ IDL: I }: { IDL: typeof IDL }) => {
  const MerchantConfig = I.Record({
    merchantId: I.Text,
    isSandbox: I.Bool,
    isConfigured: I.Bool,
  });

  const TransactionRecord = I.Record({
    txnRef: I.Text,
    mobileNumber: I.Text,
    amount: I.Nat,
    description: I.Text,
    status: I.Text,
    responseCode: I.Text,
    responseMessage: I.Text,
    timestamp: I.Int,
  });

  const PaymentRequest = I.Record({
    mobileNumber: I.Text,
    amount: I.Nat,
    description: I.Text,
    txnRef: I.Text,
    txnDateTime: I.Text,
    txnExpiryDateTime: I.Text,
    secureHash: I.Text,
  });

  const PaymentResult = I.Record({
    txnRef: I.Text,
    responseCode: I.Text,
    responseMessage: I.Text,
    status: I.Text,
  });

  return I.Service({
    updateMerchantConfig: I.Func(
      [I.Text, I.Text, I.Text, I.Bool],
      [],
      [],
    ),
    getMerchantConfig: I.Func([], [MerchantConfig], ["query"]),
    getIntegritySalt: I.Func([], [I.Text], ["query"]),
    initiatePayment: I.Func([PaymentRequest], [PaymentResult], []),
    getTransactions: I.Func([], [I.Vec(TransactionRecord)], ["query"]),
  });
};

export interface backendInterface {
  getMerchantConfig(): Promise<{ merchantId: string; isSandbox: boolean; isConfigured: boolean }>;
  getIntegritySalt(): Promise<string>;
  updateMerchantConfig(merchantId: string, password: string, salt: string, isSandbox: boolean): Promise<void>;
  initiatePayment(req: {
    mobileNumber: string;
    amount: bigint;
    description: string;
    txnRef: string;
    txnDateTime: string;
    txnExpiryDateTime: string;
    secureHash: string;
  }): Promise<{ txnRef: string; responseCode: string; responseMessage: string; status: string }>;
  getTransactions(): Promise<Array<{
    txnRef: string;
    mobileNumber: string;
    amount: bigint;
    description: string;
    status: string;
    responseCode: string;
    responseMessage: string;
    timestamp: bigint;
  }>>;
}

export interface CreateActorOptions {
  agentOptions?: {
    identity?: any;
    host?: string;
  };
  agent?: HttpAgent;
  processError?: (e: unknown) => never;
}

export class ExternalBlob {
  static fromURL(url: string): ExternalBlob {
    return new ExternalBlob(url);
  }

  private url: string;
  onProgress?: (progress: number) => void;

  constructor(url: string) {
    this.url = url;
  }

  async getBytes(): Promise<Uint8Array> {
    const res = await fetch(this.url);
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  }
}

export async function createActor(
  canisterId: string,
  _uploadFile: (file: ExternalBlob) => Promise<Uint8Array>,
  _downloadFile: (bytes: Uint8Array) => Promise<ExternalBlob>,
  options?: CreateActorOptions,
): Promise<backendInterface> {
  const agent = options?.agent ?? new HttpAgent({
    host: "https://ic0.app",
    ...options?.agentOptions,
  });

  return Actor.createActor(idlFactory as any, {
    agent,
    canisterId,
  }) as unknown as backendInterface;
}
