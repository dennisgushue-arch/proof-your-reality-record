export const FREE_CASE_LIMIT = 1;
export const FREE_INCIDENTS_PER_MONTH = 1;

export const FREE_CASE_LIMIT_MESSAGE = "The Free plan includes 1 case. Upgrade to Pro for unlimited cases.";
export const FREE_INCIDENT_LIMIT_MESSAGE = "The Free plan includes 1 incident per month. Upgrade to Pro for unlimited incidents.";

export function canCreateCase(caseCount: number, hasPaidAccess: boolean) {
  return hasPaidAccess || caseCount < FREE_CASE_LIMIT;
}

export function canCreateIncident(incidentCountThisMonth: number, hasPaidAccess: boolean) {
  return hasPaidAccess || incidentCountThisMonth < FREE_INCIDENTS_PER_MONTH;
}

export function currentUtcMonthRange(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}
