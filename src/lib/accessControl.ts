import type { UserProfile } from './healthCheck';
import type { OrganizacionEntity } from './activeCertificates';
import type { CertificateRecord } from './searchControls';
import type { CertificadoDetailEntity } from './multisiteSampling';
import type { FindingRecord } from './drillDown';
import type {
  Phase5FindingEntity,
  ProgramacionAuditEntity,
} from './auditExecution';

/**
 * Pure Phase 6.1 Access Isolation & RBAC Scoping Helpers
 * Enforces ISO/IEC 17021-1 and RLS boundaries at the application layer
 * across ADMIN, WORKER, AUDITOR, CLIENT, and PENDING/REJECTED states.
 */

export function isApprovedStaffProfile(
  profile: UserProfile | null | undefined
): boolean {
  if (!profile || profile.status !== 'APPROVED') return false;
  return profile.role === 'ADMIN' || profile.role === 'WORKER';
}

export function isApprovedAdminProfile(
  profile: UserProfile | null | undefined
): boolean {
  if (!profile || profile.status !== 'APPROVED') return false;
  return profile.role === 'ADMIN';
}

export function canEditAuditScheduleOrTeam(
  profile: UserProfile | null | undefined
): boolean {
  return isApprovedStaffProfile(profile);
}

export function isAuditAssignedToProfile(
  audit: Pick<ProgramacionAuditEntity, 'auditor_lider_id' | 'auditor_lider' | 'equipo'> | null | undefined,
  profile: UserProfile | null | undefined
): boolean {
  if (!audit || !profile || profile.status !== 'APPROVED') return false;
  if (profile.role === 'ADMIN' || profile.role === 'WORKER') return true;
  if (profile.role !== 'AUDITOR') return false;

  if (audit.auditor_lider_id === profile.id) return true;
  if (audit.equipo.some((member) => member.id_auditor === profile.id)) return true;

  // Defensive fallback match by exact name if an un-ID'd seed row exists
  if (
    profile.nombre &&
    audit.auditor_lider &&
    audit.auditor_lider.trim().toLowerCase() === profile.nombre.trim().toLowerCase()
  ) {
    return true;
  }
  return false;
}

export function canMutateAuditExecution(
  audit: Pick<ProgramacionAuditEntity, 'auditor_lider_id' | 'auditor_lider' | 'equipo'> | null | undefined,
  profile: UserProfile | null | undefined
): boolean {
  if (!profile || profile.status !== 'APPROVED') return false;
  if (profile.role === 'ADMIN' || profile.role === 'WORKER') return true;
  if (profile.role === 'AUDITOR') {
    return isAuditAssignedToProfile(audit, profile);
  }
  return false;
}

export function scopeProgramacionAuditsForProfile(
  audits: ProgramacionAuditEntity[],
  profile: UserProfile | null | undefined,
  clientOrgIds: string[]
): ProgramacionAuditEntity[] {
  if (!profile || profile.status !== 'APPROVED') return [];
  if (profile.role === 'ADMIN' || profile.role === 'WORKER') return audits;
  if (profile.role === 'AUDITOR') {
    return audits.filter((audit) => isAuditAssignedToProfile(audit, profile));
  }
  if (profile.role === 'CLIENT') {
    const allowedOrgs = new Set(clientOrgIds);
    return audits.filter((audit) => allowedOrgs.has(audit.id_organizacion));
  }
  return [];
}

export function scopePhase5FindingsForProfile(
  findings: Phase5FindingEntity[],
  scopedAudits: ProgramacionAuditEntity[],
  profile: UserProfile | null | undefined
): Phase5FindingEntity[] {
  if (!profile || profile.status !== 'APPROVED') return [];
  if (profile.role === 'ADMIN' || profile.role === 'WORKER') return findings;
  const allowedAuditIds = new Set(scopedAudits.map((a) => a.id));
  return findings.filter((finding) => allowedAuditIds.has(finding.id_auditoria));
}

export function getAssignedScopeSets(
  scopedAudits: ProgramacionAuditEntity[]
): {
  assignedAuditIds: Set<string>;
  assignedCertIds: Set<string>;
  assignedCertNumbers: Set<string>;
  assignedOrgIds: Set<string>;
} {
  const assignedAuditIds = new Set<string>();
  const assignedCertIds = new Set<string>();
  const assignedCertNumbers = new Set<string>();
  const assignedOrgIds = new Set<string>();

  for (const audit of scopedAudits) {
    assignedAuditIds.add(audit.id);
    if (audit.id_certificado) assignedCertIds.add(audit.id_certificado);
    if (audit.numero_certificado) assignedCertNumbers.add(audit.numero_certificado);
    if (audit.id_organizacion) assignedOrgIds.add(audit.id_organizacion);
  }

  return {
    assignedAuditIds,
    assignedCertIds,
    assignedCertNumbers,
    assignedOrgIds,
  };
}

export function scopeCertificateRecordsForProfile(
  records: CertificateRecord[],
  profile: UserProfile | null | undefined,
  clientOrgIds: string[],
  scopedAudits: ProgramacionAuditEntity[]
): CertificateRecord[] {
  if (!profile || profile.status !== 'APPROVED') return [];
  if (profile.role === 'ADMIN' || profile.role === 'WORKER') return records;

  if (profile.role === 'CLIENT') {
    const allowedOrgs = new Set(clientOrgIds);
    return records.filter(
      (cert) => Boolean(cert.organizacion_id && allowedOrgs.has(cert.organizacion_id))
    );
  }

  if (profile.role === 'AUDITOR') {
    const { assignedCertIds, assignedCertNumbers } = getAssignedScopeSets(scopedAudits);
    return records.filter(
      (cert) =>
        assignedCertIds.has(cert.id) ||
        assignedCertNumbers.has(cert.numero_certificado)
    );
  }

  return [];
}

