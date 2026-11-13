# Phase 4.2.3: New `Proceso` & `Turno` Detail Views + Legacy `drillDownView` Decommissioning

> **Parent Phase:** Phase 4.2 — Three-Zone Detail View Architecture & Child Drill-Downs  
> **Depends On:** [`phase_4.2.2.md`](./phase_4.2.2.md) (`Sitio` Detail View & Parent/Child Drill-Down Patterns)  
> **Unlocks:** [`phase_5.1.md`](./phase_5.1.md) (Safe Archive Modal), [`phase_5.2.md`](./phase_5.2.md) (Test Suite & E2E Gate)

---

## 1. Objectives & Scope

With `Acreditación` and `Sitio` Detail Views operational from Phase 4.2.2, two remaining child entities—**`Proceso`** and **`Turno`**—still lack dedicated 3-Zone Detail Views, and the legacy `src/views/drillDownView.ts` (1,110 lines) remains in the codebase.

**Phase 4.2.3** completes the Detail View graph and retires legacy explorer scaffolding:
1. Build **`Proceso` Detail View** (`src/lib/procesoDomain.ts`, `src/views/procesoView.ts`) with ISO clause (`LTREE`) mapping, linked findings, and scheduled audit visibility.
2. Build **`Turno` Detail View** (`src/lib/turnoDomain.ts`, `src/views/turnoView.ts`) with overnight shift duration calculation, reciprocal `Sedes Operativas` drill-down, and shift audits.
3. Extract shared `FindingRecord` / `FindingType` types currently imported from `src/lib/drillDown.ts` by `accessControl.ts` and `auditExecution.ts` into `src/lib/auditDomain.ts` (avoiding broken imports), and cleanly decommission `src/views/drillDownView.ts` and dead `drilldown` dispatchers in `src/main.ts`.

---

## 2. Technical & UX Specifications

### 2.1 `Proceso` Detail View (`src/lib/procesoDomain.ts` & `src/views/procesoView.ts`)

- **Pure Domain Module (`src/lib/procesoDomain.ts`):**
  - `ProcesoDetailEntity` joining `proceso` with `certificado`, `organizacion`, `requisitos_por_proceso` + `requisito`, `hallazgo`, and `procesos_sitio_auditoria`.
  - Validation helpers: `validateProcesoInput()` (`nombre_proceso` non-empty `<= 150` chars, `tipo` strictly in `'Estratégico' | 'Medular' | 'De Apoyo' | 'Otro'`).
- **3-Zone Detail Layout (`src/views/procesoView.ts`):**
  - **Parent Zone:**
    - `Organización`: clickable chip → **`Organización` Detail View**.
    - `Certificado`: clickable chip → **`Certificado` Detail View**.
  - **Hairline Divider.**
  - **Record Zone:**
    - Title (`nombre_proceso`), process classification badge (`Estratégico`, `Medular`, `De Apoyo`, `Otro`), mapped ISO clause count, `🕒 Historial de Cambios` (`table_name = 'proceso'`), `Editar`, and `Archivar`.
  - **Children Zone (Multipage, List-Only):**
    - Tab 1: **Requisitos Normativos Vinculados** (`requisitos_por_proceso` joined with `requisito`) — list-only table showing clause code (`4.1`, `8.5.1`) and `LTREE` path, plus toggle/assign clause selector (`ADMIN`/`WORKER`) scoped strictly to the parent certificate's `Norma`.
    - Tab 2: **Hallazgos Asociados** (`hallazgo`) — list-only table (`Tipo`, `Cláusula`, `Descripción`, `Abierto / Cerrado`) clicking through to the parent **`Auditoría` Resultado/Detail View**.
    - Tab 3: **Auditorías Programadas** (`procesos_sitio_auditoria`) — list-only table showing which site, shift, and audit evaluate this process (clicking row → `Auditoría`, `Sitio`, or `Turno` Detail View).

### 2.2 `Turno` Detail View (`src/lib/turnoDomain.ts` & `src/views/turnoView.ts`)

