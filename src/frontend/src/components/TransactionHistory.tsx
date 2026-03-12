import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTransactions } from "@/hooks/useQueries";
import { Receipt } from "lucide-react";
import { motion } from "motion/react";

function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  if (s === "SUCCESS" || s === "PAID") {
    return (
      <Badge className="bg-success/15 text-success hover:bg-success/20 border-0 font-semibold">
        SUCCESS
      </Badge>
    );
  }
  if (s === "FAILED" || s === "FAIL") {
    return (
      <Badge variant="destructive" className="font-semibold">
        FAILED
      </Badge>
    );
  }
  return (
    <Badge className="bg-warning/15 text-warning hover:bg-warning/20 border-0 font-semibold">
      PENDING
    </Badge>
  );
}

function formatDate(timestamp: bigint): string {
  const ms = Number(timestamp);
  if (ms === 0) return "—";
  const d = new Date(ms);
  return d.toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(amount: bigint): string {
  const pkr = Number(amount) / 100;
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(pkr);
}

export function TransactionHistory() {
  const { data: transactions, isLoading } = useTransactions();

  if (isLoading) {
    return (
      <div data-ocid="transactions.loading_state" className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <motion.div
        data-ocid="transactions.empty_state"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 gap-4"
      >
        <div className="h-20 w-20 rounded-2xl bg-accent flex items-center justify-center">
          <Receipt className="h-10 w-10 text-primary/60" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">No transactions yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your payment history will appear here.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-xs">
      <Table data-ocid="transactions.table">
        <TableHeader>
          <TableRow className="bg-secondary/50">
            <TableHead className="font-semibold text-foreground">
              Date
            </TableHead>
            <TableHead className="font-semibold text-foreground">
              Mobile
            </TableHead>
            <TableHead className="font-semibold text-foreground">
              Amount
            </TableHead>
            <TableHead className="font-semibold text-foreground hidden md:table-cell">
              Description
            </TableHead>
            <TableHead className="font-semibold text-foreground">
              Status
            </TableHead>
            <TableHead className="font-semibold text-foreground hidden lg:table-cell">
              Message
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((txn, idx) => (
            <motion.tr
              key={txn.txnRef}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              data-ocid={`transactions.row.${idx + 1}`}
              className="hover:bg-secondary/30 transition-colors"
            >
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(txn.timestamp)}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {txn.mobileNumber}
              </TableCell>
              <TableCell className="font-semibold text-foreground">
                {formatAmount(txn.amount)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                {txn.description || "—"}
              </TableCell>
              <TableCell>
                <StatusBadge status={txn.status} />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground hidden lg:table-cell max-w-[200px] truncate">
                {txn.responseMessage || "—"}
              </TableCell>
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
