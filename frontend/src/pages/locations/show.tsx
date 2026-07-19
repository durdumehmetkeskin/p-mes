import { useShow } from "@refinedev/core";
import { Link, useParams } from "react-router";

import { Can } from "@/components/can";
import { StatusBadge } from "@/components/refine-ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataPanel } from "./data-panel";
import { SectionsPanel } from "./sections-panel";
import { StoragePanel } from "./storage-panel";

interface LocationRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export const LocationsShow = () => {
  const { id } = useParams();
  const { query } = useShow<LocationRecord>();
  const record = query.data?.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/locations">← Locations</Link>
          </Button>
          {record ? (
            <h1 className="flex items-center gap-2 text-xl font-bold">
              {record.code} · {record.name}
              <StatusBadge tone={record.isActive ? "success" : "neutral"} label={record.isActive ? "Active" : "Inactive"} />
            </h1>
          ) : (
            <Skeleton className="h-6 w-48" />
          )}
        </div>
        {record && (
          <Can perm="locations:update">
            <Button asChild variant="outline" size="sm">
              <Link to={`/locations/${id}/edit`}>Edit location</Link>
            </Button>
          </Can>
        )}
      </div>

      {record?.description && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            {record.description}
          </CardContent>
        </Card>
      )}

      {id && (
        <>
          <SectionsPanel locationId={id} />
          <StoragePanel locationId={id} />
          <DataPanel locationId={id} />
        </>
      )}
    </div>
  );
};
