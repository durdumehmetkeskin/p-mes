import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
  Button,
  Input,
  Label,
} from "frontend";

export function GoodsReceipt() {
  return (
    <Drawer open>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <DrawerTitle>Post goods receipt</DrawerTitle>
            <DrawerDescription>
              Receive inbound stock against PO-2041.
            </DrawerDescription>
          </DrawerHeader>
          <div className="grid gap-4 px-4">
            <div className="grid gap-1.5">
              <Label htmlFor="dr-mat">Material</Label>
              <Input id="dr-mat" defaultValue="Steel Bracket M-204" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="dr-qty">Quantity (pcs)</Label>
                <Input id="dr-qty" defaultValue="500" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="dr-bin">Bin</Label>
                <Input id="dr-bin" defaultValue="A-01-03" />
              </div>
            </div>
          </div>
          <DrawerFooter>
            <Button>Post receipt</Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
