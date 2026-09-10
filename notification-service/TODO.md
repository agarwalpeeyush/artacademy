# notification-service — Deferred Work

The notification bell/inbox, read tracking, and announcement broadcast (with per-teacher
permission) are implemented. The items below were intentionally deferred and should be
picked up later. **Do not conflate this file with the repository-root `TODO.md`.**

## 1. PWA configuration (frontend)
- Add `manifest.json` and a service worker to the React app (`frontend-react`).
- Enables "Add to Home Screen" on mobile browsers and offline shell caching.
- CRA (`react-scripts`) ships a service-worker template via `serviceWorkerRegistration`;
  wire it up in `src/index.tsx` and provide app icons.

## 2. Real notification channels + provider integration
- **SMS**: integrate a provider (e.g. Twilio); currently SMS-only notifications are
  marked `SENT` without actually being delivered (`NotificationService.sendNotification`).
- **WhatsApp**: send capability via a provider.
- **Push / in-browser**: Firebase FCM or Web Push for browser notifications.

## 3. Principal channel configuration
- A Principal-facing settings UI to configure which channels (email/SMS/WhatsApp/push)
  are enabled per notification category.
- Persist channel preferences server-side and honor them in `NotificationEventConsumer`
  and `AnnouncementService`.

## 4. Announcement email delivery
- Announcements are currently **inbox-only** (`AnnouncementService.broadcast` stores
  notifications with channel `NONE`).
- Once channel configuration exists, optionally also email announcement recipients via
  the existing `JavaMailSender` path.
