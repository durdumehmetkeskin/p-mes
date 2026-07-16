import { RadioGroup, RadioGroupItem, Label } from "frontend";

export function WarehouseSelect() {
  return (
    <RadioGroup defaultValue="wh-01" className="p-2">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="wh-01" id="wh-01" />
        <Label htmlFor="wh-01">WH-01 · Main warehouse</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="wh-02" id="wh-02" />
        <Label htmlFor="wh-02">WH-02 · Overflow store</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="wh-03" id="wh-03" />
        <Label htmlFor="wh-03">WH-03 · Cold storage</Label>
      </div>
    </RadioGroup>
  );
}

export function UnitOfMeasure() {
  return (
    <RadioGroup defaultValue="pcs" className="p-2">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="pcs" id="uom-pcs" />
        <Label htmlFor="uom-pcs">Each (PCS)</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="kg" id="uom-kg" />
        <Label htmlFor="uom-kg">Kilogram (KG)</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="m" id="uom-m" />
        <Label htmlFor="uom-m">Meter (M)</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="l" id="uom-l" disabled />
        <Label htmlFor="uom-l">Liter (L)</Label>
      </div>
    </RadioGroup>
  );
}
