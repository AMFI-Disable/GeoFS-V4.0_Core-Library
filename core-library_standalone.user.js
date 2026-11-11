// ==UserScript==
// @name         GeoFS-V4.0_Core-Library
// @namespace    https://greasyfork.org/users/1594049
// @version      0.1.0
// @description  Shared initialization and notifications for the GeoFS V4.0 ecosystem beta.
// @author       AMFI-Disable
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
        version: '0.1.0',
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
