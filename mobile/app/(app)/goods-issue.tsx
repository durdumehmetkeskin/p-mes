import { GoodsMoveForm } from "@/components/stock/goods-move-form";

export default function GoodsIssueScreen() {
  return (
    <GoodsMoveForm
      endpoint="issue"
      title="Goods Issue"
      submitLabel="Issue"
      notePlaceholder="e.g. WO-500 production"
    />
  );
}
