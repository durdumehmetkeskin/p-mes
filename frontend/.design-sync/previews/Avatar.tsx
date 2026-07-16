import { Avatar, AvatarImage, AvatarFallback } from "frontend";

export function UserRow() {
  return (
    <div className="flex items-center gap-3 p-2">
      <Avatar>
        <AvatarImage src="/avatars/necati-keskin.png" alt="Necati Keskin" />
        <AvatarFallback>NK</AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="text-sm font-medium">Necati Keskin</span>
        <span className="text-muted-foreground text-xs">Warehouse Supervisor</span>
      </div>
    </div>
  );
}

export function Fallbacks() {
  return (
    <div className="flex items-center gap-3 p-2">
      <Avatar>
        <AvatarFallback>NK</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>AL</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>MK</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>OY</AvatarFallback>
      </Avatar>
    </div>
  );
}

export function StackedGroup() {
  return (
    <div className="flex items-center p-2">
      <div className="flex -space-x-2">
        <Avatar className="ring-background ring-2">
          <AvatarFallback>NK</AvatarFallback>
        </Avatar>
        <Avatar className="ring-background ring-2">
          <AvatarFallback>AL</AvatarFallback>
        </Avatar>
        <Avatar className="ring-background ring-2">
          <AvatarFallback>MK</AvatarFallback>
        </Avatar>
        <Avatar className="ring-background ring-2">
          <AvatarFallback className="text-xs">+6</AvatarFallback>
        </Avatar>
      </div>
      <span className="text-muted-foreground ml-3 text-sm">
        9 operators assigned
      </span>
    </div>
  );
}