- **Pure Domain Module (`src/lib/turnoDomain.ts`):**
  - `computeShiftDurationLabel(horaEntrada, horaSalida)`: calculates duration in hours & minutes (`"8h 00m"`), handling overnight shifts cleanly (e.g., `22:00 → 06:00` = `"8h 00m (nocturno)"`).
  - `validateTurnoInput(horaEntrada, horaSalida)`: ensures valid `HH:MM` format and `horaEntrada !== horaSalida`.
- **3-Zone Detail Layout (`src/views/turnoView.ts`):**
  - **Parent Zone (Contextual):**
    - When navigated from a specific **`Sitio` Detail View**, displays clickable `Sitio` + `Certificado` chips preserving drill-down ancestry (and omits empty Parent Zone/divider if opened from a global shift context).
  - **Hairline Divider (when Parent Zone is shown).**
  - **Record Zone:**
    - Title (`${hora_entrada} – ${hora_salida}`), computed shift duration badge, `🕒 Historial de Cambios` (`table_name = 'turno'`), `Editar` (`ADMIN`/`WORKER`), and `Archivar`.
  - **Children Zone (Multipage, List-Only):**
    - Tab 1: **Sedes Operativas con este Turno** (`turnos_por_sitio` joined with `sitio`, `certificado`, `organizacion`) — list-only table clicking through to **`Sitio` Detail View**.
    - Tab 2: **Auditorías en este Turno** (`turnos_sitio_auditoria` joined with `sitios_por_auditoria` and `auditoria`) — list-only table clicking through to **`Programación / Auditoría` Detail View**.

### 2.3 Safe Decommissioning of `drillDownView.ts` & Type Decoupling

1. Relocate `FindingRecord`, `FindingType`, and any active pure helper types currently exported from `src/lib/drillDown.ts` (and imported by `src/lib/accessControl.ts` and `src/lib/auditExecution.ts`) into `src/lib/auditDomain.ts`, updating those imports cleanly.
2. Delete `src/views/drillDownView.ts` (1,110 lines) and remove dead `drilldown` imports, state branches, and event handlers in `src/main.ts` and `src/views/certificacionView.ts`.
3. Wire row clicks in `Certificado > Procesos` → `Proceso` Detail View, `Sitio > Turnos` → `Turno` Detail View, and `Programación > Procesos y Turnos` → `Proceso`/`Turno` Detail View.

---

## 3. Implementation Checklist

- [ ] Create `src/lib/procesoDomain.ts` and `src/views/procesoView.ts` (`Proceso` 3-Zone Detail View with LTREE clause mapping, findings, and audit tabs).
- [ ] Create `src/lib/turnoDomain.ts` and `src/views/turnoView.ts` (`Turno` 3-Zone Detail View with overnight duration calculation and reciprocal `Sitio` / `Auditoría` tabs).
- [ ] Wire `selectedProcesoId` and `selectedTurnoId` state, `popToBreadcrumb()` restoration, and row clicks from `Certificado`, `Sitio`, and `Programación` in `src/main.ts`.
- [ ] Move shared `FindingRecord` / `FindingType` types from `src/lib/drillDown.ts` to `src/lib/auditDomain.ts` so `accessControl.ts` and `auditExecution.ts` have zero dependency on `drillDown`.
- [ ] Remove `src/views/drillDownView.ts` and all dead `drilldown` dispatch code from `src/main.ts`.

---

## 4. Acceptance Criteria

1. Clicking a `Proceso` inside `Certificado > Procesos` opens **`Proceso` Detail View** (`Certificación > Certificado > FN-QMS-2024-001 > [Proceso]`) with interactive `LTREE` requirement assignment, findings, and scheduled audits.
2. Clicking a `Turno` inside `Sitio > Turnos` opens **`Turno` Detail View** (`... > Sitio 0 > 07:00 - 15:00`) with accurate duration calculation (including overnight shifts) and clickable `Sedes Operativas` drill-down.
3. `src/views/drillDownView.ts` is cleanly retired with zero broken TypeScript imports across `src/lib/*` and `src/views/*`.
4. Zero raw UUIDs appear in `procesoView.ts`, `turnoView.ts`, or breadcrumb labels across the entire `Organización → Certificado → Sitio / Proceso → Turno` hierarchy.

