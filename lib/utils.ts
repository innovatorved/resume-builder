import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DOWNLOAD_BUTTON_BASE_CLASSES = "h-auto px-8 py-5 text-lg font-semibold gap-3";