export function scopeDetailedCertsForProfile(
  certs: CertificadoDetailEntity[],
  profile: UserProfile | null | undefined,
  clientOrgIds: string[],
  scopedAudits: ProgramacionAuditEntity[]
): CertificadoDetailEntity[] {
  if (!profile || profile.status !== 'APPROVED') return [];
  if (profile.role === 'ADMIN' || profile.role === 'WORKER') return certs;

  if (profile.role === 'CLIENT') {
    const allowedOrgs = new Set(clientOrgIds);
    return certs.filter((cert) => allowedOrgs.has(cert.id_organizacion));
  }

  if (profile.role === 'AUDITOR') {
    const { assignedCertIds, assignedCertNumbers } = getAssignedScopeSets(scopedAudits);
    return certs.filter(
      (cert) =>
        assignedCertIds.has(cert.id) ||
        assignedCertNumbers.has(cert.numero_certificado)
    );
  }

  return [];
}

export function scopeOrganizationsForProfile<T extends { id: string }>(
  orgs: T[],
  profile: UserProfile | null | undefined,
  clientOrgIds: string[],
  scopedAudits: ProgramacionAuditEntity[],
  scopedCerts?: Array<{ organizacion_id?: string; id_organizacion?: string }>
): T[] {
  if (!profile || profile.status !== 'APPROVED') return [];
  if (profile.role === 'ADMIN' || profile.role === 'WORKER') return orgs;

  if (profile.role === 'CLIENT') {
    const allowedOrgs = new Set(clientOrgIds);
    return orgs.filter((org) => allowedOrgs.has(org.id));
  }

  if (profile.role === 'AUDITOR') {
    const allowedOrgs = new Set<string>(
      getAssignedScopeSets(scopedAudits).assignedOrgIds
    );
    if (scopedCerts) {
      for (const cert of scopedCerts) {
        if (cert.organizacion_id) allowedOrgs.add(cert.organizacion_id);
        if (cert.id_organizacion) allowedOrgs.add(cert.id_organizacion);
      }
    }
    return orgs.filter((org) => allowedOrgs.has(org.id));
  }

  return [];
}

export function scopeOrganizacionEntitiesForProfile(
  orgs: OrganizacionEntity[],
  profile: UserProfile | null | undefined,
  clientOrgIds: string[],
  scopedAudits: ProgramacionAuditEntity[]
): OrganizacionEntity[] {
  return scopeOrganizationsForProfile(orgs, profile, clientOrgIds, scopedAudits);
}

export function scopeSitesOrProcessesForCertificates<
  T extends { numero_certificado?: string; id_certificado?: string }
>(
  items: T[],
  scopedCerts: Array<{ id: string; numero_certificado: string }>,
  profile: UserProfile | null | undefined
): T[] {
  if (!profile || profile.status !== 'APPROVED') return [];
  if (profile.role === 'ADMIN' || profile.role === 'WORKER') return items;

  const allowedCertIds = new Set(scopedCerts.map((c) => c.id));
  const allowedCertNums = new Set(scopedCerts.map((c) => c.numero_certificado));

  return items.filter(
    (item) =>
      (item.id_certificado && allowedCertIds.has(item.id_certificado)) ||
      (item.numero_certificado && allowedCertNums.has(item.numero_certificado))
  );
}

export function scopeLegacyAuditsForProfile<
  T extends { id: string; numero_certificado: string; id_certificado?: string }
>(
  audits: T[],
  profile: UserProfile | null | undefined,
  scopedProgramacionAudits: ProgramacionAuditEntity[],
  scopedCerts: Array<{ id: string; numero_certificado: string }>
): T[] {
  if (!profile || profile.status !== 'APPROVED') return [];
  if (profile.role === 'ADMIN' || profile.role === 'WORKER') return audits;

  if (profile.role === 'AUDITOR') {
    const allowedAuditIds = new Set(scopedProgramacionAudits.map((a) => a.id));
    return audits.filter((audit) => allowedAuditIds.has(audit.id));
  }

  if (profile.role === 'CLIENT') {
    const allowedCertIds = new Set(scopedCerts.map((c) => c.id));
    const allowedCertNums = new Set(scopedCerts.map((c) => c.numero_certificado));
    return audits.filter(
      (audit) =>
        (audit.id_certificado && allowedCertIds.has(audit.id_certificado)) ||
        allowedCertNums.has(audit.numero_certificado)
    );
  }

  return [];
}

export function scopeLegacyFindingsForProfile(
  findings: FindingRecord[],
  scopedLegacyAudits: Array<{ id: string }>,
  scopedCerts: Array<{ numero_certificado: string }>,
  profile: UserProfile | null | undefined
): FindingRecord[] {
  if (!profile || profile.status !== 'APPROVED') return [];
  if (profile.role === 'ADMIN' || profile.role === 'WORKER') return findings;

  const allowedAuditIds = new Set(scopedLegacyAudits.map((a) => a.id));
  const allowedCertNums = new Set(scopedCerts.map((c) => c.numero_certificado));

  return findings.filter(
    (finding) =>
      allowedAuditIds.has(finding.id_auditoria) ||
      (profile.role === 'CLIENT' &&
        Boolean(finding.numero_certificado && allowedCertNums.has(finding.numero_certificado)))
  );
}
