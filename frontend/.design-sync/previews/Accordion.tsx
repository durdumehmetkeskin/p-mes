import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "frontend";

export function MaterialSpec() {
  return (
    <div className="w-96 rounded-md border px-4">
      <Accordion type="single" collapsible defaultValue="general">
        <AccordionItem value="general">
          <AccordionTrigger>General</AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Steel Bracket M-204 · Raw material · Unit: pcs. Lot tracking enabled,
            managed in Warehouse A.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="stock">
          <AccordionTrigger>Stock levels</AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            On-hand 1,240 pcs across 3 bin locations. Reorder point 500 pcs,
            safety stock 200 pcs.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="suppliers">
          <AccordionTrigger>Suppliers</AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Primary: Nord Metal GmbH — lead time 14 days. Secondary: Baltic
            Forge Ltd.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export function ProcessNotes() {
  return (
    <div className="w-96 rounded-md border px-4">
      <Accordion type="multiple" defaultValue={["receipt", "issue"]}>
        <AccordionItem value="receipt">
          <AccordionTrigger>Goods receipt</AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Scan the inbound pallet, confirm quantity against the purchase order,
            then post to the receiving bin.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="issue">
          <AccordionTrigger>Goods issue</AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Pick against the work order, verify the lot, and post the issue to
            reduce on-hand stock.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="transfer">
          <AccordionTrigger>Stock transfer</AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Move stock between bins or warehouses; both source and destination
            balances update on post.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
