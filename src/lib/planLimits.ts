export const FREE_CASE_LIMIT = 1;
export const FREE_INCIDENT_LIMIT = 10;

export const FREE_CASE_LIMIT_MESSAGE = "The Free plan includes 1 case. Upgrade to Pro for unlimited cases.";
export const FREE_INCIDENT_LIMIT_MESSAGE = "The Free plan includes 10 incidents total. Upgrade to Pro for unlimited incidents.";

export function canCreateCase(caseCount: number, hasPaidAccess: boolean) {
  return hasPaidAccess || caseCount < FREE_CASE_LIMIT;
}

export function canCreateIncident(incidentCount: number, hasPaidAccess: boolean) {
  return hasPaidAccess || incidentCount < FREE_INCIDENT_LIMIT;
}
