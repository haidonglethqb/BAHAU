# 🏛️ SYSTEM UI/UX PRO-MAX SPECIFICATION: BAHAU (DAU HRMS)
**Role for AI Agent:** Senior Principal UI/UX Designer & Design Systems Architect (Figma Specialist)  
**System:** BAHAU — Smart Human Resource Management System for Da Nang Architecture University (Trường Đại học Kiến trúc Đà Nẵng - DAU)  
**Framework Target:** Next.js 15 App Router, React 19, Tailwind CSS, shadcn/ui, Lucide Icons
---
## 📐 1. DESIGN INTELLIGENCE & STYLE SYNTHESIS (UI/UX PRO-MAX RULES)
### A. Style Archetype & Aesthetics
- **Primary Style:** `Minimalism & Swiss Style` (Clean, grid-based, functional, high contrast, sans-serif, essential elements only).
- **Secondary Pattern:** `Data-Dense Dashboard` (Space-efficient, compact table rows, KPI metric cards, high information density without clutter) combined with `Trust & Authority` (Professional academic prestige).
- **Anti-Patterns Strictly Banned:**
  - ❌ **NO AI purple/pink gradients** or playful bubbly elements (Not an entertainment app).
  - ❌ **NO emojis as UI icons** (Strictly use standard SVG icons: Lucide or Heroicons).
  - ❌ **NO scale transforms that shift layout on hover** (Use subtle color/opacity transitions only).
  - ❌ **NO low-contrast text** (Ensure minimum contrast ratio of 4.5:1 for body text, 7:1 for headers - WCAG AA/AAA).
### B. Color Token System (Academic Architectural Palette)
- **Primary Brand (DAU Heritage Blue):**
  - Default: `#004B87` (Da Nang Architecture University deep royal blue)
  - Hover / Dark: `#003865` | Active / Pressed: `#002747`
  - Subtle Surface Tint: `#F0F6FB` | Border Tint: `#BAE6FD`
- **Secondary / Accent (Architectural Terracotta & Ochre):**
  - Default: `#D97706` (Gạch ngói / Kiến trúc / Vật liệu xây dựng)
  - Light Accent: `#FEF3C7` | Text Accent: `#92400E`
- **Neutral Surface Palette:**
  - Canvas / Page Background: `#F8FAFC` (Slate 50)
  - Card & Container Surface: `#FFFFFF` (Pure White)
  - Neutral Borders & Dividers: `#E2E8F0` (Slate 200)
  - Primary Text: `#0F172A` (Slate 900 - High contrast)
  - Muted Text: `#475569` (Slate 600 - Minimum contrast compliant)
- **Semantic Feedback Tokens (with Accessible Background Tints):**
  - Success (Active / Approved): Text `#065F46`, Bg `#ECFDF5`, Border `#A7F3D0`
  - Warning (Pending / In-review): Text `#92400E`, Bg `#FFFBEB`, Border `#FDE68A`
  - Danger (Terminated / Rejected): Text `#991B1B`, Bg `#FEF2F2`, Border `#FECACA`
  - Info (Units / Board): Text `#1E40AF`, Bg `#EFF6FF`, Border `#BFDBFE`
### C. Typography Token System (`Vietnamese Friendly` Pairing)
- **Primary Typeface:** `Be Vietnam Pro` (Google Fonts) with fallback to `Inter` / `system-ui`.
- **Scale Hierarchy:**
  - `Display / Page Title`: 24px - 28px | Weight: 700 (Bold) | Line-height: 1.25
  - `Section / Card Header`: 16px - 18px | Weight: 600 (Semi-bold) | Line-height: 1.35
  - `Body Standard`: 14px | Weight: 400 (Regular) / 500 (Medium) | Line-height: 1.5
  - `Table Cell & Metadata`: 13px | Weight: 400 / 500 | Line-height: 1.4
  - `Badge & Microcopy`: 11px - 12px | Weight: 600 | Monospace for Codes (`DAU260001`)
### D. Grid, Spacing & Micro-interactions
- **Spatial Rhythm:** 8pt grid system (`8px`, `16px`, `24px`, `32px`, `48px`).
- **Corner Radiuses:** Inputs/Buttons: `8px` (`rounded-lg`), Cards/Drawers: `12px` - `16px` (`rounded-xl` / `rounded-2xl`).
- **Elevations (Subtle Depth):** 
  - Flat Card: `border: 1px solid #E2E8F0`, `box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05)`.
  - Hover Card: `box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.07)`, `border-color: #CBD5E1`.
