// ==UserScript==
// @name         GeoFS-V4.0_Core-Library
// @namespace    https://greasyfork.org/users/1594049
// @version      1.0.0
// @description  Provides shared initialization, notification, HUD, and utility functions for the GeoFS-V4.0 scripts. © 2026 AMFI-Disable. Part of the GeoFS-V4.0_Ecosystem.
// @author       AMFI-Disable
// @icon         https://www.geo-fs.com/images/icons/favicon.ico
// @match        https://beta.geo-fs.com/geofs.php*
// @match        https://www.geo-fs.com/geofs.php*
// @grant        none
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(() => {
    'use strict';
    const KEY = 'GeoFSV4Core';
    if (window[KEY]) return;
    const api = {
        version: '1.0.0',
        state: 'waiting',
        simulatorVersion: null,
        modules: new Map(),
        onReady(callback) {
            if (typeof callback !== 'function') throw new TypeError('callback must be a function');
            return ready.then(() => callback(api));
        },
        async initialize(name, callback) {
            if (api.modules.has(name)) return api.modules.get(name);
            const task = api.onReady(() => callback(api)).catch(error => {
                console.error(`[GeoFS-V4.0] ${name} failed to initialize`, error);
                api.notify(`${name} failed to initialize. See the console.`, 'error');
                throw error;
            });
            api.modules.set(name, task);
            return task;
        },
        clamp(value, min, max) { return Math.min(max, Math.max(min, value)); },
        storage: {
            get(key, fallback = null) {
                try { const value = localStorage.getItem(`geofs-v4:${key}`); return value === null ? fallback : JSON.parse(value); }
                catch (_) { return fallback; }
            },
            set(key, value) {
                try { localStorage.setItem(`geofs-v4:${key}`, JSON.stringify(value)); return true; }
                catch (_) { return false; }
            }
        },
        watchAircraft(callback, interval = 1000) {
            let previous = window.geofs?.aircraft?.instance;
            const timer = setInterval(() => {
                const current = window.geofs?.aircraft?.instance;
                if (current !== previous) { previous = current; callback(current); }
            }, interval);
            return () => clearInterval(timer);
        },
        notify(message, level = 'info') {
            const host = document.body;
            if (!host) return;
            let region = document.getElementById('geofs-v4-notifications');
            if (!region) {
                region = document.createElement('div');
                region.id = 'geofs-v4-notifications';
                region.setAttribute('aria-live', 'polite');
                Object.assign(region.style, {position:'fixed', top:'12px', right:'12px', zIndex:'2147483647', display:'grid', gap:'8px', maxWidth:'min(360px, 90vw)', pointerEvents:'none'});
                host.appendChild(region);
            }
            const note = document.createElement('div');
            note.textContent = String(message);
            Object.assign(note.style, {padding:'10px 14px', borderRadius:'6px', background: level === 'error' ? '#722c2c' : '#262626', color:'#fff', font:'14px/1.4 sans-serif', boxShadow:'0 2px 8px #0008'});
            region.appendChild(note);
            setTimeout(() => { note.remove(); if (!region.childElementCount) region.remove(); }, 5000);
        }
    };
    window[KEY] = api;
    const ready = new Promise((resolve, reject) => {
        const started = Date.now();
        const check = () => {
            const sim = window.geofs;
            if (sim && sim.version != null) {
                const major = String(sim.version).match(/^\s*(\d+)/);
                if (!major || Number(major[1]) !== 4) {
                    api.state = 'unsupported';
                    reject(new Error(`Unsupported GeoFS version: ${sim.version}`));
                    return;
                }
                api.simulatorVersion = String(sim.version);
                if (sim.aircraft?.instance && document.body) {
                    api.state = 'ready';
                    console.info('[GeoFS-V4.0_Core-Library] Ready on GeoFS', api.simulatorVersion);
                    resolve(api);
                    return;
                }
            }
            if (Date.now() - started >= 60000) {
                api.state = 'timeout';
                reject(new Error('GeoFS did not become ready within 60 seconds'));
                return;
            }
            setTimeout(check, 250);
        };
        check();
    });
    ready.catch(error => console.warn('[GeoFS-V4.0_Core-Library]', error.message));
})();

// V3.9 shared HUD and notification foundations, adapted to the V4 readiness lifecycle.

