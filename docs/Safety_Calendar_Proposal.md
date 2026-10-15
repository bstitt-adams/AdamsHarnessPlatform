# Safety Calendar — System Design & Implementation Proposal

**Prepared for:** Adams Electric — Safety Office Calendar Program
**Date:** July 30, 2026
**Status:** Design Complete / Staging & Production Rollout Pending

---

## 1. Executive Summary

The Safety Calendar is a bilingual (English/Spanish), site-specific calendar system built to be displayed on TVs in job-site safety offices and managed centrally by the core team (Jeff, Clay, BettyJean). It replaces manual whiteboards/printouts with a live, PIN-protected, auto-rotating display that shows daily and weekly safety events, deliveries, meetings, and toolbox talks — in both English and Spanish.

The core system (data model, admin console, public display, and bilingual translation pipeline) is **built and functional**. What remains is **staging validation** with real site/project data and **production rollout**, including chat-based calendar updates via Telegram and Microsoft Teams.

---

## 2. System Design (As Built)

### 2.1 Architecture Overview

```
┌─────────────────┐      ┌──────────────────────┐      ┌────────────────────┐
│  Calendar Admin  │ ───► │   Firebase Firestore  │ ◄─── │  Public TV Display  │
│ /calendar-admin  │      │  siteCalendars         │      │ /site-calendar/[slug]│
│ (Jeff/Clay/BJ)   │      │  siteCalendarItems     │      │ (PIN-gated, TV/tablet)│
└─────────────────┘      └──────────────────────┘      └────────────────────┘
        ▲                                                        │
        │                                                        ▼
        │                                              Auto-rotating Day / Agenda
        │                                              views, bilingual EN/ES
        │
┌───────┴────────────────────────────────────────────┐
│   Chat Integrations (Telegram / MS Teams webhooks)   │
│   — existing bot infra, calendar commands pending    │
└──────────────────────────────────────────────────────┘
```

### 2.2 Data Model (`lib/schema.ts`)

**`SiteCalendarDoc`** — one document per job site
| Field | Type | Purpose |
|---|---|---|
| `name`, `slug` | string | Site display name and URL path (`/site-calendar/{slug}`) |
| `pin` | string | 4-digit PIN gating access to that site's display |
| `logoUrl`, `primaryColor` | string | Branding per site |
| `defaultLayout` | enum | Display layout preference |
| `isActive` | boolean | Enable/disable a site without deleting it |

**`SiteCalendarItemDoc`** — one document per calendar entry
| Field | Type | Purpose |
|---|---|---|
| `siteId` | string | Links item to a site |
| `title` / `titleEs` | string | English / Spanish event title |
| `description` / `descriptionEs` | string | English / Spanish details |
| `date`, `time` | Timestamp / string | Scheduling |
| `location`, `assignee` | string | Optional metadata |
| `order` | number | Sort order within a day |

### 2.3 Admin Console (`app/calendar-admin`)

- Firebase-authenticated (with an environment-gated bypass login for internal testing).
- Site picker (left panel) + per-site item management (right panel).
- **Add Calendar Item** form with English and Spanish title/description fields.
- **Inline editing** of any existing item's title, Spanish title, description, Spanish description, and time — saved directly to Firestore via `updateDoc`.
- Add New Site form for onboarding additional job sites with their own PIN.

### 2.4 Public Display (`app/site-calendar/[slug]`)

- **PIN gate** (shared `PasswordGate` component) protects each site's calendar before any data loads.
- **Two auto-rotating views** (10-second interval, Framer Motion transitions):
  - **Day View** — mini monthly calendar + selected day's entries.
  - **Agenda View** — full weekly list of entries grouped by day.
- **Bilingual rendering** via the shared `BilingualText` component and per-item `titleEs`/`descriptionEs` fields — Spanish always displayed directly beneath the English text.
- **Fallback translation dictionary** (`components/site-calendars/calendar-translations.ts`) auto-supplies Spanish text for common recurring entry types (Safety Stand-Down, Fall Protection Delivery, Foreman Meeting, Tool Box Talk, Site Inspection) if a Spanish field is left blank in Firestore.

### 2.5 Site Chooser / Landing Page

- Bilingual site-selection screen (`components/site-calendars/display/site-chooser.tsx`) listing all active sites as cards; selecting a site prompts for its PIN before navigating to that site's display.

### 2.6 Chat/Notification Infrastructure (Existing, Reusable)

The platform already has a working **Telegram** and **Microsoft Teams** bot framework (`lib/mail/telegram-bot.ts`, `lib/mail/teams-bot.ts`, `app/api/telegram/webhook`, `app/api/teams/webhook`) used today for email commands. It includes:
- Per-user chat channel linking (`UserChatChannelDoc` / `userChatChannels` collection) via `/start <user-id>`.
- Signed webhook verification for Telegram.
- A command handler pattern (`lib/mail/command-handler.ts`) that can be extended with calendar-specific commands (e.g., `/addevent`, `/today`, `/site conover-nc`).

This infrastructure is the foundation for the "chat-based calendar update" requirement below — it needs new calendar-specific commands, not a new bot platform.

---

## 3. Remaining Work to Complete the Design

### 3.1 Staging

