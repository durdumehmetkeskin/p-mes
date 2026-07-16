import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "frontend";
import { Boxes, CalendarDays } from "lucide-react";

export function MaterialSummary() {
  return (
    <div className="p-6">
      <HoverCard open>
        <HoverCardTrigger asChild>
          <Button variant="link" className="px-0">
            Steel Bracket M-204
          </Button>
        </HoverCardTrigger>
        <HoverCardContent align="start" className="w-72">
          <div className="flex gap-3">
            <div className="bg-muted flex size-10 items-center justify-center rounded-md">
              <Boxes className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Steel Bracket M-204</p>
              <p className="text-muted-foreground text-xs">
                Raw material · SKU MAT-1042
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                <Badge variant="secondary">On hand 1,240 pcs</Badge>
                <Badge variant="outline">Reorder 500</Badge>
              </div>
              <p className="text-muted-foreground pt-1 text-xs">
                Supplier: Nordwerk GmbH · Warehouse A / Bin B-14
              </p>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}

export function UserSummary() {
  return (
    <div className="p-6">
      <HoverCard open>
        <HoverCardTrigger asChild>
          <Button variant="link" className="px-0">
            @n.keskin
          </Button>
        </HoverCardTrigger>
        <HoverCardContent align="start" className="w-72">
          <div className="flex gap-3">
            <Avatar>
              <AvatarFallback>NK</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Necdet Keskin</p>
              <p className="text-muted-foreground text-xs">
                Warehouse Manager · Plant 1
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                <Badge variant="secondary">Admin</Badge>
                <Badge variant="outline">6 projects</Badge>
              </div>
              <div className="text-muted-foreground flex items-center gap-1 pt-1 text-xs">
                <CalendarDays className="size-3" />
                Member since March 2023
              </div>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}
