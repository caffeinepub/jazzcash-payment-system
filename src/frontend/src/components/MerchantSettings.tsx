import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMerchantConfig, useUpdateMerchantConfig } from "@/hooks/useQueries";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Copy,
  ExternalLink,
  Key,
  Link,
  Lock,
  Shield,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function MerchantSettings() {
  const { data: config, isLoading } = useMerchantConfig();
  const updateConfig = useUpdateMerchantConfig();

  const [merchantId, setMerchantId] = useState("MC656746");
  const [password, setPassword] = useState("t42522c45t");
  const [salt, setSalt] = useState("x51w84cg85");
  const [isSandbox, setIsSandbox] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (config?.isConfigured) {
      setMerchantId(config.merchantId || "MC656746");
      setIsSandbox(config.isSandbox);
    }
  }, [config]);

  const returnUrl = typeof window !== "undefined" ? window.location.origin : "";

  async function handleCopyReturnUrl() {
    try {
      await navigator.clipboard.writeText(returnUrl);
      toast.success("Return URL copied!");
    } catch {
      toast.error("Failed to copy URL");
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateConfig.mutateAsync({ merchantId, password, salt, isSandbox });
      toast.success("Credentials saved!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save credentials.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Return URL Box */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 p-4 rounded-lg bg-secondary border border-border"
      >
        <div className="flex items-center gap-2 mb-2">
          <Link className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Your Return URL</p>
          <Badge className="ml-auto text-xs">
            Required for JazzCash Portal
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Copy this URL and paste it in your JazzCash merchant portal as the
          Return URL.
        </p>
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={returnUrl}
            className="h-9 font-mono text-xs bg-background"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-ocid="settings.copy_url.button"
            onClick={handleCopyReturnUrl}
            className="shrink-0 h-9 gap-1.5"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy
          </Button>
        </div>
      </motion.div>

      {/* Status Banner */}
      {!config?.isConfigured ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Alert className="border-primary/30 bg-accent">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm text-primary font-medium">
              Sandbox credentials are pre-filled. Click Save Credentials to
              activate.
            </AlertDescription>
          </Alert>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20"
        >
          <CheckCircle2 className="h-4 w-4 text-success" />
          <span className="text-sm font-medium text-success">
            Merchant credentials configured
          </span>
          <Badge className="ml-auto text-xs bg-success/15 text-success border-0">
            {config.isSandbox ? "SANDBOX" : "PRODUCTION"}
          </Badge>
        </motion.div>
      )}

      <motion.form
        onSubmit={handleSave}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-5"
      >
        <div className="space-y-2">
          <Label htmlFor="merchantId" className="text-sm font-semibold">
            <Building2 className="inline h-4 w-4 mr-1.5 text-primary" />
            Merchant ID
          </Label>
          <Input
            id="merchantId"
            data-ocid="settings.merchantid.input"
            placeholder="MC12345"
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
            required
            className="h-12 font-mono"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-semibold">
            <Lock className="inline h-4 w-4 mr-1.5 text-primary" />
            Password
          </Label>
          <Input
            id="password"
            data-ocid="settings.password.input"
            type="text"
            placeholder="Your JazzCash merchant password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-12 font-mono"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="salt" className="text-sm font-semibold">
            <Key className="inline h-4 w-4 mr-1.5 text-primary" />
            Integrity Salt
          </Label>
          <Input
            id="salt"
            data-ocid="settings.salt.input"
            type="text"
            placeholder="Your JazzCash integrity salt"
            value={salt}
            onChange={(e) => setSalt(e.target.value)}
            required
            className="h-12 font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Used for HMAC-SHA256 secure hash computation.
          </p>
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary border border-border">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold">Sandbox Mode</p>
              <p className="text-xs text-muted-foreground">
                {isSandbox
                  ? "Testing environment"
                  : "Live production environment"}
              </p>
            </div>
          </div>
          <Switch
            data-ocid="settings.sandbox.switch"
            checked={isSandbox}
            onCheckedChange={setIsSandbox}
          />
        </div>

        <Button
          type="submit"
          data-ocid="settings.save_button"
          className="w-full h-12 font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save Credentials"}
        </Button>
      </motion.form>

      {/* How to go live */}
      <div className="mt-6 p-4 rounded-lg bg-secondary border border-border space-y-2">
        <p className="text-sm font-semibold">Going Live (Production)</p>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          <li>
            Get your production credentials from the JazzCash merchant portal
          </li>
          <li>Replace the Merchant ID, Password, and Integrity Salt above</li>
          <li>
            Turn <strong>OFF</strong> Sandbox Mode
          </li>
          <li>
            Click <strong>Save Credentials</strong>
          </li>
        </ol>
        <a
          href="https://jazzcash.com.pk"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary font-medium hover:underline inline-flex items-center gap-1 text-sm pt-1"
        >
          JazzCash Merchant Portal
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
