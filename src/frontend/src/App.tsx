import { MerchantSettings } from "@/components/MerchantSettings";
import { PaymentForm } from "@/components/PaymentForm";
import { TransactionHistory } from "@/components/TransactionHistory";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, History, Settings } from "lucide-react";

export default function App() {
  const currentYear = new Date().getFullYear();
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-xs sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-normal leading-tight">
              <span className="text-primary font-semibold tracking-tight">
                Jazz
              </span>
              <span className="text-foreground font-semibold tracking-tight">
                Cash
              </span>
              <span className="text-muted-foreground font-normal text-base ml-2">
                Payments
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Mobile wallet payment gateway
            </p>
          </div>
          <div className="ml-auto">
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-semibold">
              PKR
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <Tabs defaultValue="payment" className="w-full">
          <TabsList
            data-ocid="nav.tab"
            className="w-full mb-8 bg-secondary border border-border rounded-xl p-1 grid grid-cols-3 h-auto"
          >
            <TabsTrigger
              value="payment"
              className="flex items-center gap-2 py-2.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all font-medium"
            >
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Make Payment</span>
              <span className="sm:hidden">Pay</span>
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex items-center gap-2 py-2.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all font-medium"
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Transactions</span>
              <span className="sm:hidden">History</span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex items-center gap-2 py-2.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all font-medium"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payment" className="mt-0">
            <div className="bg-card rounded-2xl border border-border shadow-card p-6 md:p-8">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-foreground">
                  Send Payment
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter the recipient's JazzCash number and amount. They will
                  receive a MPIN confirmation popup.
                </p>
              </div>
              <PaymentForm />
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <div className="bg-card rounded-2xl border border-border shadow-card p-6 md:p-8">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-foreground">
                  Transaction History
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  All your past payment records with statuses.
                </p>
              </div>
              <TransactionHistory />
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <div className="bg-card rounded-2xl border border-border shadow-card p-6 md:p-8">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-foreground">
                  Merchant Configuration
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure your JazzCash merchant credentials to enable
                  payments.
                </p>
              </div>
              <MerchantSettings />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-4">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
            © {currentYear}. Built with ❤️ using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>

      <Toaster richColors position="top-right" />
    </div>
  );
}
