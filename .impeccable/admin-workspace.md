# Admin workspace

Mode: Operate. Target: `frontend/src/pages/admin/components/AdminLayout.tsx` and active admin child routes in `App.tsx`.

User-approved direction (2026-10-15): tinh gọn, chuyên nghiệp cùng theme PhotoCloud. Preserve warm cream/gold identity and shared dark theme. Photography content should give the workspace character; avoid ornamental charts, fabricated values and inactive controls.

Use a labeled sidebar grouped by work, studio and management. Keep native tables, forms and dialogs familiar. Main task controls have 44px minimum targets, Vietnamese labels, explicit pending/error/empty states and permission checks matching APIs. Mobile uses a modal navigation drawer, while tables scroll within their region.

Overview serves recent work and navigation. Keep real totals compact; remove WebSocket diagnostics from the primary workspace. Existing booking, collections, roles and log tools remain separately loaded and scoped. Their full data/permission testing remains distinct from the new workspace's fixture QA.
