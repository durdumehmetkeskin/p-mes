import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "frontend";

export function UnitOfMeasure() {
  return (
    <div className="p-6">
      <Select open>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Select unit of measure" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pcs">Pieces (pcs)</SelectItem>
          <SelectItem value="kg">Kilogram (kg)</SelectItem>
          <SelectItem value="box">Box</SelectItem>
          <SelectItem value="pallet">Pallet</SelectItem>
          <SelectItem value="m">Meter (m)</SelectItem>
          <SelectItem value="l">Liter (L)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function WarehouseSelect() {
  return (
    <div className="p-6">
      <Select open defaultValue="wh-main">
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Select warehouse" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Warehouses</SelectLabel>
            <SelectItem value="wh-main">Main Distribution Center</SelectItem>
            <SelectItem value="wh-raw">Raw Materials Store</SelectItem>
            <SelectItem value="wh-fg">Finished Goods</SelectItem>
            <SelectItem value="wh-cold">Cold Storage</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Restricted</SelectLabel>
            <SelectItem value="wh-quar">Quarantine</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

export function TriggerSizes() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Select defaultValue="kg">
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Unit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="kg">Kilogram (kg)</SelectItem>
          <SelectItem value="pcs">Pieces (pcs)</SelectItem>
        </SelectContent>
      </Select>
      <Select defaultValue="wh-main">
        <SelectTrigger size="sm" className="w-56">
          <SelectValue placeholder="Warehouse" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="wh-main">Main Distribution Center</SelectItem>
          <SelectItem value="wh-fg">Finished Goods</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
