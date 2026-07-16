import {
  ArrowRightLeft,
  Bell,
  Building2,
  Contact,
  Factory,
  FileCog,
  FileText,
  FolderKanban,
  KanbanSquare,
  Layers,
  LayoutDashboard,
  type LucideIcon,
  MapPin,
  Package,
  Rows3,
  ScanLine,
  ScrollText,
  Settings,
  Shield,
  Users,
  Warehouse,
  Wrench,
} from "lucide-react-native";

export interface NavItem {
  label: string;
  /** Concrete route path (expo-router). */
  route: string;
  /** Refine resource name, for permission gating via useCan (undefined = always shown). */
  resource?: string;
  icon: LucideIcon;
}

export interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

/** Top-of-drawer items with no group heading. */
export const NAV_TOP: NavItem[] = [
  { label: "Dashboard", route: "/", icon: LayoutDashboard },
  { label: "Notifications", route: "/notifications", icon: Bell },
  { label: "Scan QR", route: "/scan", icon: ScanLine },
  { label: "Settings", route: "/settings", icon: Settings },
];

/** Grouped navigation mirroring the web sidebar's groups. */
export const NAV_GROUPS: NavGroup[] = [
  {
    key: "inventory",
    label: "Inventory",
    items: [
      { label: "Materials", route: "/materials", resource: "materials", icon: Package },
      { label: "Lots", route: "/lots", resource: "lots", icon: Layers },
      {
        label: "Stock Movements",
        route: "/inventory-transactions",
        resource: "inventory-transactions",
        icon: ArrowRightLeft,
      },
    ],
  },
  {
    key: "storage",
    label: "Storage",
    items: [
      {
        label: "My Warehouse",
        route: "/my-warehouse",
        resource: "my-warehouse",
        icon: Warehouse,
      },
      { label: "Warehouses", route: "/warehouses", resource: "warehouses", icon: Warehouse },
      { label: "Zones", route: "/zones", resource: "zones", icon: MapPin },
      { label: "Racks", route: "/racks", resource: "racks", icon: Rows3 },
    ],
  },
  {
    key: "production",
    label: "Production",
    items: [
      { label: "Locations", route: "/locations", resource: "locations", icon: Factory },
      { label: "Tools", route: "/tools", resource: "tools", icon: Wrench },
    ],
  },
  {
    key: "project-mgmt",
    label: "Projects",
    items: [
      { label: "Projects", route: "/projects", resource: "projects", icon: FolderKanban },
      { label: "Board", route: "/board", resource: "stage-board", icon: KanbanSquare },
    ],
  },
  {
    key: "partners",
    label: "Partners",
    items: [
      { label: "Customers", route: "/customers", resource: "customers", icon: Building2 },
      { label: "Contacts", route: "/contacts", resource: "contacts", icon: Contact },
    ],
  },
  {
    key: "reporting",
    label: "Reporting",
    items: [
      { label: "Report Center", route: "/reports", resource: "reports", icon: FileText },
      {
        label: "Report Templates",
        route: "/reports/templates",
        resource: "report-definitions",
        icon: FileCog,
      },
    ],
  },
  {
    key: "administration",
    label: "Administration",
    items: [
      { label: "Users", route: "/users", resource: "users", icon: Users },
      { label: "Roles", route: "/roles", resource: "roles", icon: Shield },
      { label: "Audit Logs", route: "/audit-logs", resource: "audit-logs", icon: ScrollText },
    ],
  },
];

/** Bottom quick-tab items (the "additive bottom-tab bar" requested for v1). */
export const QUICK_TABS: NavItem[] = [
  { label: "Home", route: "/", icon: LayoutDashboard },
  { label: "Materials", route: "/materials", resource: "materials", icon: Package },
  { label: "Tools", route: "/tools", resource: "tools", icon: Wrench },
  { label: "Scan", route: "/scan", icon: ScanLine },
];
