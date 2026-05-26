import { formatDistanceToNow } from "date-fns";

/** Returns a relative time string like "2 hours ago", or "" on invalid date. */
export const relativeTime = (date: Date | string | null | undefined): string => {
  if (!date) return "";
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return "";
  }
};
