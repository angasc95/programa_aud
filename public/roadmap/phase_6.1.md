# Phase 6.1: System Integration & Security — Forensic Audit Trails & Row-Level Security (RLS) Isolation



## 1. Scope

Database-level auditing infrastructure and role-based security boundary hardening.

## 2. Key Deliverables

### 2.1 Forensic Audit Trail Verification

* **Target:** Every primary operational table (`organizacion`, `certificado`, `sitio`, `proceso`, `turno`, `auditoria`, `hallazgo`, `norma`, `subsector_iaf`, `acreditacion_norma_iaf`).


* **Verification Protocol:**
* Execute programmatic `INSERT`, `UPDATE`, and `DELETE` mutations.


* Verify that triggers execute synchronously and record complete `old_data` and `new_data` JSONB snapshots in `public.audit_log`.


* Open the `🕒 Historial de Cambios` modal on each detail page and confirm:
* Actor display name and email are accurately resolved.


* Timestamp is formatted in local readable time.


* Field-level diff highlights modified attributes with clear old-vs-new visualization.







### 2.2 Row Level Security (RLS) & Access Isolation

* **Role Verification Scenarios:**
* **`ADMIN`:** Full read/write access across all domains, catalogs, approvals panel, and database status view.


* **`WORKER`:** Full operational read/write across organizations, certificates, and audits; read-only access to user management.


* **`AUDITOR`:** Read access to assigned certificates and organizations; write access strictly restricted to audit findings, checklists, and recommendations for assigned audits.


* **`CLIENT`:** Read-only access strictly restricted to the certificates, sites, processes, and audit results belonging to their own organization.


* **`PENDING` / `REJECTED`:** Complete denial of operational access. Workspace renders a clean informational screen stating account status with role icon suppressed and status icon (`⏳` or `❌`) displayed.