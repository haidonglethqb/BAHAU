## 2026-09-16T14:11:17Z

Your identity: spec_miner_survey_1
Your working directory: c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\spec_miner_survey_1
You MUST read the authoritative user request at: c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\ORIGINAL_REQUEST.md before starting work.

Your task:
Thoroughly inspect and document all specifications, domain models, and technical requirements for Requirement R1: Gói Cơ sở Dữ liệu (@bahau/database).
Authoritative sources to inspect:
- c:\Users\HaiChu\Documents\GitHub\BAHAU\docs\architecture\domain-model.md
- c:\Users\HaiChu\Documents\GitHub\BAHAU\docs\architecture\system-overview.md
- c:\Users\HaiChu\Documents\GitHub\BAHAU\docs\requirements\rbac-matrix.md
- c:\Users\HaiChu\Documents\GitHub\BAHAU\docs\requirements\module-01-core-hr-prd.md
- Existing packages/database files, package.json, prisma/schema.prisma (if present or needed), dependencies.

Required outputs in c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\spec_miner_survey_1\handoff.md:
1. Complete list of all entities/models required for Module 1 (Core HR):
   - User, Session, Role, Permission, RoleAssignment, OrganizationalUnit, Position, Employee, EmploymentAssignment, EmploymentContract, EmploymentEvent, OutboxEvent, AuditEvent.
   - Field names, types, relations, unique constraints, and enums per domain-model.md.
2. Seed Data specification:
   - Structure of Trường Đại học Kiến trúc Đà Nẵng (Ban Giám hiệu, Khoa Kiến trúc, Khoa Xây dựng, các Bộ môn, Phòng Tổ chức - Hành chính, Phòng Đào tạo).
   - The 5 sample role accounts (Super Admin, HR Manager, Unit Head / Trưởng đơn vị, HR Specialist / Chuyên viên, Employee / Giảng viên/Nhân viên) with credentials & password hashing specifications.
3. Package structure, singleton PrismaClient export, and scripts (db:generate, db:seed, db:migrate / db:push).
4. Any potential risks, missing dependencies, or constraints.

Write your complete findings and handoff report to:
c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\spec_miner_survey_1\handoff.md
Update progress.md with your liveness and completion.
When complete, send a message to your parent with the handoff path.