- **Micro-interactions:** Transitions must be crisp: `150ms - 200ms ease-out`.
---
## 🏛️ 2. CORE DOMAIN LOGIC: 3-SPACE WORKSPACE ARCHITECTURE
The UI Shell must clearly visualize and allow seamless switching across **3 Workspaces**:
┌────────────────────────────────────────────────────────────────────────┐ │ TOP GLOBAL HEADER BAR │ │ [DAU Logo] [🏛️ Unit Selector: Khoa Kiến trúc ▼] [Search] [🔔] [Avatar]│ ├─────────────────┬──────────────────────────────────────────────────────┤ │ LEFT SIDEBAR │ MAIN CONTENT AREA │ │ │ │ │ 1. CÁ NHÂN │ [Workspace Content Changes Contextually] │ │ - Hồ sơ & CV │ │ │ - Đơn từ của tôi│ │ │ - Sổ phép 2026 │ │ │ │ │ │ 2. QUẢN LÝ ĐƠN VỊ│ │ │ - Hộp thư duyệt │ │ │ - Nhân sự Khoa │ │ │ │ │ │ 3. NHÀ TRƯỜNG │ │ │ - Cây tổ chức │ │ │ - Danh bạ CBGV │ │ │ - Hợp đồng LĐ │ │ └─────────────────┴──────────────────────────────────────────────────────┘



1. **Space 1: Personal Workspace (Không gian Cá nhân - 100% Cán bộ Giảng viên)**
   - Self-service: Xem thông tin lý lịch, nộp đơn xin nghỉ phép / công tác, kiểm tra hạn mức số dư phép cá nhân.
2. **Space 2: Unit Management Workspace (Không gian Quản lý Đơn vị - Trưởng khoa / Trưởng bộ môn)**
   - Approval Inbox: Phê duyệt đơn cấp dưới.
   - **Crucial Rule: Anti-Self-Approval:** Trưởng đơn vị không thể tự duyệt đơn của mình. Giao diện phải có banner thông báo trạng thái: *"Đơn đã được tự động chuyển tiếp lên Ban Giám hiệu phê duyệt"*.
   - **Concurrent Role Switcher (Bộ chuyển đổi kiêm nhiệm):** Dropdown trên Header cho phép Giảng viên quản lý chuyển đổi ngữ cảnh nếu đang kiêm nhiệm nhiều đơn vị (ví dụ: Trưởng khoa Kiến trúc kiêm Trưởng bộ môn Quy hoạch).
3. **Space 3: HR & Executive Workspace (Không gian Nhân sự & Ban Giám hiệu)**
   - Điều hành toàn trường: Sơ đồ cây phân cấp toàn trường, Danh bạ nhân sự toàn diện, Quản lý vòng đời hợp đồng, Sổ cái ngày phép tập trung.
---
## 🖥️ 3. DETAILED SPECIFICATION FOR 6 CORE SCREENS
### Screen 1: Split-Screen Academic Portal (`/login`)
- **Left Column (45%):** Deep DAU Blue (`#004B87`) with architectural isometric line-art of the DAU campus building, university motto: *"Sáng tạo - Trách nhiệm - Nhân văn"*, and subtle geometric grid watermark.
- **Right Column (55%):** Centered floating card:
  - DAU Emblem badge (Deep Blue + Ochre gold).
  - System title: **BAHAU** (Hệ thống Quản trị Nhân sự Thông minh).
  - Form: Email công tác (`@dau.edu.vn`), Mật khẩu, Remember me checkbox, "Đăng nhập" button (Full width, `#004B87`).
  - **Demo Fast-Role Switcher:** Bottom pill buttons for instant one-click testing:
    `[Giảng viên (CBGV)]` `[Trưởng khoa (Khoa KT)]` `[Phòng TCHC]` `[Hiệu trưởng]` `[Admin]`.
### Screen 2: Global App Shell (Navigation & Header)
- **Top Header Bar (Height: 64px, White Surface, Border-b Slate 200):**
  - Brand identity with DAU Logo and academic year indicator (`2025-2026`).
  - **Unit Context Switcher:** Dropdown menu displaying current active scope: `[🏛️ Khoa Kiến trúc (Trưởng khoa) ▾]`.
  - Global Command Palette (`Cmd + K` search bar).
  - Notification Popover with badge count (red dot for urgent approvals).
  - User Avatar with Academic Credentials (`PGS.TS. Trần Thị Bình`).
- **Sidebar (Width: 260px, Slate 50 / Slate 900 variant):**
  - Grouped sections clearly labeled: `CÁ NHÂN`, `QUẢN LÝ ĐƠN VỊ`, `QUẢN TRỊ NHÀ TRƯỜNG`.
  - Active item: Inset background (`bg-blue-50`), bold text (`text-blue-900`), left border indicator (`border-l-4 border-blue-900`).
  - Footer: System health indicator badge (`🟢 API 4000: Online | PostgreSQL 17: Connected`).
### Screen 3: Interactive Organizational Tree (`/units`)
- **Layout:** Canvas/Tree diagram with Zoom & Center controls, or Expandable Nested Card Tree.
- **Node Component Design:**
  - Card Dimensions: `280px x 100px`, White background, rounded-xl, 1px border.
  - Level-based Color Badges:
    - `Ban Giám hiệu` ➔ Purple Badge (`#6B21A8`)
    - `Khoa Đào tạo` ➔ Heritage Blue Badge (`#004B87`)
    - `Phòng Chức năng` ➔ Amber Badge (`#D97706`)
    - `Bộ môn trực thuộc` ➔ Emerald Badge (`#059669`)
    - `Viện / Trung tâm` ➔ Slate Badge (`#475569`)
  - Content: Unit Code (`KT`, `XD`, `CNTT`), Unit Name, Manager Avatar & Title (`TS. Phạm Văn Dũng`), Total Staff Count badge (`32 CBGV`).
  - Interactions: Expand/Collapse child nodes with indicator pills (`+ 4 bộ môn`).
