import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useActor } from "@/hooks/useActor";
import {
  getIntegritySalt,
  useInitiatePayment,
  useMerchantConfig,
} from "@/hooks/useQueries";
import type { PaymentResponse } from "@/hooks/useQueries";
import {
  computeJazzCashHash,
  formatJazzCashDateTime,
  generateTxnRef,
} from "@/utils/jazzcash";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  Smartphone,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

type DialogState =
  | { type: "idle" }
  | { type: "waiting" }
  | { type: "success"; data: PaymentResponse }
  | { type: "error"; message: string };

export function PaymentForm() {
  const [mobileNumber, setMobileNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dialogState, setDialogState] = useState<DialogState>({ type: "idle" });

  const { actor } = useActor();
  const { data: merchantConfig } = useMerchantConfig();
  const initiatePayment = useInitiatePayment();

  const isConfigured = merchantConfig?.isConfigured ?? false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!actor) return;

    setDialogState({ type: "waiting" });

    try {
      const salt = await getIntegritySalt(actor);
      const txnRef = generateTxnRef();
      const now = new Date();
      const expiry = new Date(now.getTime() + 30 * 60 * 1000);
      const txnDateTime = formatJazzCashDateTime(now);
      const txnExpiryDateTime = formatJazzCashDateTime(expiry);
      const amountFormatted = (Number(amount) * 100).toFixed(0);

      const params: Record<string, string> = {
        pp_Amount: amountFormatted,
        pp_BillReference: txnRef,
        pp_Description: description || "Payment",
        pp_Language: "EN",
        pp_MerchantID: merchantConfig?.merchantId ?? "",
        pp_MobileNumber: mobileNumber,
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

      const secureHash = await computeJazzCashHash(params, salt);

      const result = await initiatePayment.mutateAsync({
        mobileNumber,
        amount: BigInt(Math.round(Number(amount) * 100)),
        description: description || "Payment",
        txnRef,
        txnDateTime,
        txnExpiryDateTime,
        secureHash,
      });

      if (result.responseCode === "000") {
        setDialogState({ type: "success", data: result });
        setMobileNumber("");
        setAmount("");
        setDescription("");
      } else {
        setDialogState({
          type: "error",
          message:
            result.responseMessage || "Payment failed. Please try again.",
        });
      }
    } catch (err: any) {
      setDialogState({
        type: "error",
        message: err?.message || "An unexpected error occurred.",
      });
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      {!isConfigured && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-lg bg-accent border border-primary/20 flex items-start gap-3"
        >
          <AlertTriangle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-primary">
              Merchant not configured
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Go to Settings tab to configure your JazzCash merchant
              credentials.
            </p>
          </div>
        </motion.div>
      )}

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-5"
      >
        <div className="space-y-2">
          <Label
            htmlFor="mobileNumber"
            className="text-sm font-semibold text-foreground"
          >
            <Smartphone className="inline h-4 w-4 mr-1.5 text-primary" />
            JazzCash Mobile Number
          </Label>
          <Input
            id="mobileNumber"
            data-ocid="payment.input"
            type="tel"
            placeholder="03xxxxxxxxx"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            pattern="03[0-9]{9}"
            maxLength={11}
            required
            className="h-12 text-base font-mono tracking-wider"
          />
          <p className="text-xs text-muted-foreground">
            Enter 11-digit number starting with 03
          </p>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="amount"
            className="text-sm font-semibold text-foreground"
          >
            <CreditCard className="inline h-4 w-4 mr-1.5 text-primary" />
            Amount (PKR)
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">
              ₨
            </span>
            <Input
              id="amount"
              data-ocid="payment.amount.input"
              type="number"
              placeholder="500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              step="1"
              required
              className="h-12 pl-8 text-base"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="description"
            className="text-sm font-semibold text-foreground"
          >
            <FileText className="inline h-4 w-4 mr-1.5 text-primary" />
            Description{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </Label>
          <Textarea
            id="description"
            data-ocid="payment.description.input"
            placeholder="e.g. School fee payment, Utility bill..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>

        <Button
          type="submit"
          data-ocid="payment.submit_button"
          className="w-full h-13 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md hover:shadow-lg"
          disabled={
            !isConfigured ||
            initiatePayment.isPending ||
            dialogState.type === "waiting"
          }
        >
          {initiatePayment.isPending || dialogState.type === "waiting" ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            "Pay Now"
          )}
        </Button>
      </motion.form>

      {/* Waiting / Loading Dialog */}
      <Dialog open={dialogState.type === "waiting"} onOpenChange={() => {}}>
        <DialogContent
          data-ocid="payment.loading_state"
          className="max-w-sm text-center"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-semibold">
              Processing Payment
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center">
                <Smartphone className="h-8 w-8 text-primary" />
              </div>
              <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                <Loader2 className="h-3 w-3 text-white animate-spin" />
              </div>
            </div>
            <div>
              <p className="font-semibold text-foreground">
                Waiting for MPIN confirmation
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                A popup has been sent to your phone. Please enter your JazzCash
                MPIN to confirm.
              </p>
            </div>
            <div className="flex gap-1.5 mt-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-2 w-2 rounded-full bg-primary"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{
                    duration: 1.2,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: i * 0.3,
                  }}
                />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <AnimatePresence>
        {dialogState.type === "success" && (
          <Dialog open onOpenChange={() => setDialogState({ type: "idle" })}>
            <DialogContent
              data-ocid="payment.success_state"
              className="max-w-sm"
            >
              <div className="py-4 flex flex-col items-center gap-4 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center"
                >
                  <CheckCircle2 className="h-10 w-10 text-success" />
                </motion.div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    Payment Successful!
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your transaction has been confirmed.
                  </p>
                </div>
                <div className="w-full bg-secondary rounded-lg p-4 space-y-2 text-left">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Transaction Ref
                    </span>
                    <span className="font-mono font-semibold text-xs">
                      {dialogState.data.txnRef}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-semibold text-success">SUCCESS</span>
                  </div>
                </div>
                <Button
                  className="w-full bg-success text-success-foreground hover:bg-success/90"
                  onClick={() => setDialogState({ type: "idle" })}
                >
                  Done
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Error Dialog */}
      <AnimatePresence>
        {dialogState.type === "error" && (
          <Dialog open onOpenChange={() => setDialogState({ type: "idle" })}>
            <DialogContent data-ocid="payment.error_state" className="max-w-sm">
              <div className="py-4 flex flex-col items-center gap-4 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center"
                >
                  <XCircle className="h-10 w-10 text-destructive" />
                </motion.div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    Payment Failed
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    {dialogState.message}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-destructive/30 text-destructive hover:bg-destructive/5"
                  onClick={() => setDialogState({ type: "idle" })}
                >
                  Try Again
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
