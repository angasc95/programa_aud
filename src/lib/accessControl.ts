import type { UserProfile } from './healthCheck';
import type { ProgramacionAuditEntity, Phase5FindingEntity } from './auditExecution';
import type { CertificateRecord } from './searchControls';
import type { CertificadoDetailEntity } from './multisiteSampling';
import type { OrganizacionEntity } from './activeCertificates';
import type { FindingRecord } from './drillDown';
import type { AuditRecord } from '../views/auditoriasView';
import type { OrganizationRecord } from '../views/certificacionView';

/**
 * Checks whether the profile is an APPROVED staff member (ADMIN or WORKER).
 */
export function isApprovedStaffProfile(
  profile: UserProfile | null | undefined
): boolean {
  if (!profile || profile.status !== 'APPROVED') return false;
  return profile.role === 'ADMIN' || profile.role === 'WORKER';
}

/**
 * Only APPROVED ADMIN and WORKER staff may plan, reschedule, assign teams, or edit multisite sampling.
 */
export function canEditAuditScheduleOrTeam(
  profile: UserProfile | null | undefined
): boolean {
  return isApprovedStaffProfile(profile);
}

/**
 * Determines whether a user can mutate audit execution artifacts
 * (findings, normative verification checklist, and ISO 17021-1 recommendations)
 * for a given audit.
 * - ADMIN / WORKER: full write access
 * - AUDITOR: strictly restricted to audits where they are assigned in equipo_auditor or auditor_lider
 * - CLIENT / PENDING / REJECTED: strictly read-only / denied
 */
export function canMutateAuditExecution(
  audit: ProgramacionAuditEntity | null | undefined,
  profile: UserProfile | null | undefined
): boolean {
  if (!profile || profile.status !== 'APPROVED') return false;
  if (!audit) return false;
  if (profile.role === 'ADMIN' || profile.role === 'WORKER') return true;
  if (profile.role === 'AUDITOR') {
    return (
      audit.auditor_lider_id === profile.id ||
      audit.equipo.some((member) => member.id_auditor === profile.id)
    );
  }
  return false;
}

/**
 * Checks whether a user profile is authorized by RLS rules to inspect forensic
 * entries in public.audit_log for a given table and record.
 * - ADMIN / WORKER: authorized for all tables
 * - AUDITOR: authorized only for 'auditoria' and 'hallazgo' on assigned audits
 * - CLIENT / PENDING / REJECTED: denied
 */
export function canViewAuditLogForEntity(
  profile: UserProfile | null | undefined,
  tableName: string,
  recordId: string,
  scopedAudits: ProgramacionAuditEntity[] = [],
  scopedFindings: Phase5FindingEntity[] = []
): boolean {
  if (!profile || profile.status !== 'APPROVED') return false;
  if (profile.role === 'ADMIN' || profile.role === 'WORKER') return true;
  if (profile.role === 'AUDITOR') {
    if (tableName === 'auditoria') {
      if (!recordId) return scopedAudits.length > 0;
      return scopedAudits.some((a) => a.id === recordId && canMutateAuditExecution(a, profile));
    }
    if (tableName === 'hallazgo') {
      if (!recordId) return scopedAudits.length > 0;
      const isAssignedAuditId = scopedAudits.some(
        (a) => a.id === recordId && canMutateAuditExecution(a, profile)
      );
      if (isAssignedAuditId) return true;
      const finding = scopedFindings.find((f) => f.id === recordId);
      if (!finding) return false;
      return scopedAudits.some(
        (a) => a.id === finding.id_auditoria && canMutateAuditExecution(a, profile)
      );
    }
    return false;
  }
  return false;
}

/**
 * Scopes Phase 5 Programación audits according to role-based RLS boundaries.
 */
export function scopeProgramacionAuditsForProfile(
  audits: ProgramacionAuditEntity[],
  profile: UserProfile | null | undefined,
  authorizedClientOrgIds: string[]
): ProgramacionAuditEntity[] {
  if (!profile || profile.status !== 'APPROVED') return [];
  if (isApprovedStaffProfile(profile)) return audits;

  if (profile.role === 'AUDITOR') {
    return audits.filter(
      (a) =>
        a.auditor_lider_id === profile.id ||
        a.equipo.some((member) => member.id_auditor === profile.id)
    );
  }

  if (profile.role === 'CLIENT') {
    const allowedOrgIds = new Set(authorizedClientOrgIds);
    return audits.filter((a) => allowedOrgIds.has(a.id_organizacion));
  }

  return [];
}

