import { Calendar } from "frontend";

export function SingleDate() {
  return (
    <div className="p-2">
      <Calendar
        mode="single"
        selected={new Date(2026, 6, 1)}
        defaultMonth={new Date(2026, 6, 1)}
        className="rounded-md border"
      />
    </div>
  );
}

export function DateRange() {
  return (
    <div className="p-2">
      <Calendar
        mode="range"
        selected={{ from: new Date(2026, 6, 7), to: new Date(2026, 6, 14) }}
        defaultMonth={new Date(2026, 6, 1)}
        numberOfMonths={1}
        className="rounded-md border"
      />
    </div>
  );
}
