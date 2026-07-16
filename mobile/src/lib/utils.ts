import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware class merge (ported verbatim from the web frontend). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
