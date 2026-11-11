# GeoFS-V4.0_Core-Library

![Version](https://img.shields.io/badge/Version-v0.1.0-3b82f6?style=flat-square)

The first experimental foundation for the GeoFS-V4.0 ecosystem. It waits for a GeoFS 4 aircraft, exposes a shared initialization API, and provides temporary notification banners. It does not modify aircraft controls or flight physics.

## Installation

Install the userscript with a userscript manager, then reload GeoFS 4.0 Beta. This early release targets the beta and the main GeoFS site, and activates only when GeoFS reports major version 4. It is not a replacement for the V3.9 Core Library.

## API

`window.GeoFSV4Core` exposes `version`, `state`, `simulatorVersion`, `onReady(callback)`, `initialize(name, callback)`, and `notify(message, level)`. Initialization is deduplicated by module name; errors are reported and propagated. Startup waits up to 60 seconds. This API is experimental and may change before 1.0.

## Validation

Run `node --check core-library_standalone.user.js` and `node --test tests/*.test.js`. Live validation on the GeoFS beta is still required.

## License

[MIT](license) · © 2026 AMFI-Disable
