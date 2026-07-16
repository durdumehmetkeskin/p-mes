import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "frontend";
import { Info, PackageMinus } from "lucide-react";

export function ReservedStockHint() {
  return (
    <div className="p-10">
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon">
              <Info />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Reserved stock is committed to open work orders and cannot be issued.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export function ActionTooltip() {
  return (
    <div className="p-10">
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger asChild>
            <Button size="icon">
              <PackageMinus />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Issue stock to a work order</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