/**
 * Scopes Phase 5 findings to the audits visible to the current profile.
 */
export function scopePhase5FindingsForProfile(
  findings: Phase5FindingEntity[],
  scopedAudits: ProgramacionAuditEntity[],
  profile: UserProfile | null | undefined
): Phase5FindingEntity[] {
  if (!profile || profile.status !== 'APPROVED') return [];
  if (isApprovedStaffProfile(profile)) return findings;

  const allowedAuditIds = new Set(scopedAudits.map((a) => a.id));
  return findings.filter((f) => allowedAuditIds.has(f.id_auditoria));
}

/**
 * Scopes summary certificate records (Dashboard / Exploration / Certificación list).
 */
export function scopeCertificateRecordsForProfile(
  records: CertificateRecord[],
  profile: UserProfile | null | undefined,
  authorizedClientOrgIds: string[],
  scopedAudits: ProgramacionAuditEntity[]
): CertificateRecord[] {
  if (!profile || profile.status !== 'APPROVED') return [];
  if (isApprovedStaffProfile(profile)) return records;

  if (profile.role === 'AUDITOR') {
    const allowedCertIds = new Set(scopedAudits.map((a) => a.id_certificado));
    const allowedCertNums = new Set(scopedAudits.map((a) => a.numero_certificado));
    return records.filter(
      (r) => allowedCertIds.has(r.id) || allowedCertNums.has(r.numero_certificado)
    );
  }

  if (profile.role === 'CLIENT') {
    const allowedOrgIds = new Set(authorizedClientOrgIds);
    const allowedCertIds = new Set(scopedAudits.map((a) => a.id_certificado));
    return records.filter(
      (r) =>
        (r.organizacion_id && allowedOrgIds.has(r.organizacion_id)) ||
        allowedCertIds.has(r.id)
    );
  }

  return [];
}

/**
 * Scopes detailed multisite certificates (Certificado 4-Zone Detail View).
 */
export function scopeDetailedCertsForProfile(
  certs: CertificadoDetailEntity[],
  profile: UserProfile | null | undefined,
  authorizedClientOrgIds: string[],
  scopedAudits: ProgramacionAuditEntity[]
): CertificadoDetailEntity[] {
  if (!profile || profile.status !== 'APPROVED') return [];
  if (isApprovedStaffProfile(profile)) return certs;

  if (profile.role === 'AUDITOR') {
    const allowedCertIds = new Set(scopedAudits.map((a) => a.id_certificado));
    const allowedCertNums = new Set(scopedAudits.map((a) => a.numero_certificado));
    return certs.filter(
      (c) => allowedCertIds.has(c.id) || allowedCertNums.has(c.numero_certificado)
    );
  }

  if (profile.role === 'CLIENT') {
    const allowedOrgIds = new Set(authorizedClientOrgIds);
    return certs.filter((c) => allowedOrgIds.has(c.id_organizacion));
  }

  return [];
}

/**
 * Scopes OrganizacionEntity list for Certificación -> Organizaciones.
 */
export function scopeOrganizacionEntitiesForProfile(
  orgs: OrganizacionEntity[],
  profile: UserProfile | null | undefined,
  authorizedClientOrgIds: string[],
  scopedAudits: ProgramacionAuditEntity[]
): OrganizacionEntity[] {
  if (!profile || profile.status !== 'APPROVED') return [];
  if (isApprovedStaffProfile(profile)) return orgs;

  if (profile.role === 'AUDITOR') {
    const allowedOrgIds = new Set(scopedAudits.map((a) => a.id_organizacion));
    const allowedOrgNames = new Set(scopedAudits.map((a) => a.organizacion_nombre));
    return orgs.filter(
      (o) => allowedOrgIds.has(o.id) || allowedOrgNames.has(o.nombre)
    );
  }

  if (profile.role === 'CLIENT') {
    const allowedOrgIds = new Set(authorizedClientOrgIds);
    return orgs.filter((o) => allowedOrgIds.has(o.id));
  }

  return [];
}

