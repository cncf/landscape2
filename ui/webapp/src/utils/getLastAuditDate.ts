import { SecurityAudit } from '../types';

/** Returns the date of the latest security audit, or `undefined` when there are none. The input is not mutated. */
const getLastAuditDate = (audits?: SecurityAudit[]): string | undefined =>
  audits?.reduce<string | undefined>(
    (last, audit) => (last === undefined || Date.parse(audit.date) > Date.parse(last) ? audit.date : last),
    undefined
  );

export default getLastAuditDate;
