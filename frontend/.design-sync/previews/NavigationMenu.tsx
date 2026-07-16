import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from "frontend";
import { Boxes, Warehouse, ClipboardList, BarChart3 } from "lucide-react";

export function InventoryMenu() {
  return (
    <div className="flex min-h-[300px] w-[560px] justify-center p-2">
      <NavigationMenu defaultValue="inventory">
        <NavigationMenuList>
          <NavigationMenuItem value="inventory">
            <NavigationMenuTrigger>Inventory</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[440px] grid-cols-2 gap-2 p-2">
                <li>
                  <NavigationMenuLink asChild>
                    <a href="#">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Boxes className="size-4" /> Materials
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Master data, units and reorder points
                      </p>
                    </a>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <a href="#">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Warehouse className="size-4" /> Warehouses
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Bins, locations and stock on-hand
                      </p>
                    </a>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <a href="#">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <ClipboardList className="size-4" /> Stock movements
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Receipts, issues and transfers
                      </p>
                    </a>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <a href="#">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <BarChart3 className="size-4" /> Balances
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Inventory valuation report
                      </p>
                    </a>
                  </NavigationMenuLink>
                </li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
              <a href="#">Work orders</a>
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
              <a href="#">Reports</a>
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}

export function TopBar() {
  return (
    <div className="w-[640px] p-2">
      <NavigationMenu viewport={false} className="w-full max-w-none justify-start">
        <NavigationMenuList className="justify-start">
          <NavigationMenuItem>
            <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
              <a href="#">Dashboard</a>
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
              <a href="#">Materials</a>
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
              <a href="#">Warehouses</a>
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
              <a href="#">Work orders</a>
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
              <a href="#">Reports</a>
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}