/**
 * Scopes OrganizationRecord list for Drill-Down and legacy summaries.
 */
export function scopeOrganizationsForProfile(
  orgs: OrganizationRecord[],
  profile: UserProfile | null | undefined,
  authorizedClientOrgIds: string[],
  scopedAudits: ProgramacionAuditEntity[],
  scopedCerts: CertificateRecord[]
): OrganizationRecord[] {
  if (!profile || profile.status !== 'APPROVED') return [];
  if (isApprovedStaffProfile(profile)) return orgs;

  if (profile.role === 'AUDITOR') {
    const allowedOrgIds = new Set<string>([
      ...scopedAudits.map((a) => a.id_organizacion),
      ...scopedCerts
        .map((c) => c.organizacion_id)
        .filter((id): id is string => Boolean(id)),
    ]);
    const allowedOrgNames = new Set<string>([
      ...scopedAudits.map((a) => a.organizacion_nombre),
      ...scopedCerts.map((c) => c.organizacion_nombre),
    ]);
    return orgs.filter(
      (o) => allowedOrgIds.has(o.id) || allowedOrgNames.has(o.nombre)
    );
  }

  if (profile.role === 'CLIENT') {
    const allowedOrgIds = new Set(authorizedClientOrgIds);
    const allowedOrgNames = new Set(scopedCerts.map((c) => c.organizacion_nombre));
    return orgs.filter(
      (o) => allowedOrgIds.has(o.id) || allowedOrgNames.has(o.nombre)
    );
  }

  return [];
}

/**
 * Scopes legacy AuditRecord entries for Drill-Down.
 */
export function scopeLegacyAuditsForProfile(
  audits: AuditRecord[],
  profile: UserProfile | null | undefined,
  scopedAudits: ProgramacionAuditEntity[],
  scopedCerts: CertificateRecord[]
): AuditRecord[] {
  if (!profile || profile.status !== 'APPROVED') return [];
  if (isApprovedStaffProfile(profile)) return audits;

  const allowedAuditIds = new Set(scopedAudits.map((a) => a.id));
  const allowedCertIds = new Set(scopedCerts.map((c) => c.id));
  const allowedCertNums = new Set(scopedCerts.map((c) => c.numero_certificado));

  return audits.filter(
    (a) =>
      allowedAuditIds.has(a.id) ||
      (a.id_certificado && allowedCertIds.has(a.id_certificado)) ||
      allowedCertNums.has(a.numero_certificado)
  );
}

/**
 * Scopes legacy FindingRecord entries for Drill-Down.
 */
export function scopeLegacyFindingsForProfile(
  findings: FindingRecord[],
  scopedLegacyAudits: AuditRecord[],
  scopedCerts: CertificateRecord[],
  profile: UserProfile | null | undefined
): FindingRecord[] {
  if (!profile || profile.status !== 'APPROVED') return [];
  if (isApprovedStaffProfile(profile)) return findings;

  const allowedAuditIds = new Set(scopedLegacyAudits.map((a) => a.id));
  const allowedCertNums = new Set(scopedCerts.map((c) => c.numero_certificado));

  return findings.filter(
    (f) =>
      allowedAuditIds.has(f.id_auditoria) ||
      (f.numero_certificado && allowedCertNums.has(f.numero_certificado))
  );
}

/**
 * Scopes SiteRecord or ProcessRecord lists by the visible certificates.
 */
export function scopeSitesOrProcessesForCertificates<
  T extends { numero_certificado: string }
>(
  items: T[],
  scopedCerts: CertificateRecord[],
  profile: UserProfile | null | undefined
): T[] {
  if (!profile || profile.status !== 'APPROVED') return [];
  if (isApprovedStaffProfile(profile)) return items;

  const allowedCertNums = new Set(scopedCerts.map((c) => c.numero_certificado));
  return items.filter((item) => allowedCertNums.has(item.numero_certificado));
}