### Screen 4: Personnel Directory & Dossier Drawer (`/employees`)
- **Data Table Filter Bar:** Search input, Faculty dropdown, Academic Degree (`Tiến sĩ`, `Thạc sĩ`, `Kỹ sư`), Academic Title (`Phó Giáo sư`, `Giáo sư`), Status pill filters.
- **High-Density Table Rows:**
  - Col 1: Mã CBGV (`DAU260002` - font-mono, slate-700).
  - Col 2: Họ và tên (Avatar + Full Name + Degree badge).
  - Col 3: Đơn vị chính & Chức vụ (Ví dụ: `Khoa Kiến trúc` - `Trưởng khoa`).
  - Col 4: Chức vụ Kiêm nhiệm (Yellow Tag: `Kiêm Trưởng BM Kiến trúc công trình`).
  - Col 5: Email công tác & Số điện thoại.
  - Col 6: Trạng thái (`Đang công tác` - green dot).
  - Col 7: Action: "Xem hồ sơ" (Button with right arrow icon).
- **Slide-Over Profile Drawer (Width: 540px):**
  - Header: Big Avatar, Full Name, Title, Official Stamp icon.
  - Tab 1: Sơ yếu lý lịch & Liên hệ (Địa chỉ, SĐT, Email).
  - Tab 2: Lịch sử bổ nhiệm & Kiêm nhiệm (Vertical timeline with promotion decisions).
  - Tab 3: Hợp đồng lao động (Hợp đồng không xác định thời hạn, hệ số lương).
  - Tab 4: Sổ phép & Đơn từ gần đây.
### Screen 5: Leave Ledger & Quota Tracker (`/leave`)
- **Metric Cards Row (4 Cards):**
  1. `Số dư phép năm`: **10.5 / 12** ngày (Large bold typography, mini progress bar).
  2. `Phép chuyển năm trước`: **2.0** ngày (Expiring on 31/03 warning tag).
  3. `Đã sử dụng`: **1.5** ngày.
  4. `Đơn đang chờ duyệt`: **1** đơn (Amber alert badge).
- **CTA:** Primary button: `[+ Tạo đơn xin nghỉ phép]` & `[+ Đăng ký công tác]`.
- **Leave Request Modal / Form:**
  - Select Type: Nghỉ phép năm, Nghỉ việc riêng, Nghỉ ốm/thai sản, Đi công tác chuyên môn.
  - Date Range Picker (supports 0.5 half-day increments).
  - Nominate Substitute Lecturer (Người dạy thay / bàn giao công tác - searchable dropdown of colleagues in the same unit).
  - Attached proofs / files upload dropzone.
- **Workflow Status Stepper (Visual Progress):**
  `Đã nộp đơn` ──▶ `Trưởng khoa duyệt` ──▶ `Phòng TCHC xác nhận` ──▶ `Hoàn thành`.
### Screen 6: Academic Leadership Approval Inbox (`/workflow/pending`)
- **List / Card Queue for Approvers:**
  - Badge: "Chờ bạn phê duyệt" (`1 bước cần xử lý`).
  - Details Card: Requester name, position, leave dates, reason, substitute lecturer consent status.
  - Conflict Check Alert: *"Không có trùng lịch giảng dạy đã báo"* (Green check icon).
  - **Action Bar:**
    - Button `Phê duyệt` (Solid Emerald Green, `#059669`, with checkmark icon).
    - Button `Từ chối` (Outline Red, `#DC2626`, opens mandatory reason dialog).
    - Button `Yêu cầu bổ sung` (Outline Amber).
---
## 📋 4. PRE-DELIVERY DESIGN AUDIT CHECKLIST (FOR FIGMA AGENT)
Before finalizing the Figma file, ensure 100% compliance with these UI/UX Pro-Max criteria:
- [ ] **Auto-Layout Everywhere:** All frames, cards, buttons, lists must use responsive Figma Auto-Layout.
- [ ] **Color Contrast Verification:** All normal text passes 4.5:1, all large text passes 3:1 against backgrounds.
- [ ] **No Emoji Icons:** All icons are clean vector SVGs from Lucide icon family with consistent 20px / 24px bounding boxes.
- [ ] **Focus & Interactive States:** Every button and input has defined Default, Hover, Focused (2px ring), and Disabled states.
- [ ] **Touch Target Safety:** Every clickable element or action icon is padded to a minimum of `44x44px`.
- [ ] **Vietnamese Diacritics Fit:** Text boxes have adequate line-height (`1.4 - 1.5`) so accents on uppercase letters (e.g. `Đ`, `Ệ`, `Ứ`, `Ờ`) do not get clipped.
- [ ] **Responsive Frames:** Provide screens at Desktop (`1440px`), Tablet (`1024px`), and Mobile (`375px`).