| # | Item | Description | Owner | Effort |
|---|---|---|---|---|
| A | **Load current sites & project details** | Create/import real `SiteCalendarDoc` records for all active job sites (replace demo seed data) with correct names, slugs, PINs, and branding. | Admin/PM | 0.5 day |
| B | **Confirm Spanish translation accuracy** | Native-speaker review of the fallback translation dictionary and all seeded/backfilled item translations; correct terminology for trade-specific safety terms. | BettyJean / bilingual reviewer | 0.5–1 day |
| C | **Setup Telegram accounts** | Create/link Telegram accounts for Clay, Jeff, and BettyJean using the existing `/start <user-id>` linking flow; verify each receives a linked confirmation. | Jeff/Clay/BJ + Admin | 0.5 day |
| D | **Multi-site CRUD test** | All three core team members create, edit, and delete calendar items across multiple sites concurrently to confirm no permission or data-collision issues in the admin console. | Jeff/Clay/BJ | 0.5 day |
| E | **Test MS Teams chat access** | Register the Azure Bot (messaging endpoint already exists at `/api/teams/webhook`), link Jeff, Clay, and BettyJean's Teams accounts, and validate round-trip messaging. | Admin + IT | 1 day (incl. Azure Bot registration) |
| F | **Identify TV display method** | Decide and validate the hardware/software approach for displaying `/site-calendar/[slug]` on safety-office TVs (e.g., dedicated mini-PC/Chromebox in kiosk browser mode, Smart TV browser app, or a device like Fire TV/Amazon Fire Stick running a kiosk browser). Confirm auto-refresh, no-sleep, and PIN pre-entry behavior. | IT/Field Ops | 1 day |
| G | **Mobile access test** | Verify the PIN gate, site chooser, and calendar display render correctly and are usable on iOS/Android phone browsers (touch targets, PIN entry, orientation). | QA | 0.5 day |

**Staging subtotal: ~4–4.5 days**

### 3.2 Production

| # | Item | Description | Owner | Effort |
|---|---|---|---|---|
| A | **Go live on TVs** | Deploy the chosen kiosk configuration (from Staging-F) to each job-site TV; set each device to auto-load its site's PIN-gated URL and auto-rotate day/agenda views. | IT/Field Ops | 1–2 days (site rollout, depends on # of sites) |
| B | **Go live with MS Teams calendar chat updates** | Extend `command-handler.ts` with calendar-specific commands (e.g., `/addevent <site> <date> <title>`, `/today <site>`) so Jeff/Clay/BettyJean can add or query calendar entries directly from Teams; wire responses to write to `siteCalendarItems` in Firestore. | Dev | 1–2 days |

**Production subtotal: ~2–4 days**

---

## 4. New Development Required (Not Yet Built)

The following pieces are **not currently implemented** and are required to satisfy items C/E (Production-B) fully:

1. **Calendar-aware chat commands** — today's Telegram/Teams command handler only supports email-related commands (`/summary`, `/search`, `/send`). New commands must be added to:
   - Create a calendar item on a given site/date from a chat message.
   - List today's/this week's events for a site.
   - (Optional) Delete or edit an item via chat.
2. **Azure Bot Registration for Teams** — the webhook endpoint exists, but an Azure Bot resource must be registered and connected to Jeff/Clay/BettyJean's Teams tenant (Staging-E).
3. **TV Kiosk Deployment Runbook** — a short operational doc/script for provisioning each site's display device once the hardware approach is chosen (Staging-F).

---

## 5. Testing & Verification Plan

- **Functional:** Add/edit/delete calendar items from admin console and confirm they appear correctly (EN + ES) on the public display within seconds (Firestore `onSnapshot` real-time sync).
- **Bilingual accuracy:** Native-speaker sign-off on all seeded and fallback translations (Staging-B).
- **Multi-user concurrency:** Simultaneous edits from Jeff, Clay, and BettyJean across different sites produce no data loss or overwrite conflicts (Staging-D).
- **Chat integration:** `/start <user-id>` linking succeeds for all three team members on both Telegram and Teams; test messages round-trip successfully (Staging-C, E).
- **Device/display:** TV kiosk stays on the correct site's calendar indefinitely, survives reboot/power cycle, and auto-rotates views (Staging-F, Production-A).
- **Mobile:** PIN entry and calendar views are usable on a phone browser without layout issues (Staging-G).
- **Regression:** `npx tsc --noEmit` passes with no TypeScript errors after any code changes.

---

## 6. Estimated Timeline Summary

| Phase | Effort | Notes |
|---|---|---|
| Staging (A–G) | ~4–4.5 days | Can run partially in parallel (e.g., translation review while Telegram setup happens) |
| New dev for chat commands & Azure Bot | ~1–2 days | Overlaps with Staging E |
| Production rollout (A–B) | ~2–4 days | TV rollout time scales with number of physical sites |
| **Total** | **~7–10 business days** | Assuming core team availability for testing (Staging C–E, G) |

---

## 7. Open Decisions Needed From Stakeholders

1. **TV hardware standard** — which device (Fire Stick, Chromebox, Smart TV browser, dedicated mini-PC) will be standardized across all safety offices? (Blocks Staging-F and Production-A.)
2. **Chat command scope** — should Teams/Telegram be read-only (query today's events) or full read/write (add/edit/delete events from chat)? (Affects Production-B effort.)
3. **Number of sites for initial go-live** — confirms Production-A rollout effort and hardware procurement quantity.