window.getAircraftProfile = function(ac) {
    if (!ac) return null;
    const acId = String(ac.id ?? ac.aircraftRecord?.id ?? '');
    
    // 1. Direct hit in master registry
    if (window.AIRCRAFT_DATA && window.AIRCRAFT_DATA[acId]) {
        return Object.assign({ id: acId }, window.AIRCRAFT_DATA[acId]);
    }
    
    // 2. Query GeoFS runtime catalog (geofs.aircraftList)
    const catalogEntry = window.geofs?.aircraftList?.[acId] || ac.aircraftRecord;
    const catalogName = catalogEntry?.name || ac.definition?.name || ac.definition?.externalName;
    
    // 3. Dynamic synthesis from physics definition
    const def = ac.definition || {};
    const mass = Number(def.mass || ac.setup?.mass || 1200);
    const maxThrust = Number(def.maxThrust || 0);
    const hasGear = def.hasGear !== undefined ? !!def.hasGear : (def.gearPositions?.length > 0 || ac.parts?.gear !== undefined);
    const hasSpoilers = def.hasAirbrakes !== undefined ? !!def.hasAirbrakes : (ac.parts?.airbrakes !== undefined || ac.parts?.spoilers !== undefined);
    
    const estimatedOew = Math.round(mass * 0.55);
    const estimatedMtow = Math.round(mass * 1.25);
    const estimatedFuel = Math.round(mass * 0.35);

    return {
        id: acId,
        name: catalogName || (acId ? `Aircraft ${acId}` : "Current Aircraft"),
        maxFlaps: def.flapsSteps || (def.flapsPositions ? def.flapsPositions.length - 1 : 0),
        hasGear,
        hasSpoilers,
        oew: estimatedOew,
        mtow: estimatedMtow,
        maxFuel: estimatedFuel,
        isDynamic: true
    };
};

