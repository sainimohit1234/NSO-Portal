# Changelog

## 2026-06-23

### Added
- Firebase Hosting and Firestore project configuration for the NSO portal.
- Firestore-backed authentication flow with password login, email link sign-in, password reset, and admin-gated user registration approval.
- Redshift-to-Firestore store sync utilities and startup sync support.
- Shared frontend Firestore store service and API response normalization helpers.
- User registrations admin page and updated favicon/background assets.

### Changed
- Refreshed the full frontend theme with a denser, more responsive enterprise dashboard layout.
- Updated login UX, fixed email domain handling, and removed Firebase branding from end-user copy.
- Moved store-heavy dashboard and operational pages to read from Firestore with API fallback.
- Tightened layout scaling, sidebar density, and dashboard card hierarchy for laptop and tablet screens.

### Fixed
- Dashboard zero-count issue caused by store reads racing auth state readiness.
- Approval page data loading conflicts after remote sync.
- Local admin seed password handling and Redshift sync startup integration.
