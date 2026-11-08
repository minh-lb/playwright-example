export type BookingStatus = "CONFIRMED" | "COMPLETED" | "CANCELED";

export function canChangeBookingStatus(current: BookingStatus, next: BookingStatus): boolean {
  if (current === next) return true;
  return current === "CONFIRMED" && (next === "COMPLETED" || next === "CANCELED");
}
