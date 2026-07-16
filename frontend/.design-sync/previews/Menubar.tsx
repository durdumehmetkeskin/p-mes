import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "frontend";

export function AppMenubar() {
  return (
    <div className="p-6">
      <Menubar className="w-[560px]">
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Reports</MenubarTrigger>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Help</MenubarTrigger>
        </MenubarMenu>
      </Menubar>
    </div>
  );
}

export function OpenFileMenu() {
  return (
    <div className="p-6">
      <Menubar defaultValue="file" className="w-[560px]">
        <MenubarMenu value="file">
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              New work order <MenubarShortcut>⌘N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>Import materials…</MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              Export inventory CSV <MenubarShortcut>⌘E</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>Print stock report</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu value="edit">
          <MenubarTrigger>Edit</MenubarTrigger>
        </MenubarMenu>
        <MenubarMenu value="view">
          <MenubarTrigger>View</MenubarTrigger>
        </MenubarMenu>
        <MenubarMenu value="reports">
          <MenubarTrigger>Reports</MenubarTrigger>
        </MenubarMenu>
      </Menubar>
    </div>
  );
}
