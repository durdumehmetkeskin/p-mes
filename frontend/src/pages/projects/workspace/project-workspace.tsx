import { useShow } from "@refinedev/core";
import {
  Boxes,
  Building2,
  ClipboardList,
  Contact,
  GanttChartSquare,
  Info,
  Paperclip,
  UserCog,
  Workflow as WorkflowIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link, NavLink, Outlet, useParams } from "react-router";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCanEditProject } from "@/hooks/use-can-edit-project";
import { cn } from "@/lib/utils";

export interface ProjectContext {
  projectId: string;
  customerCompanyId: string | null;
}

interface ProjectRecord {
  id: string;
  code: string;
  name: string;
  customerCompanyId: string | null;
  managerUserId: string | null;
}

const NAV: Array<{ to: string; label: string; icon: ReactNode; end?: boolean }> = [
  { to: ".", label: "Overview", icon: <Info className="h-4 w-4" />, end: true },
  { to: "orders", label: "Orders", icon: <ClipboardList className="h-4 w-4" /> },
  {
    to: "inventory",
    label: "Materials & Tools",
    icon: <Boxes className="h-4 w-4" />,
  },
  { to: "customer", label: "Customer", icon: <Building2 className="h-4 w-4" /> },
  { to: "contacts", label: "Contacts", icon: <Contact className="h-4 w-4" /> },
  { to: "employees", label: "Team", icon: <UserCog className="h-4 w-4" /> },
  {
    to: "workflow",
    label: "Workflow",
    icon: <WorkflowIcon className="h-4 w-4" />,
  },
  {
    to: "timeline",
    label: "Timeline",
    icon: <GanttChartSquare className="h-4 w-4" />,
  },
  { to: "files", label: "Files", icon: <Paperclip className="h-4 w-4" /> },
];

/**
 * Full-page workspace for a single project. Shows a project-scoped secondary
 * sidebar (Orders / Customer / Contacts / Employees / Stage Types / Workflow)
 * and renders the active section in the outlet. The project context (id +
 * customer) is shared with sections via the outlet context.
 */
export const ProjectWorkspace = () => {
  const { id } = useParams();
  // Pass resource/id explicitly: at sub-routes (e.g. /projects/:id/categories)
  // the path no longer matches the projects "show" route, so inference would
  // resolve an empty resource and request /api//:id (404).
  const { query } = useShow<ProjectRecord>({ resource: "projects", id });
  const project = query.data?.data;
  const canEditProject = useCanEditProject();
  // The Customer, Contacts and Workflow sections are visible ONLY to admins
  // and the project's manager (backend serves them manager-only too).
  const managerOnlyNav = new Set(["customer", "contacts", "workflow"]);
  const isManagerish = project ? canEditProject(project.managerUserId) : false;
  const navItems = NAV.filter(
    (item) => !managerOnlyNav.has(item.to) || isManagerish,
  );

  const context: ProjectContext = {
    projectId: id ?? "",
    customerCompanyId: project?.customerCompanyId ?? null,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/projects">← Projects</Link>
          </Button>
          {project ? (
            <h1 className="text-xl font-bold">
              {project.code} · {project.name}
            </h1>
          ) : (
            <Skeleton className="h-6 w-48" />
          )}
        </div>
        {/* Editing a project is reserved to admins and its manager. */}
        {project && canEditProject(project.managerUserId) && (
          <Button asChild variant="outline" size="sm">
            <Link to={`/projects/${id}/edit`}>Edit project</Link>
          </Button>
        )}
      </div>

      <div className="flex gap-6">
        <aside className="w-52 shrink-0">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/50",
                  )
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <Outlet context={context} />
        </div>
      </div>
    </div>
  );
};
