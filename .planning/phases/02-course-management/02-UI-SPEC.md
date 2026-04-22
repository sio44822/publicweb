---
phase: 2
slug: course-management
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-23
---

# Phase 2 — UI Design Contract

> Visual and interaction contract for Course Management phase. Generated from existing UI patterns and CONTEXT.md decisions.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | Tailwind CSS (CDN) |
| Preset | not applicable |
| Component library | none (custom EJS components) |
| Icon library | none (emoji-based) |
| Font | System fonts: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif |

---

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps |
| sm | 8px | Compact element spacing |
| md | 16px | Default element spacing |
| lg | 24px | Section padding |
| xl | 32px | Layout gaps |
| 2xl | 48px | Major section breaks |
| 3xl | 64px | Page-level spacing |

Exceptions: 12px (slot card padding on mobile)

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.5 |
| Label | 12px | 700 | 1 |
| Heading | 24px | 800 | 1.2 |
| Display | 48px | 900 | 1.1 |

Note: Uppercase labels use `tracking-widest` (0.2em letter-spacing)

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#f8fafc` (slate-50) | Page background |
| Secondary (30%) | `#ffffff` (white) | Cards, modals, panels |
| Accent (10%) | `#2563eb` (blue-600) | Primary actions, links |
| Destructive | `#dc2626` (red-600) | Errors, destructive actions |
| Success | `#16a34a` (green-600) | Confirmations, enabled states |

Accent reserved for: Primary buttons (bg-blue-600), active links, focus states

---

## Color Palette (Existing)

| Name | Hex | Usage |
|------|-----|-------|
| slate-50 | #f8fafc | Page background |
| white | #ffffff | Cards, panels |
| blue-600 | #2563eb | Primary CTA |
| blue-700 | #2563eb hover | Button hover |
| gray-50 | #f9fafb | Input backgrounds |
| gray-100 | #f3f4f6 | Borders, disabled states |
| gray-400 | #9ca3af | Placeholder, secondary text |
| gray-600 | #4b5563 | Secondary text |
| gray-800 | #1f2937 | Primary text |
| green-100 | #dcfce7 | Enabled badge background |
| green-700 | #15803d | Enabled badge text |
| red-500 | #ef4444 | Error text |
| red-600 | #dc2626 | Error background |

---

## Component Inventory

| Component | Appearance | States |
|-----------|-------------|--------|
| Card | bg-white rounded-2xl border border-gray-100 shadow-sm | default, hover (shadow-md) |
| Button Primary | bg-blue-600 text-white font-bold py-3 rounded-xl | default, hover, disabled (slate-400) |
| Button Secondary | bg-gray-200 text-gray-600 | default, hover |
| Input | px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl | default, focus (border-blue-300) |
| Toggle | w-12 h-6 rounded-full bg-blue-500/gray-200 | enabled, disabled |
| Toast | fixed top-4 px-6 py-3 rounded-xl shadow-xl | success (green-600), error (red-600) |
| Modal | fixed inset-0 bg-black/50 | visible, hidden |
| Fade-in | animation 0.5s cubic-bezier(0.16, 1, 0.3, 1) | - |

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | 確認預約 |
| Empty state heading | 目前沒有可用的服務 |
| Empty state body | 請稍後再試 |
| Error state | ⚠️ 請填寫資料 / 🎯 請選擇課程 |
| Destructive confirmation | N/A (無刪除確認) |

---

## Interaction Patterns

### Loading State
- Slot cards show loading overlay: `pointer-events: none; opacity: 0.5; filter: grayscale(0.5)`
- Sync status badge: pulsing amber indicator

### Form Validation
- Inline validation on blur
- Error messages appear below inputs in red

### Submit Flow
1. Button shows "傳送預約中..."
2. Success: hide form, show success section
3. Error: show toast, re-enable button

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| none | none | not required |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PENDING
- [ ] Dimension 2 Visuals: PENDING
- [ ] Dimension 3 Color: PENDING
- [ ] Dimension 4 Typography: PENDING
- [ ] Dimension 5 Spacing: PENDING
- [ ] Dimension 6 Registry Safety: PENDING

**Approval:** pending