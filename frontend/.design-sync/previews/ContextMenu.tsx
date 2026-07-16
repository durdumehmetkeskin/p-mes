import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "frontend";
import { Copy, Pencil, PackageMinus, Trash2 } from "lucide-react";

export function MaterialRowMenu() {
  return (
    <div className="p-6">
      <ContextMenu>
        <ContextMenuTrigger className="border-input text-muted-foreground flex h-28 w-80 items-center justify-center rounded-md border border-dashed text-sm">
          Right-click a material row for actions
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuLabel>Steel Bracket M-204</ContextMenuLabel>
          <ContextMenuSeparator />
          <ContextMenuItem>
            <Pencil />
            Edit material
            <ContextMenuShortcut>⌘E</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem>
            <Copy />
            Duplicate
          </ContextMenuItem>
          <ContextMenuItem>
            <PackageMinus />
            Issue stock
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuCheckboxItem checked>
            Pin to top
          </ContextMenuCheckboxItem>
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive">
            <Trash2 />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}
