import { Authenticated, Refine } from "@refinedev/core";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import routerProvider, {
  CatchAllNavigate,
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import logoUrl from "@/assets/logo.png";
import {
  ArrowRightLeft,
  Boxes,
  Building2,
  Contact as ContactIcon,
  Database,
  Factory,
  FileBarChart,
  FileCog,
  FileText,
  FolderKanban,
  Handshake,
  KanbanSquare,
  Layers,
  LayoutDashboard,
  MapPin,
  Package,
  PackageCheck,
  Ruler,
  ScrollText,
  Tags,
  Settings,
  Shield,
  Users,
  Warehouse as WarehouseIcon,
  Wrench,
} from "lucide-react";
import { BrowserRouter, Outlet, Route, Routes } from "react-router";

import "./App.css";
import { AccessGuard } from "./components/access-guard";
import { ErrorComponent } from "./components/refine-ui/layout/error-component";
import { Layout } from "./components/refine-ui/layout/layout";
import { Toaster } from "./components/refine-ui/notification/toaster";
import { useNotificationProvider } from "./components/refine-ui/notification/use-notification-provider";
import { ThemeProvider } from "./components/refine-ui/theme/theme-provider";
import { Dashboard } from "./pages/dashboard";
import { ForgotPassword } from "./pages/forgotPassword";
import { Login } from "./pages/login";
import { Register } from "./pages/register";
import { ResetPassword } from "./pages/resetPassword";
import { AuditLogsList } from "./pages/audit-logs";
import {
  MaterialsCreate,
  MaterialsEdit,
  MaterialsList,
  MaterialsShow,
} from "./pages/materials";
import {
  MaterialTypesCreate,
  MaterialTypesEdit,
  MaterialTypesList,
} from "./pages/material-types";
import {
  MaterialUnitsCreate,
  MaterialUnitsEdit,
  MaterialUnitsList,
} from "./pages/material-units";
import {
  ProductsCreate,
  ProductsEdit,
  ProductsList,
  ProductsShow,
} from "./pages/products";
import { RolesCreate, RolesEdit, RolesList } from "./pages/roles";
import {
  ToolsCreate,
  ToolsEdit,
  ToolsList,
  ToolsShow,
} from "./pages/tools";
import {
  ZonesCreate,
  ZonesEdit,
  ZonesList,
  ZonesShow,
} from "./pages/zones";
import {
  RacksCreate,
  RacksEdit,
  RacksList,
  RacksShow,
} from "./pages/racks";
import {
  InventoryTransactionsCreate,
  InventoryTransactionsList,
} from "./pages/inventory-transactions";
import { GoodsReceipt } from "./pages/goods-receipt";
import { GoodsIssue } from "./pages/goods-issue";
import { GoodsTransfer } from "./pages/goods-transfer";
import { StockCount } from "./pages/stock-count";
import { LotsCreate, LotsEdit, LotsList, LotsShow } from "./pages/lots";
import {
  WarehousesCreate,
  WarehousesEdit,
  WarehousesList,
  WarehousesShow,
} from "./pages/warehouses";
import {
  UsersCreate,
  UsersEdit,
  UsersList,
  UsersShow,
} from "./pages/users";
import {
  ProjectsCreate,
  ProjectsEdit,
  ProjectsList,
} from "./pages/projects";
import {
  LocationsCreate,
  LocationsEdit,
  LocationsList,
  LocationsShow,
  SectionShow,
} from "./pages/locations";
import {
  ProjectContacts,
  ProjectCustomer,
  ProjectEmployees,
  ProjectOrderDetail,
  ProjectOrders,
  ProjectOverview,
  ProjectFiles,
  ProjectInventory,
  ProjectMaterialDetail,
  ProjectWorkflow,
  ProjectWorkflowTimeline,
  ProjectWorkspace,
  TemplateBuilder,
} from "./pages/projects/workspace";
import {
  CustomersCreate,
  CustomersEdit,
  CustomersList,
  CustomersShow,
} from "./pages/customers";
import {
  ContactsCreate,
  ContactsEdit,
  ContactsList,
  ContactsShow,
} from "./pages/contacts";
import { BoardView } from "./pages/board";
import { MyWarehouse } from "./pages/my-warehouse";
import { ReportCenter } from "./pages/reports";
import {
  ReportDefinitionsCreate,
  ReportDefinitionsEdit,
  ReportDefinitionsList,
} from "./pages/report-definitions";
import { accessControlProvider } from "./providers/access-control";
import { authProvider } from "./providers/auth";
import { dataProvider } from "./providers/data";

function App() {
  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <ThemeProvider>
          <Refine
            dataProvider={dataProvider}
            notificationProvider={useNotificationProvider()}
            routerProvider={routerProvider}
            authProvider={authProvider}
            accessControlProvider={accessControlProvider}
            resources={[
              {
                name: "dashboard",
                list: "/",
                meta: {
                  label: "Dashboard",
                  icon: <LayoutDashboard className="h-4 w-4" />,
                },
              },
              // Personal notifications — surfaced via the header bell, not the
              // sidebar (meta-only so data hooks resolve).
              { name: "notifications", meta: { label: "Notification" } },
              // Order-scoped required-materials list (managed inside the
              // order detail page; meta-only so the data hooks resolve).
              {
                name: "order-material-requirements",
                meta: { label: "Required Material" },
              },

              // Operations (Receive / Issue / Transfer / Count) are NOT in the
              // sidebar — they are contextual actions launched from the Stock
              // on Hand and Materials list screens. Their routes still exist.

              // ---- Inventory (live stock & history) ----
              {
                name: "inventory",
                meta: {
                  label: "Inventory",
                  group: true,
                  icon: <Boxes className="h-4 w-4" />,
                },
              },
              {
                name: "materials",
                list: "/materials",
                create: "/materials/create",
                show: "/materials/:id",
                edit: "/materials/:id/edit",
                meta: {
                  label: "Materials",
                  canDelete: true,
                  parent: "inventory",
                  icon: <Package className="h-4 w-4" />,
                },
              },
              {
                name: "material-types",
                list: "/material-types",
                create: "/material-types/create",
                edit: "/material-types/:id/edit",
                meta: {
                  label: "Material Types",
                  canDelete: true,
                  parent: "inventory",
                  icon: <Tags className="h-4 w-4" />,
                },
              },
              {
                name: "material-units",
                list: "/material-units",
                create: "/material-units/create",
                edit: "/material-units/:id/edit",
                meta: {
                  label: "Material Units",
                  canDelete: true,
                  parent: "inventory",
                  icon: <Ruler className="h-4 w-4" />,
                },
              },
              // Stock on Hand lives inside the Materials screen (a "Stock on
              // Hand" tab with a material filter), not as its own sidebar item.
              // Registered without a list route so data hooks resolve cleanly.
              {
                name: "inventory-balances",
                meta: { label: "Stock on Hand" },
              },
              {
                name: "lots",
                list: "/lots",
                create: "/lots/create",
                show: "/lots/:id",
                edit: "/lots/:id/edit",
                meta: {
                  label: "Lots",
                  canDelete: true,
                  parent: "inventory",
                  icon: <Layers className="h-4 w-4" />,
                },
              },
              // Stock items live under a lot; managed from the lot detail page
              // (meta-only so data hooks resolve).
              { name: "stock-items", meta: { label: "Stock Item" } },
              {
                name: "inventory-transactions",
                list: "/inventory-transactions",
                create: "/inventory-transactions/create",
                meta: {
                  label: "Stock Movements",
                  parent: "inventory",
                  icon: <ArrowRightLeft className="h-4 w-4" />,
                },
              },

              // ---- Storage (warehouses / zones / racks) ----
              {
                name: "master-data",
                meta: {
                  label: "Storage",
                  group: true,
                  icon: <Database className="h-4 w-4" />,
                },
              },
              // Warehouse responsibles' workspace — the accessControlProvider
              // hides this entry for everyone except admins and responsibles.
              {
                name: "my-warehouse",
                list: "/my-warehouse",
                meta: {
                  label: "My Warehouse",
                  parent: "master-data",
                  icon: <WarehouseIcon className="h-4 w-4" />,
                },
              },
              {
                name: "warehouses",
                list: "/warehouses",
                create: "/warehouses/create",
                show: "/warehouses/:id",
                edit: "/warehouses/:id/edit",
                meta: {
                  label: "Warehouses",
                  canDelete: true,
                  parent: "master-data",
                  icon: <WarehouseIcon className="h-4 w-4" />,
                },
              },
              {
                name: "zones",
                list: "/zones",
                create: "/zones/create",
                show: "/zones/:id",
                edit: "/zones/:id/edit",
                meta: {
                  label: "Zones",
                  canDelete: true,
                  parent: "master-data",
                  icon: <MapPin className="h-4 w-4" />,
                },
              },
              {
                name: "racks",
                list: "/racks",
                create: "/racks/create",
                show: "/racks/:id",
                edit: "/racks/:id/edit",
                meta: {
                  label: "Racks",
                  canDelete: true,
                  parent: "master-data",
                  icon: <MapPin className="h-4 w-4" />,
                },
              },

              // ---- Production (locations + tooling) ----
              {
                name: "production",
                meta: {
                  label: "Production",
                  group: true,
                  icon: <Factory className="h-4 w-4" />,
                },
              },
              {
                name: "locations",
                list: "/locations",
                create: "/locations/create",
                show: "/locations/:id",
                edit: "/locations/:id/edit",
                meta: {
                  label: "Locations",
                  canDelete: true,
                  parent: "production",
                  icon: <Factory className="h-4 w-4" />,
                },
              },
              {
                name: "products",
                list: "/products",
                create: "/products/create",
                show: "/products/:id",
                edit: "/products/:id/edit",
                meta: {
                  label: "Products",
                  canDelete: true,
                  parent: "production",
                  icon: <PackageCheck className="h-4 w-4" />,
                },
              },
              // Product types are created inline from the product form (no
              // sidebar item). Registered without routes so data hooks resolve.
              {
                name: "product-types",
                meta: { label: "Product Type" },
              },
              // Managed inside a location's detail page (not in the sidebar).
              { name: "sections", meta: { label: "Section" } },
              {
                name: "section-reservations",
                meta: { label: "Reservation" },
              },
              {
                name: "tools",
                list: "/tools",
                create: "/tools/create",
                show: "/tools/:id",
                edit: "/tools/:id/edit",
                meta: {
                  label: "Tools",
                  canDelete: true,
                  parent: "inventory",
                  icon: <Wrench className="h-4 w-4" />,
                },
              },
              // Tool types are created inline from the tool form (no sidebar
              // item). Registered without a list route so data hooks resolve.
              {
                name: "tool-types",
                meta: { label: "Tool Type" },
              },
              // Tool status history is read from the tool detail screen.
              {
                name: "tool-status-history",
                meta: { label: "Tool Status History" },
              },
              // Tool assignments are managed from the tool detail screen.
              {
                name: "tool-assignments",
                meta: { label: "Tool Assignment" },
              },
              // Tool usage sessions are read from the tool detail screen.
              {
                name: "tool-usages",
                meta: { label: "Tool Usage" },
              },
              // Tool cycle-counter log is read from the tool detail screen.
              {
                name: "tool-cycle-logs",
                meta: { label: "Tool Cycle Log" },
              },

              // ---- Projects (project workflow management) ----
              {
                name: "project-mgmt",
                meta: {
                  label: "Projects",
                  group: true,
                  icon: <FolderKanban className="h-4 w-4" />,
                },
              },
              {
                name: "projects",
                list: "/projects",
                create: "/projects/create",
                show: "/projects/:id",
                edit: "/projects/:id/edit",
                meta: {
                  label: "Projects",
                  canDelete: true,
                  parent: "project-mgmt",
                  icon: <FolderKanban className="h-4 w-4" />,
                },
              },
              {
                name: "stage-board",
                list: "/board",
                meta: {
                  label: "Board",
                  parent: "project-mgmt",
                  icon: <KanbanSquare className="h-4 w-4" />,
                },
              },
              // The following resources are NOT in the sidebar — they are
              // managed only inside a project's workspace (/projects/:id). They
              // stay registered (no list route) so data hooks resolve.
              { name: "orders", meta: { label: "Order" } },
              { name: "order-items", meta: { label: "Item" } },
              { name: "workflow-templates", meta: { label: "Workflow Template" } },
              { name: "processes", meta: { label: "Process" } },

              // ---- Partners (customers & contacts) ----
              {
                name: "partners",
                meta: {
                  label: "Partners",
                  group: true,
                  icon: <Handshake className="h-4 w-4" />,
                },
              },
              {
                name: "customers",
                list: "/customers",
                create: "/customers/create",
                show: "/customers/:id",
                edit: "/customers/:id/edit",
                meta: {
                  label: "Customers",
                  canDelete: true,
                  parent: "partners",
                  icon: <Building2 className="h-4 w-4" />,
                },
              },
              {
                name: "contacts",
                list: "/contacts",
                create: "/contacts/create",
                show: "/contacts/:id",
                edit: "/contacts/:id/edit",
                meta: {
                  label: "Contacts",
                  canDelete: true,
                  parent: "partners",
                  icon: <ContactIcon className="h-4 w-4" />,
                },
              },

              // ---- Reporting ----
              {
                name: "reporting",
                meta: {
                  label: "Reporting",
                  group: true,
                  icon: <FileBarChart className="h-4 w-4" />,
                },
              },
              {
                name: "reports",
                list: "/reports",
                meta: {
                  label: "Report Center",
                  parent: "reporting",
                  icon: <FileText className="h-4 w-4" />,
                },
              },
              {
                name: "report-definitions",
                list: "/reports/templates",
                create: "/reports/templates/create",
                edit: "/reports/templates/:id/edit",
                meta: {
                  label: "Report Templates",
                  canDelete: true,
                  parent: "reporting",
                  icon: <FileCog className="h-4 w-4" />,
                },
              },

              // ---- Administration ----
              {
                name: "administration",
                meta: {
                  label: "Administration",
                  group: true,
                  icon: <Settings className="h-4 w-4" />,
                },
              },
              {
                name: "users",
                list: "/users",
                create: "/users/create",
                show: "/users/:id",
                edit: "/users/:id/edit",
                meta: {
                  label: "Users",
                  canDelete: true,
                  parent: "administration",
                  icon: <Users className="h-4 w-4" />,
                },
              },
              {
                name: "roles",
                list: "/roles",
                create: "/roles/create",
                edit: "/roles/:id/edit",
                meta: {
                  label: "Roles",
                  canDelete: true,
                  parent: "administration",
                  icon: <Shield className="h-4 w-4" />,
                },
              },
              {
                name: "audit-logs",
                list: "/audit-logs",
                meta: {
                  label: "Audit Logs",
                  parent: "administration",
                  icon: <ScrollText className="h-4 w-4" />,
                },
              },
            ]}
            options={{
              syncWithLocation: true,
              warnWhenUnsavedChanges: true,
              projectId: "EOtJo9-QAcInk-iJSS6N",
              title: {
                text: "QUA-MES",
                icon: (
                  <img
                    src={logoUrl}
                    alt="Quanta Kompozit"
                    className="h-9 w-9 object-contain"
                  />
                ),
              },
            }}
          >
            <Routes>
              {/* Authenticated area wrapped by the sidebar/header layout. */}
              <Route
                element={
                  <Authenticated
                    key="authenticated-routes"
                    fallback={<CatchAllNavigate to="/login" />}
                  >
                    <Layout>
                      <AccessGuard>
                        <Outlet />
                      </AccessGuard>
                    </Layout>
                  </Authenticated>
                }
              >
                <Route index element={<Dashboard />} />

                {/* create/edit render as a modal over the (still-mounted) list
                    via the list's <Outlet/>. show stays a full page. */}
                {/* show renders as a side Sheet over the still-mounted list,
                    alongside the create/edit modal — both via the list's
                    <Outlet/>. */}
                <Route path="/users" element={<UsersList />}>
                  <Route path="create" element={<UsersCreate />} />
                  <Route path=":id" element={<UsersShow />} />
                  <Route path=":id/edit" element={<UsersEdit />} />
                </Route>

                <Route path="/materials" element={<MaterialsList />}>
                  <Route path="create" element={<MaterialsCreate />} />
                  <Route path=":id" element={<MaterialsShow />} />
                  <Route path=":id/edit" element={<MaterialsEdit />} />
                </Route>

                <Route path="/products" element={<ProductsList />}>
                  <Route path="create" element={<ProductsCreate />} />
                  <Route path=":id" element={<ProductsShow />} />
                  <Route path=":id/edit" element={<ProductsEdit />} />
                </Route>

                <Route path="/material-types" element={<MaterialTypesList />}>
                  <Route path="create" element={<MaterialTypesCreate />} />
                  <Route path=":id/edit" element={<MaterialTypesEdit />} />
                </Route>

                <Route path="/material-units" element={<MaterialUnitsList />}>
                  <Route path="create" element={<MaterialUnitsCreate />} />
                  <Route path=":id/edit" element={<MaterialUnitsEdit />} />
                </Route>

                <Route path="/warehouses" element={<WarehousesList />}>
                  <Route path="create" element={<WarehousesCreate />} />
                  <Route path=":id" element={<WarehousesShow />} />
                  <Route path=":id/edit" element={<WarehousesEdit />} />
                </Route>

                <Route path="/zones" element={<ZonesList />}>
                  <Route path="create" element={<ZonesCreate />} />
                  <Route path=":id" element={<ZonesShow />} />
                  <Route path=":id/edit" element={<ZonesEdit />} />
                </Route>

                <Route path="/racks" element={<RacksList />}>
                  <Route path="create" element={<RacksCreate />} />
                  <Route path=":id" element={<RacksShow />} />
                  <Route path=":id/edit" element={<RacksEdit />} />
                </Route>

                <Route path="/lots" element={<LotsList />}>
                  <Route path="create" element={<LotsCreate />} />
                  <Route path=":id" element={<LotsShow />} />
                  <Route path=":id/edit" element={<LotsEdit />} />
                </Route>

                <Route path="/tools" element={<ToolsList />}>
                  <Route path="create" element={<ToolsCreate />} />
                  <Route path=":id" element={<ToolsShow />} />
                  <Route path=":id/edit" element={<ToolsEdit />} />
                </Route>

                <Route path="/roles" element={<RolesList />}>
                  <Route path="create" element={<RolesCreate />} />
                  <Route path=":id/edit" element={<RolesEdit />} />
                </Route>

                <Route
                  path="/inventory-transactions"
                  element={<InventoryTransactionsList />}
                >
                  <Route
                    path="create"
                    element={<InventoryTransactionsCreate />}
                  />
                </Route>

                {/* Operation screens (full page forms). */}
                <Route path="/goods-receipt" element={<GoodsReceipt />} />
                <Route path="/goods-issue" element={<GoodsIssue />} />
                <Route path="/goods-transfer" element={<GoodsTransfer />} />
                <Route path="/stock-count" element={<StockCount />} />

                {/* ---- Project module ----
                    Main sidebar shows only Projects. Everything else lives in
                    the per-project workspace at /projects/:id. */}
                <Route path="/projects" element={<ProjectsList />}>
                  <Route path="create" element={<ProjectsCreate />} />
                  <Route path=":id/edit" element={<ProjectsEdit />} />
                </Route>

                <Route path="/customers" element={<CustomersList />}>
                  <Route path="create" element={<CustomersCreate />} />
                  <Route path=":id" element={<CustomersShow />} />
                  <Route path=":id/edit" element={<CustomersEdit />} />
                </Route>

                <Route path="/contacts" element={<ContactsList />}>
                  <Route path="create" element={<ContactsCreate />} />
                  <Route path=":id" element={<ContactsShow />} />
                  <Route path=":id/edit" element={<ContactsEdit />} />
                </Route>

                <Route path="/projects/:id" element={<ProjectWorkspace />}>
                  <Route index element={<ProjectOverview />} />
                  <Route path="orders" element={<ProjectOrders />} />
                  <Route
                    path="orders/:orderId"
                    element={<ProjectOrderDetail />}
                  />
                  <Route path="inventory" element={<ProjectInventory />} />
                  <Route
                    path="materials/:materialId"
                    element={<ProjectMaterialDetail />}
                  />
                  <Route path="customer" element={<ProjectCustomer />} />
                  <Route path="contacts" element={<ProjectContacts />} />
                  <Route path="employees" element={<ProjectEmployees />} />
                  <Route path="files" element={<ProjectFiles />} />
                  <Route path="timeline" element={<ProjectWorkflowTimeline />} />
                  <Route path="workflow" element={<ProjectWorkflow />} />
                  <Route path="workflow/new" element={<TemplateBuilder />} />
                  <Route path="workflow/:tplId" element={<TemplateBuilder />} />
                </Route>

                {/* ---- Production locations ---- */}
                <Route path="/locations" element={<LocationsList />}>
                  <Route path="create" element={<LocationsCreate />} />
                  <Route path=":id/edit" element={<LocationsEdit />} />
                </Route>
                <Route path="/locations/:id" element={<LocationsShow />} />
                <Route
                  path="/locations/:id/sections/:sectionId"
                  element={<SectionShow />}
                />

                {/* ---- Reporting ----
                    Report Center (generate/preview) + editable templates. */}
                <Route path="/reports" element={<ReportCenter />} />
                <Route
                  path="/reports/templates"
                  element={<ReportDefinitionsList />}
                />
                <Route
                  path="/reports/templates/create"
                  element={<ReportDefinitionsCreate />}
                />
                <Route
                  path="/reports/templates/:id/edit"
                  element={<ReportDefinitionsEdit />}
                />

                <Route path="/board" element={<BoardView />} />

                <Route path="/my-warehouse" element={<MyWarehouse />} />

                <Route path="/audit-logs" element={<AuditLogsList />} />
                <Route path="*" element={<ErrorComponent />} />
              </Route>

              {/* Password reset is reachable even when a (stale) token is
                  present — a logged-in user following an emailed reset link must
                  see the form, not be bounced to the dashboard. */}
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Public auth pages; redirect to the dashboard if already in. */}
              <Route
                element={
                  <Authenticated key="auth-pages" fallback={<Outlet />}>
                    <NavigateToResource resource="dashboard" />
                  </Authenticated>
                }
              >
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
              </Route>
            </Routes>

            <Toaster />
            <RefineKbar />
            <UnsavedChangesNotifier />
            <DocumentTitleHandler />
          </Refine>
        </ThemeProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
