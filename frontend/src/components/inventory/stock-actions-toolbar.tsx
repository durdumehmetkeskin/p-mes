import {
  ClipboardCheck,
  PackageMinus,
  PackagePlus,
  Shuffle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GoodsIssueForm } from "@/pages/goods-issue";
import { GoodsReceiptForm } from "@/pages/goods-receipt";
import { GoodsTransferForm } from "@/pages/goods-transfer";
import { StockCountForm } from "@/pages/stock-count";

function ActionDialog({
  label,
  title,
  icon: Icon,
  render,
}: {
  label: string;
  title: string;
  icon: LucideIcon;
  render: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Icon className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {render(() => setOpen(false))}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Contextual stock operations, shown on stock-related list screens. Each opens
 * a modal with its form (not a separate page) so the action lives next to the
 * data it affects.
 */
export function StockActionsToolbar() {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Stock operations"
    >
      <ActionDialog
        label="Receive"
        title="Goods Receipt"
        icon={PackagePlus}
        render={(close) => <GoodsReceiptForm onSuccess={close} />}
      />
      <ActionDialog
        label="Issue"
        title="Goods Issue"
        icon={PackageMinus}
        render={(close) => <GoodsIssueForm onSuccess={close} />}
      />
      <ActionDialog
        label="Transfer"
        title="Goods Transfer"
        icon={Shuffle}
        render={(close) => <GoodsTransferForm onSuccess={close} />}
      />
      <ActionDialog
        label="Count"
        title="Stock Count"
        icon={ClipboardCheck}
        render={(close) => <StockCountForm onSuccess={close} />}
      />
    </div>
  );
}
