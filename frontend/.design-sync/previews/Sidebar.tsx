import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarFooter,
} from "frontend";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ClipboardList,
  FileBarChart,
  Boxes,
} from "lucide-react";

export function WarehouseNav() {
  return (
    <SidebarProvider className="min-h-0 h-[460px]">
      <Sidebar collapsible="none" className="border-r">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 items-center justify-center rounded-md">
              <Boxes className="size-4" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">p-MES</span>
              <span className="text-muted-foreground text-xs">Warehouse</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Warehouse</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive>
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <Package />
                    <span>Materials</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>128</SidebarMenuBadge>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <Warehouse />
                    <span>Warehouses</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <ClipboardList />
                    <span>Work orders</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>28</SidebarMenuBadge>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <FileBarChart />
                    <span>Reports</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="text-muted-foreground px-2 py-1 text-xs">
            Signed in as N. Keskin
          </div>
        </SidebarFooter>
      </Sidebar>
    </SidebarProvider>
  );
}
