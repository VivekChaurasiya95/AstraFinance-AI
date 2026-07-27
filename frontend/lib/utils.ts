import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function timeAgo(dateString: string | null | undefined): string {
  if (!dateString || dateString === "Just now") return "Just now";
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const now = new Date();
  const secondsPast = (now.getTime() - date.getTime()) / 1000;

  if (secondsPast < 60) return "Just now";
  if (secondsPast < 3600) return `${Math.floor(secondsPast / 60)} minute${Math.floor(secondsPast / 60) === 1 ? '' : 's'} ago`;
  if (secondsPast < 86400) return `${Math.floor(secondsPast / 3600)} hour${Math.floor(secondsPast / 3600) === 1 ? '' : 's'} ago`;
  if (secondsPast < 2592000) return `${Math.floor(secondsPast / 86400)} day${Math.floor(secondsPast / 86400) === 1 ? '' : 's'} ago`;
  if (secondsPast < 31536000) return `${Math.floor(secondsPast / 2592000)} month${Math.floor(secondsPast / 2592000) === 1 ? '' : 's'} ago`;
  return `${Math.floor(secondsPast / 31536000)} year${Math.floor(secondsPast / 31536000) === 1 ? '' : 's'} ago`;
}
