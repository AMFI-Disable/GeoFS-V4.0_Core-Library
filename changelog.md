# Changelog

All notable changes, features, and architectural capabilities of this project are documented in this file.

---

## [Unreleased]

### Changed

- **Version 1.0.0 Release Preparation**: Promoted the standalone script to version 1.0.0, updated userscript metadata and notification banners to v1.0.0, and aligned documentation, version badges, and fair-play disclaimers with the GeoFS V4.0 ecosystem.

---

## [1.0.1] - Compatibility And Documentation

### Changed

- Show detected add-ons and reported initialization failures in startup status.
- Align the core version guard with standalone V4 version checks.
- Align shared userscript metadata with the other standalone scripts.
- Correct the documented GeoFS version compatibility.
- Add concise localized metadata for the supported locales.

---

## [1.0.0] - GeoFS V4.0 Release

### Changed

- Promote the existing GeoFS V4.0 standalone script to version 1.0.0.
- Align the release documentation and userscript metadata with the V4.0 ecosystem.

---

## [0.3.2] - V4 Integration Update

- Provides a shared aircraft profile resolver with dynamic estimates for unregistered aircraft.
- Correct gear and airbrake flags in dynamically resolved profiles.
- Live GeoFS V4 validation is pending.

## [0.3.1] - V4 Compatibility Fixes

- Corrects several GeoFS V4 aircraft IDs and removes unverified mappings; remaining aircraft specifications are provisional.

## [0.3.0] - V3.9 Foundation Compatibility

- Restores the V3.9 startup status, notifications, shared HUD helpers, and aircraft registry under the V4 readiness framework. Aircraft registry data is inherited from V3.9 and has not been validated against every V4 aircraft.

## [0.2.0] - Shared Utilities

### Added

- Namespaced storage, a clamp helper, and aircraft-change monitoring.

## [0.1.0] - Experimental Foundation

### Added

- GeoFS 4 startup detection and version guard.
- Shared, deduplicated module initialization and temporary notification banners.
- Beta and main GeoFS userscript matches.
