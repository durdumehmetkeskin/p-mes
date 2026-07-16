import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  Badge,
} from "frontend";

export function MaterialsTable() {
  const rows = [
    { code: "M-204", name: "Steel Bracket", qty: "1,240 pcs", status: "In stock", variant: "secondary" as const },
    { code: "M-311", name: "Hex Bolt M8 x 40", qty: "420 pcs", status: "Low", variant: "destructive" as const },
    { code: "M-118", name: "Aluminium Sheet 2mm", qty: "0 pcs", status: "Out of stock", variant: "outline" as const },
    { code: "M-505", name: "Copper Wire 1.5mm", qty: "3,600 m", status: "In stock", variant: "secondary" as const },
    { code: "M-742", name: "Ball Bearing 6204", qty: "860 pcs", status: "In stock", variant: "secondary" as const },
  ];
  return (
    <Table>
      <TableCaption>Materials — Warehouse A</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Material</TableHead>
          <TableHead className="text-right">On-hand</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.code}>
            <TableCell className="font-mono">{r.code}</TableCell>
            <TableCell className="font-medium">{r.name}</TableCell>
            <TableCell className="text-right">{r.qty}</TableCell>
            <TableCell>
              <Badge variant={r.variant}>{r.status}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function WorkOrdersTable() {
  const rows = [
    { code: "WO-2026-0142", item: "Gearbox Assembly", due: "Jul 03", status: "Released", variant: "default" as const },
    { code: "WO-2026-0143", item: "Frame Weldment", due: "Jul 04", status: "In progress", variant: "secondary" as const },
    { code: "WO-2026-0144", item: "Motor Mount", due: "Jul 05", status: "Draft", variant: "outline" as const },
    { code: "WO-2026-0145", item: "Hydraulic Line", due: "Jul 06", status: "On hold", variant: "destructive" as const },
    { code: "WO-2026-0146", item: "Control Panel", due: "Jul 08", status: "Released", variant: "default" as const },
  ];
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Work order</TableHead>
          <TableHead>Item</TableHead>
          <TableHead>Due</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.code}>
            <TableCell className="font-mono">{r.code}</TableCell>
            <TableCell className="font-medium">{r.item}</TableCell>
            <TableCell className="text-muted-foreground">{r.due}</TableCell>
            <TableCell>
              <Badge variant={r.variant}>{r.status}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
