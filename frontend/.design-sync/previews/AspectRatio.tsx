import { AspectRatio } from "frontend";
import { Warehouse, ImageIcon } from "lucide-react";

export function WarehousePhoto() {
  return (
    <div className="w-80 p-2">
      <AspectRatio ratio={16 / 9} className="bg-muted overflow-hidden rounded-lg">
        <div className="text-muted-foreground flex size-full flex-col items-center justify-center gap-2">
          <Warehouse className="size-8" />
          <span className="text-sm">Warehouse A — photo</span>
        </div>
      </AspectRatio>
    </div>
  );
}

export function SquareThumbnail() {
  return (
    <div className="w-48 p-2">
      <AspectRatio ratio={1} className="bg-muted overflow-hidden rounded-lg">
        <div className="text-muted-foreground flex size-full flex-col items-center justify-center gap-2">
          <ImageIcon className="size-6" />
          <span className="text-xs">Material photo</span>
        </div>
      </AspectRatio>
    </div>
  );
}
