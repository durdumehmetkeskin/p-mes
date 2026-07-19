import type { ResourceProps } from "@refinedev/core";

/**
 * Refine resource registry (ported from the web App.tsx). Icons are NOT here —
 * navigation icons live in the drawer config (components/navigation). Route
 * templates use `:id` (Refine substitutes the concrete id); the custom
 * routerProvider + the expo-router file tree provide matching paths. Meta-only
 * resources carry no list route so data hooks (useOne/useList) still resolve.
 */
export const resources: ResourceProps[] = [
  { name: "dashboard", list: "/", meta: { label: "Dashboard" } },
  {
    name: "notifications",
    list: "/notifications",
    meta: { label: "Notifications" },
  },

  // ---- Inventory ----
  { name: "inventory", meta: { label: "Inventory" } },
  {
    name: "materials",
    list: "/materials",
    create: "/materials/create",
    show: "/materials/:id",
    edit: "/materials/:id/edit",
    meta: { label: "Materials", canDelete: true, parent: "inventory" },
  },
  { name: "inventory-balances", meta: { label: "Stock on Hand" } },
  {
    name: "inventory-transactions",
    list: "/inventory-transactions",
    create: "/inventory-transactions/create",
    meta: { label: "Stock Movements", parent: "inventory" },
  },
  { name: "reservations", meta: { label: "Reservation" } },
  {
    name: "lots",
    list: "/lots",
    create: "/lots/create",
    show: "/lots/:id",
    edit: "/lots/:id/edit",
    meta: { label: "Lots", canDelete: true, parent: "inventory" },
  },
  { name: "stock-items", meta: { label: "Stock Item" } },

  // ---- Master Data ----
  { name: "master-data", meta: { label: "Master Data" } },
  {
    name: "my-warehouse",
    list: "/my-warehouse",
    meta: { label: "My Warehouse", parent: "master-data" },
  },
  {
    name: "warehouses",
    list: "/warehouses",
    create: "/warehouses/create",
    show: "/warehouses/:id",
    edit: "/warehouses/:id/edit",
    meta: { label: "Warehouses", canDelete: true, parent: "master-data" },
  },
  {
    name: "zones",
    list: "/zones",
    create: "/zones/create",
    show: "/zones/:id",
    edit: "/zones/:id/edit",
    meta: { label: "Zones", canDelete: true, parent: "master-data" },
  },
  {
    name: "racks",
    list: "/racks",
    create: "/racks/create",
    show: "/racks/:id",
    edit: "/racks/:id/edit",
    meta: { label: "Racks", canDelete: true, parent: "master-data" },
  },
  { name: "material-types", meta: { label: "Material Type" } },
  { name: "material-units", meta: { label: "Material Unit" } },

  // ---- Tools (under Inventory) ----
  {
    name: "tools",
    list: "/tools",
    create: "/tools/create",
    show: "/tools/:id",
    edit: "/tools/:id/edit",
    meta: { label: "Tools", canDelete: true, parent: "inventory" },
  },
  { name: "tool-types", meta: { label: "Tool Type" } },
  { name: "tool-status-history", meta: { label: "Tool Status History" } },
  { name: "tool-assignments", meta: { label: "Tool Assignment" } },
  { name: "tool-usages", meta: { label: "Tool Usage" } },
  { name: "tool-cycle-logs", meta: { label: "Tool Cycle Log" } },

  // ---- Projects ----
  { name: "project-mgmt", meta: { label: "Projects" } },
  {
    name: "projects",
    list: "/projects",
    create: "/projects/create",
    show: "/projects/:id",
    edit: "/projects/:id/edit",
    meta: { label: "Projects", canDelete: true, parent: "project-mgmt" },
  },
  { name: "stage-board", list: "/board", meta: { label: "Board", parent: "project-mgmt" } },
  { name: "orders", meta: { label: "Order" } },
  { name: "order-items", meta: { label: "Order Item" } },
  {
    name: "customers",
    list: "/customers",
    create: "/customers/create",
    show: "/customers/:id",
    edit: "/customers/:id/edit",
    meta: { label: "Customers", canDelete: true, parent: "project-mgmt" },
  },
  {
    name: "contacts",
    list: "/contacts",
    create: "/contacts/create",
    show: "/contacts/:id",
    edit: "/contacts/:id/edit",
    meta: { label: "Contacts", canDelete: true, parent: "project-mgmt" },
  },
  { name: "workflow-templates", meta: { label: "Workflow Template" } },
  { name: "processes", meta: { label: "Process" } },
  { name: "process-stages", meta: { label: "Process Stage" } },

  // ---- Production ----
  { name: "production", meta: { label: "Production" } },
  {
    name: "locations",
    list: "/locations",
    create: "/locations/create",
    show: "/locations/:id",
    edit: "/locations/:id/edit",
    meta: { label: "Locations", canDelete: true, parent: "production" },
  },
  { name: "sections", meta: { label: "Section" } },
  { name: "section-reservations", meta: { label: "Reservation" } },

  // ---- Reporting ----
  { name: "reporting", meta: { label: "Reporting" } },
  {
    name: "reports",
    list: "/reports",
    meta: { label: "Report Center", parent: "reporting" },
  },
  {
    name: "report-definitions",
    list: "/reports/templates",
    create: "/reports/templates/create",
    edit: "/reports/templates/:id/edit",
    meta: { label: "Report Templates", canDelete: true, parent: "reporting" },
  },

  // ---- Administration ----
  { name: "administration", meta: { label: "Administration" } },
  {
    name: "users",
    list: "/users",
    create: "/users/create",
    show: "/users/:id",
    edit: "/users/:id/edit",
    meta: { label: "Users", canDelete: true, parent: "administration" },
  },
  {
    name: "roles",
    list: "/roles",
    create: "/roles/create",
    edit: "/roles/:id/edit",
    meta: { label: "Roles", canDelete: true, parent: "administration" },
  },
  {
    name: "audit-logs",
    list: "/audit-logs",
    meta: { label: "Audit Logs", parent: "administration" },
  },
];
