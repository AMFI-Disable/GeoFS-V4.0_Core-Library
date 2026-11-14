# GeoFS-V4.0_Core-Library

![Version](https://img.shields.io/badge/Version-v1.0.1-3b82f6?style=flat-square)

Provides shared initialization, notification, HUD, and utility functions for the GeoFS-V4.0 scripts.

## Features

- The **GeoFS-V4.0_Ecosystem** startup panel lists detected add-ons and reported initialization failures. After startup it closes automatically if no failure is reported; select × to dismiss it. Runtime messages appear as separate temporary banners.
- Add-ons that are not detected may be uninstalled, disabled, still loading, or unable to start.
- Provides the shared HUD tabs and initialization error handling used by other scripts.

## Installation

1. Install a userscript manager such as [Tampermonkey](https://www.tampermonkey.net/).
2. Install or update the script from [Greasy Fork](https://greasyfork.org/en/scripts/604885).
3. Open or reload GeoFS V4.0. The script starts automatically.

The script activates only when GeoFS reports a supported version 4 release (including 4.x releases). It waits for the version to become available and remains inactive on other versions. This library has no ecosystem dependencies.

A script listed as not detected may be uninstalled, disabled, or still loading.

## License

[MIT](license) · © 2026 AMFI-Disable · [GeoFS-V4.0 Ecosystem](https://sites.google.com/view/geofs-v40-ecosystem/home)

## Educational And Fair-Play Disclaimer

> [!CAUTION]
> This script is provided for educational, research, and testing use in authorized environments. Follow GeoFS rules and applicable platform terms.