window.GeoFSV4Core?.initialize('V4-Shared-Foundation', () => {
    // Physical Constants: Standardized conversion coefficients
    window.DEGREES_TO_RAD = window.DEGREES_TO_RAD || 0.017453292519943295;
    window.RAD_TO_DEGREES = window.RAD_TO_DEGREES || 57.29577951308232;
    window.METERS_TO_FEET = window.METERS_TO_FEET || 3.280839895;

    /** Startup status and independent in-flight notification banners. */
    window.V40_NOTIF = window.V40_NOTIF?._v40StartupV2 ? window.V40_NOTIF : (() => {
        document.getElementById('V40-notif-container')?.remove();
        const modules = ['Core-Library', 'Design-System', 'Autothrottle'];
        const states = new Map();
        let panel, details, banners, dismissTimer, closed = false, startup = true;
        const nameOf = text => {
            const match = String(text).match(/GeoFS-V4\.0_([\w-]+)/i);
            return match && modules.find(name => name.toLowerCase() === match[1].toLowerCase());
        };
        function ensurePanel() {
            if (panel?.isConnected || !document.body) return;
            panel = document.createElement('section');
            panel.id = 'V40-notif-container';
            panel.setAttribute('aria-label', 'GeoFS add-on startup status');
            panel.setAttribute('role', 'status');
            panel.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999999;width:min(320px,calc(100vw - 40px));box-sizing:border-box;padding:12px;background:rgba(40,40,40,.96);border:1px solid #777;border-radius:4px;color:#eee;font:13px Arial,sans-serif;box-shadow:0 2px 8px #0008;';
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;';
            const heading = document.createElement('strong'); heading.textContent = 'GeoFS-V4.0_Ecosystem';
            const close = document.createElement('button');
            close.textContent = '×'; close.type = 'button'; close.setAttribute('aria-label', 'Dismiss add-on status');
            close.style.cssText = 'border:0;background:transparent;color:inherit;font-size:20px;cursor:pointer;line-height:1;';
            close.addEventListener('click', () => { closed = true; panel.remove(); clearTimeout(dismissTimer); });
            row.append(heading, close); panel.appendChild(row);
            details = document.createElement('div'); details.style.cssText = 'margin-top:8px;line-height:1.5;overflow-wrap:anywhere;white-space:pre-line;'; panel.appendChild(details);
            document.body.appendChild(panel);
        }
        function scanModules() {
            const checks = {
                'Core-Library': () => !!window.GeoFSV4Core,
                'Design-System': () => !!document.getElementById('geofs-design-system'),
                'Information-Display': () => !!window.initHUDInformationDisplayPro,
                'Checklist-System': () => !!window.initChecklistSystem,
                'Fuel-Simulator': () => !!window.initFuelSimulatorPro,
                'Failure-Simulator': () => !!window.initFailures,
                'Realism-Pack': () => !!window.initRealismPackPro,
                'Landing-Statistics': () => !!window.initLandingStats,
                'Flight-Path-Vector': () => typeof window.howFar !== 'undefined',
                'Autothrottle': () => !!window.geofs?.autothrottle,
                'Overpowered-Engines': () => !!window.overpoweredEnginesSuite,
                'Satellite-Imagery': () => String(window.geofs?.api?.imageryProvider?._resource?.url || '').includes('ibasemaps-api.arcgis.com')
            };
            for (const [name, check] of Object.entries(checks)) {
                try { if (check() && !states.has(name)) states.set(name, 'ready'); } catch (_) {}
            }
        }
        function render() {
            if (closed) return;
            scanModules(); ensurePanel(); if (!panel) return;
            const ready = modules.filter(name => states.get(name) === 'ready');
            const failed = modules.filter(name => states.get(name) === 'failed');
            const unknown = modules.filter(name => !states.has(name));
            details.textContent = `${startup ? 'Starting · ' : ''}${ready.length} of ${modules.length} detected` +
                (failed.length ? `\nFailed to start: ${failed.join(', ')}` : '') +
                (!startup && unknown.length ? `\nNot detected (not installed, disabled, or still loading): ${unknown.join(', ')}` : '');
            if (ready.length === modules.length && !dismissTimer) {
                dismissTimer = setTimeout(() => { if (panel) panel.remove(); closed = true; }, 2000);
            } else if (ready.length !== modules.length && dismissTimer) {
                clearTimeout(dismissTimer); dismissTimer = null;
            }
        }
        function banner(text, type, duration) {
            if (!document.body) return;
            if (!banners?.isConnected) {
                banners = document.createElement('div');
                banners.id = 'V40-notif-banners';
                banners.setAttribute('aria-live', 'polite');
                banners.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999999;display:flex;flex-direction:column;align-items:flex-end;gap:6px;pointer-events:none;';
                document.body.appendChild(banners);
            }
            const item = document.createElement('div');
            item.style.cssText = 'max-width:min(320px,calc(100vw - 40px));box-sizing:border-box;padding:10px 12px;background:rgba(40,40,40,.96);border:1px solid #777;border-radius:4px;color:#eee;font:13px Arial,sans-serif;box-shadow:0 2px 8px #0008;overflow-wrap:anywhere;';
            item.textContent = String(text);
            if (type === 'critical') item.style.color = '#ff8d8d';
            else if (type === 'warn') item.style.color = '#ffd37a';
            banners.appendChild(item);
            setTimeout(() => { item.remove(); if (!banners.children.length) banners.remove(); }, Math.max(duration, type === 'critical' ? 10000 : 4000));
        }
        const api = {
            _v40Unified: 210, _v40StartupV2: true,
            show(text, type = 'info', duration = 4000) {
                const module = nameOf(text);
                if (module && /\bloaded\.$/i.test(text)) { states.set(module, 'ready'); render(); return; }
                if (module && /boot failure\.$/i.test(text)) { states.set(module, 'failed'); render(); return; }
                banner(text, type, duration);
            },
            info(t) { this.show(t, 'info'); }, success(t) { this.show(t, 'success'); },
            warn(t) { this.show(t, 'warn'); }, critical(t) { this.show(t, 'critical'); },
            status(name, state) { const module = nameOf(name); if (module) { states.set(module, state); render(); } }
        };
        render();
        setTimeout(() => { startup = false; render(); }, 18000);
        const scanTimer = setInterval(() => { if (closed) { clearInterval(scanTimer); return; } render(); }, 1000);
        return api;
    })();

    /**
     * Module Guard: Safe Initialization Lifecycle
     * Orchestrates the secure execution of modular code blocks. Implements
     * error isolation and technical notification for deployment status.
     * 
     * @param {string} moduleName - Target identifier for registry
     * @param {function} func - Executable module logic
     * @param {boolean} silent - Suppresses initialization-start alerts
     */
    window.SafeInit = (moduleName, func, silent = true) => {
        if (window.GeoFSV4Core?.state !== 'ready') {
            console.warn("[GeoFS-V4.0_Core-Library] >> [MODULE BLOCKED] " + moduleName + " disabled: GeoFS v" + window.geofs?.version + " detected (suite only supports GeoFS v4).");
            return;
        }
        console.info(`[GeoFS-V4.0_Core-Library] >> [MODULE] Initializing: ${moduleName}`);
        if (!silent) window.V40_NOTIF.info(`Initializing ${moduleName}...`);
        try {
            func();
            console.log(`[GeoFS-V4.0_Core-Library] >> [MODULE SUCCESS] ${moduleName} Active.`);
            window.V40_NOTIF.success(`${moduleName} Loaded.`);
        } catch (e) {
            console.error(`[GeoFS-V4.0_Core-Library] >> [MODULE ERROR] CRITICAL FAILURE in ${moduleName}:`, e);
            window.V40_NOTIF.critical(`${moduleName} Boot Failure.`);
        }
    };

    /**
     * HUD Orchestrator: Persistent UI Foundation
     * Manages the unified, glassmorphic HUD panel used by all standalone modules.
     * Features self-healing DOM restoration and prioritized Z-stack management.
     */
    window.ensureSharedHUD = () => {
        if (globalThis.hudProVisible === undefined) globalThis.hudProVisible = true;
        if (globalThis.hudProMinimized === undefined) globalThis.hudProMinimized = false;

        // Stylesheet Injection: Enforce V3.9 Design Tokens
        if (!document.getElementById('hudModularStyles')) {
            const style = document.createElement('style');
            style.id = 'hudModularStyles';
            style.textContent = `
                #flightDataDisplay {
                    position: fixed !important;
                    top: 100px;
                    right: 20px;
                    width: 250px;
                    background: rgba(0, 0, 0, 0.8);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    border-radius: 12px;
                    padding: 15px;
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    z-index: 220000 !important;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                    font-family: 'Roboto', sans-serif;
                    pointer-events: auto !important;
                }
                .hud-drag-handle { grid-column: 1 / -1; text-align: center; color: rgba(255, 255, 255, 0.3); font-size: 10px; letter-spacing: 2px; cursor: move; margin-bottom: 5px; text-transform: uppercase; }
                .unified-tabs { grid-column: 1 / -1; display: grid; gap: 3px; margin-bottom: 10px; }
                .unified-tab { background: rgba(255,255,255,0.05); border: 1px solid #888; color: rgba(255,255,255,0.6); border-radius: 4px; font-size: 10px; padding: 4px; cursor: pointer; transition: all 0.2s; font-weight: 700; text-transform: uppercase; }
                .unified-tab:hover { background: rgba(255,255,255,0.1); }
                .unified-tab.active { color: #dddddd; border-color: #dddddd; background: rgba(255, 255, 255, 0.15); }
                .unified-content { display: none; padding: 10px; max-height: 400px; overflow-y: auto; }
                .unified-content.active { display: block; }
                .unified-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                #hudMinimizeBtn {
                    position: fixed; width: 40px; height: 40px; border-radius: 50%;
                    background: rgba(30, 30, 30, 0.9); backdrop-filter: blur(8px);
                    border: 1px solid rgba(255, 255, 255, 0.15); color: #dddddd;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; z-index: 220001; font-size: 18px; box-shadow: 0 5px 15px rgba(0,0,0,0.4);
                }
                .hud-cell { display: flex; flex-direction: column; }
                .hud-label { font-size: 10px; color: #dddddd; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8; }
                .hud-value { font-size: 13px; font-weight: 700; color: #fff; font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif; }
            `;
            document.head.appendChild(style);
        }

        // Structural Injection: Ensure container existence
        let panel = document.getElementById('flightDataDisplay');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'flightDataDisplay';
            document.body.appendChild(panel);
        }

        // Module Navigation: Ensure Tab Bar existence
        if (!document.getElementById('hud-unified-tabs')) {
            const handle = document.createElement('div');
            handle.className = 'hud-drag-handle';
            handle.textContent = 'GeoFS-V4.0_HUD';
            
            const tabs = document.createElement('div');
            tabs.id = 'hud-unified-tabs';
            tabs.className = 'unified-tabs';
            
            panel.prepend(tabs);
            panel.prepend(handle);
            
            if (window.initAddonDraggable) window.initAddonDraggable(panel, 'geofs-addonpack-hud-pos');
        }

        // Interaction Layer: Ensure Global Minimize Trigger
        if (!document.getElementById('hudMinimizeBtn')) {
            const btn = document.createElement('div');
            btn.id = 'hudMinimizeBtn';
            btn.innerHTML = globalThis.hudProMinimized ? '◈' : '▣';
            btn.onclick = (e) => {
                e.stopPropagation();
                globalThis.hudProMinimized = !globalThis.hudProMinimized;
                btn.innerHTML = globalThis.hudProMinimized ? '◈' : '▣';
            };
            document.body.appendChild(btn);
            if (window.initAddonDraggable) window.initAddonDraggable(btn, 'geofs-addonpack-hud-icon-pos');
        }

        // Self-Healing Lifecycle Loop: DOM integrity monitoring
        if (!window._hudVisibilityLoop) {
            window._hudVisibilityLoop = setInterval(() => {
                const btn = document.getElementById('hudMinimizeBtn');
                const p = document.getElementById('flightDataDisplay');
                
                // Integrity check: Restoration on accidental deletion
                if (!btn || !p) {
                    window.ensureSharedHUD();
                    return;
                }

                const isVisible = globalThis.hudProVisible !== false;
                const isMinimized = globalThis.hudProMinimized === true;

                btn.style.display = isVisible ? 'flex' : 'none';
                p.style.display = (isVisible && !isMinimized) ? 'grid' : 'none';
                
                // Prioritize Z-Index for UI visibility
                btn.style.zIndex = "220001";
                p.style.zIndex = "220000";
            }, 500);
        }
    };

    /**
     * switchHUDProTab: Global Tab Orchestrator
     * Toggles visibility between registered module containers.
     * 
     * @param {string} activeTabId - Target tab identifier
     */
    window.switchHUDProTab = (activeTabId) => {
        const p = document.getElementById('flightDataDisplay');
        if (!p) return;
        
        // UI Sync: Clear previous state
        p.querySelectorAll('.unified-tab').forEach(t => t.classList.remove('active'));
        p.querySelectorAll('.unified-content').forEach(c => c.classList.remove('active'));
        
        // UI Sync: Apply active state
        const tabBtn = document.getElementById(`tab-btn-${activeTabId}`);
        const tabContent = document.getElementById(`tab-content-${activeTabId}`);
        if (tabBtn) tabBtn.classList.add('active');
        if (tabContent) tabContent.classList.add('active');
        
        // Persistence Sync: Restore HUD if currently minimized
        globalThis.hudProMinimized = false;
        const btn = document.getElementById('hudMinimizeBtn');
        if (btn) btn.innerHTML = '▣';
    };

    /**
     * registerHUDTab: Primary Module Integration Endpoint
     * Standardized method for standalone modules to inject their UI into the unified panel.
     */
    window.registerHUDTab = (tabId, label, contentHTML, isGrid) => {
        console.log(`[GeoFS-Core] >> Attempting to register tab: ${tabId} (${label})`);
        window.ensureSharedHUD();
        const tabsContainer = document.getElementById('hud-unified-tabs');
        if (!tabsContainer) {
            console.error(`[GeoFS-Core] >> Failed to register tab ${tabId}: tabsContainer missing!`);
            return;
        }

        // Logic: Create the navigation button if it doesn't exist.
        if (!document.getElementById(`tab-btn-${tabId}`)) {
            const btn = document.createElement('button');
            btn.id = `tab-btn-${tabId}`;
            btn.className = 'unified-tab';
            btn.textContent = label;
            btn.onclick = () => window.switchHUDProTab(tabId);
            const tabOrder = ['id', 'fuel', 'checks', 'realism'];
            const rank = id => {
                const index = tabOrder.indexOf(id.replace(/^tab-btn-/, ''));
                return index < 0 ? tabOrder.length : index;
            };
            const next = Array.from(tabsContainer.children).find(child => rank(child.id) > rank(btn.id));
            tabsContainer.insertBefore(btn, next || null);
            console.log(`[GeoFS-Core] >> Created button for tab: ${tabId}`);
        }
        tabsContainer.style.gridTemplateColumns = `repeat(${tabsContainer.children.length}, minmax(0, 1fr))`;

        // Logic: Create the content container if it doesn't exist.
        if (!document.getElementById(`tab-content-${tabId}`)) {
            const content = document.createElement('div');
            content.id = `tab-content-${tabId}`;
            content.className = `unified-content ${isGrid ? 'unified-grid' : ''}`;
            content.innerHTML = contentHTML;
            document.getElementById('flightDataDisplay').appendChild(content);
            console.log(`[GeoFS-Core] >> Created content container for tab: ${tabId}`);
        }

        // UX: Auto-activate the first module to register.
        if (!document.querySelector('.unified-tab.active')) {
            console.log(`[GeoFS-Core] >> Auto-switching to first registered tab: ${tabId}`);
            window.switchHUDProTab(tabId);
        }
    };

    /**
     * hudCell: UI Generation Utility
     * Generates a standardized, high-density data cell for HUD content.
     */
    window.hudCell = (label, value, warnClass, idClass) => `<div class="hud-cell"><span class="hud-label">${label}</span><span class="hud-value ${idClass || ''} ${warnClass || ''}">${value}</span></div>`;

    /**
     * initAddonDraggable: UX Persistence Handler
     * Implements coordinate-based persistence via localStorage with screen boundary constraints.
     */
    window.initAddonDraggable = (card, storageKey) => {
        if (!card) return;
        let isDragging = false, dragMoved = false, dragOffsetX = 0, dragOffsetY = 0;
        
        // Load saved position
        const savedPos = localStorage.getItem(storageKey);
        if (savedPos) {
            try {
                const {left, top} = JSON.parse(savedPos);
                if (left && top) {
                    card.style.left = left;
                    card.style.top = top;
                    card.style.bottom = 'auto';
                    card.style.right = 'auto';
                    card.style.transform = 'none';
                }
            } catch (err) {}
        }
        
        card.addEventListener('mousedown', (e) => {
            if (['BUTTON', 'INPUT', 'A', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
            isDragging = true;
            dragMoved = false;
            
            const rect = card.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            
            // Lock position inline and clear bottom/right/transform constraints to prevent dynamic layout shifts
            card.style.left = rect.left + 'px';
            card.style.top = rect.top + 'px';
            card.style.bottom = 'auto';
            card.style.right = 'auto';
            card.style.transform = 'none';
            
            card.style.cursor = 'grabbing';
            card.style.transition = 'none';
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            dragMoved = true;
            
            let newLeft = e.clientX - dragOffsetX;
            let newTop = e.clientY - dragOffsetY;
            
            // Screen Boundary Logic
            const maxX = window.innerWidth - card.offsetWidth;
            const maxY = window.innerHeight - card.offsetHeight;
            newLeft = Math.max(0, Math.min(newLeft, maxX));
            newTop = Math.max(0, Math.min(newTop, maxY));

            card.style.left = newLeft + 'px';
            card.style.top = newTop + 'px';
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                card.style.cursor = 'default';
                card.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.15), opacity 0.3s ease';
                
                if (dragMoved) {
                    localStorage.setItem(storageKey, JSON.stringify({
                        left: card.style.left,
                        top: card.style.top
                    }));
                }
            }
        });
    };

    // Auto-Initialization of foundational UI.
    if (document.body) {
        window.ensureSharedHUD();
    } else {
        window.addEventListener('DOMContentLoaded', () => window.ensureSharedHUD());
    }

    console.log("[GeoFS-V4.0_Core-Library] >> Core foundations loaded and ready.");
    if (window.V40_NOTIF?.status) window.V40_NOTIF.status('GeoFS-V4.0_Core-Library', 'ready');

/**
 * GeoFS-V4.0 Aircraft Technical Registry
 * 
 * Master data source for physical modeling across the ecosystem.
 * Contains provisional OEW (Operating Empty Weight), MTOW (Maximum Takeoff Weight),
 * and system capabilities for every core GeoFS aircraft.
 */
window.AIRCRAFT_DATA = {
    "1": { "name": "Piper Cub (J-3)", "maxFlaps": 0, "hasGear": false, "hasSpoilers": false, "oew": 309, "mtow": 553, "maxFuel": 45 },
    "2": { "name": "Cessna 172", "maxFlaps": 3, "hasGear": false, "hasSpoilers": false, "oew": 760, "mtow": 1157, "maxFuel": 169 },
    "3": { "name": "Alphajet PAF", "maxFlaps": 2, "hasGear": true, "hasSpoilers": true, "oew": 3515, "mtow": 8000, "maxFuel": 1520 },
    "4": { "name": "Boeing 737-700", "maxFlaps": 8, "hasGear": true, "hasSpoilers": true, "oew": 37340, "mtow": 70080, "maxFuel": 20816 },
    "5": { "name": "Embraer Phenom 100", "maxFlaps": 4, "hasGear": true, "hasSpoilers": true, "oew": 3235, "mtow": 4750, "maxFuel": 1272 },
    "6": { "name": "de Havilland Canada DHC-6 Twin Otter", "maxFlaps": 4, "hasGear": false, "hasSpoilers": false, "oew": 3121, "mtow": 5670, "maxFuel": 1175 },
    "7": { "name": "F-16 Fighting Falcon", "maxFlaps": 0, "hasGear": true, "hasSpoilers": true, "oew": 8570, "mtow": 19200, "maxFuel": 3175 },
    "8": { "name": "Pitts Special S1", "maxFlaps": 0, "hasGear": false, "hasSpoilers": false, "oew": 326, "mtow": 521, "maxFuel": 60 },
    "9": { "name": "Eurocopter EC135", "maxFlaps": 0, "hasGear": false, "hasSpoilers": false, "oew": 1455, "mtow": 2910, "maxFuel": 560 },
    "10": { "name": "Airbus A380-800", "maxFlaps": 4, "hasGear": true, "hasSpoilers": true, "oew": 285000, "mtow": 575000, "maxFuel": 253984 },
    "11": { "name": "Alisport Silent 2 Electro", "maxFlaps": 0, "hasGear": true, "hasSpoilers": true, "oew": 205, "mtow": 300, "maxFuel": 0 },
    "12": { "name": "Pilatus PC-7 Mk-I", "maxFlaps": 2, "hasGear": true, "hasSpoilers": false, "oew": 1330, "mtow": 2700, "maxFuel": 360 },
    "13": { "name": "de Havilland Canada DHC-2 Beaver", "maxFlaps": 3, "hasGear": false, "hasSpoilers": false, "oew": 1361, "mtow": 2313, "maxFuel": 359 },
    "14": { "name": "Colomban MC-15 Cri-cri", "maxFlaps": 1, "hasGear": false, "hasSpoilers": false, "oew": 80, "mtow": 170, "maxFuel": 18 },
    "15": { "name": "Lockheed P-38 Lightning F-5B", "maxFlaps": 3, "hasGear": true, "hasSpoilers": false, "oew": 5800, "mtow": 9800, "maxFuel": 1100 },
    "16": { "name": "Douglas DC-3", "maxFlaps": 3, "hasGear": true, "hasSpoilers": false, "oew": 7650, "mtow": 11430, "maxFuel": 1800 },
    "18": { "name": "Sukhoi Su-35", "maxFlaps": 2, "hasGear": true, "hasSpoilers": true, "oew": 18400, "mtow": 34500, "maxFuel": 11500 },
    "20": { "name": "Concorde", "maxFlaps": 0, "hasGear": true, "hasSpoilers": false, "oew": 78700, "mtow": 185000, "maxFuel": 95600 },

    "22": { "name": "Cessna 152", "maxFlaps": 3, "hasGear": false, "hasSpoilers": false },
    "23": { "name": "Piper PA-28 161 Warrior II", "maxFlaps": 3, "hasGear": false, "hasSpoilers": false, "oew": 612, "mtow": 1107, "maxFuel": 145 },

    "24": { "name": "Airbus A350-900", "maxFlaps": 5, "hasGear": true, "hasSpoilers": true, "oew": 142400, "mtow": 280000, "maxFuel": 112600 },
    "25": { "name": "Boeing 777-300ER", "maxFlaps": 6, "hasGear": true, "hasSpoilers": true, "oew": 167800, "mtow": 351500, "maxFuel": 145538 },
    "27": { "name": "Boeing F/A-18F Super Hornet", "maxFlaps": 3, "hasGear": true, "hasSpoilers": true, "oew": 14552, "mtow": 29937, "maxFuel": 6200 },
    "28": { "name": "Beechcraft Baron B55", "maxFlaps": 3, "hasGear": true, "hasSpoilers": false, "oew": 1431, "mtow": 2313, "maxFuel": 322 },
    "29": { "name": "Dassault Rafale", "maxFlaps": 0, "hasGear": true, "hasSpoilers": false, "oew": 10300, "mtow": 24500, "maxFuel": 4700 },
    "31": { "name": "Potez 25", "maxFlaps": 0, "hasGear": false, "hasSpoilers": false, "oew": 1490, "mtow": 2558, "maxFuel": 250 },
    "32": { "name": "Northrop T-38 Talon", "maxFlaps": 2, "hasGear": true, "hasSpoilers": true, "oew": 3270, "mtow": 5670, "maxFuel": 1800 },

    "242": { "name": "Airbus A321neo", "maxFlaps": 5, "hasGear": true, "hasSpoilers": true, "oew": 50100, "mtow": 97000, "maxFuel": 26000 },

    "2844": { "name": "Falcon 9 (SpaceX)", "maxFlaps": 0, "hasGear": true, "hasSpoilers": true, "oew": 22200, "mtow": 549054, "maxFuel": 395700 },
    "2948": { "name": "North American XB-70 Valkyrie", "maxFlaps": 0, "hasGear": true, "hasSpoilers": false, "oew": 115031, "mtow": 245847, "maxFuel": 140000 },
    "2953": { "name": "Space Shuttle Atlantis (OV104)", "maxFlaps": 1, "hasGear": true, "hasSpoilers": true, "oew": 78000, "mtow": 110000, "maxFuel": 0 },
    "2973": { "name": "Airbus A350-1000 XWB", "maxFlaps": 5, "hasGear": true, "hasSpoilers": true, "oew": 155000, "mtow": 319000, "maxFuel": 125000 },
    "2988": { "name": "North American X-15", "maxFlaps": 2, "hasGear": true, "hasSpoilers": true, "oew": 6620, "mtow": 15420, "maxFuel": 8300 },
    "3179": { "name": "Boeing 787-10", "maxFlaps": 6, "hasGear": true, "hasSpoilers": true, "oew": 135500, "mtow": 254000, "maxFuel": 101000 },
    "4341": { "name": "Spirit of St. Louis", "maxFlaps": 0, "hasGear": false, "hasSpoilers": false, "oew": 975, "mtow": 2380, "maxFuel": 1200 },
    "5038": { "name": "Lockheed L-1011-1 Tristar", "maxFlaps": 5, "hasGear": true, "hasSpoilers": true, "oew": 105100, "mtow": 195045, "maxFuel": 68000 },
    "5073": { "name": "Bombardier Learjet 45 XR", "maxFlaps": 3, "hasGear": true, "hasSpoilers": true, "oew": 6212, "mtow": 9752, "maxFuel": 2700 },
    "5086": { "name": "Airbus A321-211", "maxFlaps": 5, "hasGear": true, "hasSpoilers": true, "oew": 48500, "mtow": 93500, "maxFuel": 23700 },
    "5156": { "name": "Airbus A318-112", "maxFlaps": 5, "hasGear": true, "hasSpoilers": true, "oew": 39500, "mtow": 68000, "maxFuel": 18600 },
    "5193": { "name": "Boeing 747-8i", "maxFlaps": 6, "hasGear": true, "hasSpoilers": true, "oew": 220128, "mtow": 447700, "maxFuel": 191000 },
    "5203": { "name": "Boeing 737-600", "maxFlaps": 8, "hasGear": true, "hasSpoilers": true, "oew": 37340, "mtow": 65990, "maxFuel": 20816 },
    "5211": { "name": "Boeing 747SP", "maxFlaps": 6, "hasGear": true, "hasSpoilers": true, "oew": 152780, "mtow": 317500, "maxFuel": 150000 },
    "5314": { "name": "Boeing 747-100 SCA", "maxFlaps": 6, "hasGear": true, "hasSpoilers": true, "oew": 162400, "mtow": 322050, "maxFuel": 145000 },
    "5409": { "name": "Boeing 747-400D", "maxFlaps": 6, "hasGear": true, "hasSpoilers": true, "oew": 181000, "mtow": 396890, "maxFuel": 173472 },
    "5431": { "name": "Northrop YF-23", "maxFlaps": 0, "hasGear": true, "hasSpoilers": true, "oew": 14900, "mtow": 29000, "maxFuel": 8600 },
    "5499": { "name": "CubCrafters CC19 XCub", "maxFlaps": 3, "hasGear": false, "hasSpoilers": false, "oew": 552, "mtow": 1043, "maxFuel": 150 },
    "5516": { "name": "Boeing 747-400 LCF", "maxFlaps": 6, "hasGear": true, "hasSpoilers": true, "oew": 180530, "mtow": 364235, "maxFuel": 160000 },
    "5527": { "name": "Boeing 747-400", "maxFlaps": 6, "hasGear": true, "hasSpoilers": true, "oew": 183520, "mtow": 396890, "maxFuel": 173472 },
    "5551": { "name": "Comac C919-100", "maxFlaps": 5, "hasGear": true, "hasSpoilers": true, "oew": 42000, "mtow": 71500, "maxFuel": 15600 },
    "5566": { "name": "Embraer E175", "maxFlaps": 5, "hasGear": true, "hasSpoilers": true, "oew": 21886, "mtow": 38790, "maxFuel": 9335 },

    "4402": { "name": "Boeing 777-200F", "maxFlaps": 6, "hasGear": true, "hasSpoilers": true, "oew": 144400, "mtow": 347800, "maxFuel": 145000 },
    "5229": { "name": "F-35B Lightning II", "maxFlaps": 0, "hasGear": true, "hasSpoilers": true, "oew": 14700, "mtow": 27200, "maxFuel": 6125 },
    "5486": { "name": "Aviat A-1B Husky", "maxFlaps": 3, "hasGear": false, "hasSpoilers": false, "oew": 531, "mtow": 907, "maxFuel": 190 },

};

}).catch(() => {});
