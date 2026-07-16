import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
  Button,
  Input,
  Label,
} from "frontend";

export function EditMaterial() {
  return (
    <Sheet open>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Edit material</SheetTitle>
          <SheetDescription>
            Update master data for Steel Bracket M-204.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 px-4">
          <div className="grid gap-1.5">
            <Label htmlFor="sh-code">Code</Label>
            <Input id="sh-code" defaultValue="M-204" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sh-name">Name</Label>
            <Input id="sh-name" defaultValue="Steel Bracket" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sh-rop">Reorder point (pcs)</Label>
            <Input id="sh-rop" defaultValue="500" />
          </div>
        </div>
        <SheetFooter>
          <Button>Save changes</Button>
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function FilterPanel() {
  return (
    <Sheet open>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Filter inventory</SheetTitle>
          <SheetDescription>Narrow the material list.</SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 px-4">
          <div className="grid gap-1.5">
            <Label htmlFor="fl-wh">Warehouse</Label>
            <Input id="fl-wh" defaultValue="Warehouse A" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="fl-cat">Category</Label>
            <Input id="fl-cat" placeholder="Raw material" />
          </div>
        </div>
        <SheetFooter>
          <Button>Apply filters</Button>
          <Button variant="ghost">Reset</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
