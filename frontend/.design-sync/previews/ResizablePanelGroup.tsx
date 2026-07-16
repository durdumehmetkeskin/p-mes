import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "frontend";

export function HorizontalSplit() {
  return (
    <div className="p-2">
      <ResizablePanelGroup
        direction="horizontal"
        className="h-[220px] max-w-md rounded-lg border"
      >
        <ResizablePanel defaultSize={40}>
          <div className="flex h-full flex-col gap-1 p-4">
            <span className="text-sm font-semibold">Materials</span>
            <span className="text-muted-foreground text-sm">STEEL-001</span>
            <span className="text-muted-foreground text-sm">ALU-118</span>
            <span className="text-muted-foreground text-sm">PACK-052</span>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={60}>
          <div className="flex h-full flex-col gap-1 p-4">
            <span className="text-sm font-semibold">Steel Bracket M-204</span>
            <span className="text-muted-foreground text-sm">
              On-hand 1,240 pcs · Warehouse WH-01
            </span>
            <span className="text-muted-foreground text-sm">
              Reorder point 500 pcs
            </span>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export function NestedSplit() {
  return (
    <div className="p-2">
      <ResizablePanelGroup
        direction="horizontal"
        className="h-[220px] max-w-md rounded-lg border"
      >
        <ResizablePanel defaultSize={45}>
          <div className="flex h-full items-center justify-center p-4 text-sm font-medium">
            Bin map
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={55}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={55}>
              <div className="flex h-full items-center justify-center p-4 text-sm">
                Goods receipt
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={45}>
              <div className="flex h-full items-center justify-center p-4 text-sm">
                Goods issue
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
