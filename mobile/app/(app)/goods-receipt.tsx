import { GoodsMoveForm } from "@/components/stock/goods-move-form";

export default function GoodsReceiptScreen() {
  return (
    <GoodsMoveForm
      endpoint="receive"
      title="Goods Receipt"
      submitLabel="Receive"
      notePlaceholder="e.g. PO-1024"
    />
  );
}
