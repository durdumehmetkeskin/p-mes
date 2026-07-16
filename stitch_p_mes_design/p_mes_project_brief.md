# Project Brief: P-MES (Manufacturing Execution System)

## 1. Executive Summary
P-MES is a high-performance Manufacturing Execution System (MES) designed to bridge the gap between planning and execution on the factory floor. Built with a "Control Room" aesthetic, it provides real-time visibility into production efficiency (OEE), inventory lifecycles, and equipment health.

---

## 2. Problem Statement
Modern manufacturing environments struggle with fragmented data across inventory, tooling, and project orchestration. P-MES centralizes these domains into a unified, high-fidelity interface to:
- Reduce unplanned downtime through proactive tooling maintenance.
- Eliminate inventory stockouts with real-time lot tracking.
- Improve production throughput via visual workflow orchestration.

---

## 3. Core Modules & Features

### 3.1. Production Dashboard
- **Real-time KPI Tracking:** OEE Efficiency, Active Workorders, and Downtime metrics.
- **Live Production Grid:** Visual representation of machine cells and their operational status (In-Op, Fault, Standby).
- **Audit Logging:** Sequential stream of production events, quality checks, and operator actions.

### 3.2. Inventory Management
- **Hierarchical Tracking:** Manage materials across Warehouses, Zones, and Racks.
- **Lot Control:** Strict tracking of individual lots with status monitoring (In Stock, Low Stock, Reserved).
- **Transaction Engine:** Support for stock transfers, reservations, and audit-trailed balances.

### 3.3. Project Workspace & Orchestration
- **Workflow Orchestration:** Visual timeline of production stages (S-101, S-102, etc.).
- **Resource Allocation:** Monitoring load across automated systems and human engineering resources.
- **Execution Engine:** One-click workflow deployment with phase-based tracking (Setup vs. Execution).

### 3.4. Tooling & Maintenance (Tooling Ops)
- **Asset Registry:** Tracking high-speed mills, stamping presses, and robotic arms.
- **Predictive Health:** Cycle-count based maintenance scheduling and critical failure alerts.
- **Performance Monitoring:** Real-time cycle monitoring and maintenance logs.

---

## 4. Technical Architecture

### 4.1. Backend (NestJS 11)
- **API:** RESTful API with Swagger documentation.
- **Database:** PostgreSQL 18 with TypeORM.
- **Auth:** JWT-based authentication with Role-Based Access Control (RBAC) and granular permission keys.
- **Audit System:** Automatic transaction-level auditing for all entities via DB subscribers.

### 4.2. Frontend (React 19 + Refine)
- **Framework:** Refine SPA for rapid data-heavy development.
- **Styling:** Tailwind CSS v4 (CSS-first) with shadcn/ui primitives.
- **Theme:** "Precision Industrial System" — A high-contrast dark mode optimized for industrial environments.

---

## 5. Visual Language & UX
- **Theme:** Dark Mode (Surface: #0b1326) for reduced eye strain in production environments.
- **Typography:** Inter (Sans-serif) for maximum legibility in data-dense tables.
- **Dual-Navigation:** Global sidebar for system-wide resources + Workspace sidebar for contextual project data.

---

## 6. Success Metrics
- **OEE Improvement:** Target 15% increase in overall equipment effectiveness.
- **Response Time:** <200ms for real-time telemetry updates.
- **Accuracy:** Zero-variance inventory tracking through mandatory lot-based transactions.