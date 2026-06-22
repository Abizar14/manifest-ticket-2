export type Role = "operator" | "supervisor" | "admin";
export type FlightStatus =
  | "SCHEDULED"
  | "OPEN"
  | "ACTIVE"
  | "CLOSED"
  | "CANCELLED";

export const ROLES: Role[] = ["operator", "supervisor", "admin"];
export const FLIGHT_STATUSES: FlightStatus[] = [
  "SCHEDULED",
  "OPEN",
  "ACTIVE",
  "CLOSED",
  "CANCELLED",
];
