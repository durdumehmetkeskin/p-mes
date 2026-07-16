import { Alert, AlertTitle, AlertDescription } from "frontend";
import { Info, AlertTriangle, CheckCircle2 } from "lucide-react";

export function InfoAlert() {
  return (
    <div className="max-w-md p-2">
      <Alert>
        <Info />
        <AlertTitle>Cycle count scheduled</AlertTitle>
        <AlertDescription>
          A full count of Warehouse A bin locations runs tonight at 22:00. Stock
          moves will be locked during the count window.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export function LowStockWarning() {
  return (
    <div className="max-w-md p-2">
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>Low stock warning</AlertTitle>
        <AlertDescription>
          Reorder point reached for Steel Bracket M-204. On-hand 420 pcs is below
          the reorder point of 500 pcs.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export function GoodsReceiptPosted() {
  return (
    <div className="max-w-md p-2">
      <Alert>
        <CheckCircle2 />
        <AlertTitle>Goods receipt posted</AlertTitle>
        <AlertDescription>
          GR-2026-0481 received 1,000 pcs of Hex Bolt M8 into bin A-12-03.
        </AlertDescription>
      </Alert>
    </div>
  );
}
