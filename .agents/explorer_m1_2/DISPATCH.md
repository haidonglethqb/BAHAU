## 2026-09-16T14:15:39Z

Investigate and provide the exact, production-ready Seed Data script (`packages/database/prisma/seed.ts`) for Milestone 1 (@bahau/database).
1. Seed data must reflect Trường Đại học Kiến trúc Đà Nẵng:
   - Ban Giám hiệu (BOARD)
   - Khoa Kiến trúc (FACULTY) and 3 Bộ môn (BM_KTCT, BM_LLLS, BM_KTNT)
   - Khoa Xây dựng (FACULTY) and 2 Bộ môn (BM_DDCN, BM_KCVL)
   - Phòng Tổ chức - Hành chính (DEPARTMENT)
   - Phòng Đào tạo (DEPARTMENT)
2. Positions: Leadership positions and academic/administrative titles.
3. The 5 sample role accounts:
   - Super Admin: admin@dau.edu.vn (ROLE_SYSADMIN)
   - HR Manager: hrmanager@dau.edu.vn (ROLE_HR_OFFICER, scopeUnitId: null)
   - Unit Head: unithead@dau.edu.vn (ROLE_UNIT_HEAD, scopeUnitId: Khoa Kiến trúc)
   - HR Specialist: hrspecialist@dau.edu.vn (ROLE_HR_OFFICER, scopeUnitId: null)
   - Employee: employee@dau.edu.vn (ROLE_EMPLOYEE)
4. Secure password hashing: Dev password "Admin@123456" hashed with Argon2id. Avoid Windows node-gyp compilation failures by using `@node-rs/argon2` and/or fallbacks.
5. Careful order of insertion to handle circular FKs (Units created first, then Employees, then managerEmployeeId updated).

Write your recommendation and full seed script implementation blueprint to:
c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\explorer_m1_2\handoff.md
Update progress.md with your liveness.
When complete, send a message to your parent with the handoff path.
