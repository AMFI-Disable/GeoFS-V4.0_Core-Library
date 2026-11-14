const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'core-library_standalone.user.js'), 'utf8').split('// V3.9 shared HUD')[0];
function boot(version) {
  const statuses = [];
  const window = {geofs: {version, aircraft: {instance: {}}}, V40_NOTIF: {status: (...args) => statuses.push(args)}};
  const element = () => ({style: {}, setAttribute() {}, appendChild() {}, remove() {}});
  const context = {window, document: {body: element(), getElementById() { return null; }, createElement: element}, console: {info(){}, warn(){}, error(){}}, setTimeout(){}, localStorage: {}};
  vm.runInNewContext(source, context);
  return {api: window.GeoFSV4Core, statuses};
}
test('accepts supported V4 versions consistently and rejects V3.9', async () => {
  for (const version of ['4', '4.0', 'v4.0.1']) {
    const {api} = boot(version);
    await api.onReady(() => {});
    assert.equal(api.state, 'ready');
  }
  const {api} = boot('3.9');
  await assert.rejects(api.onReady(() => {}), /Unsupported GeoFS version/);
  assert.equal(api.state, 'unsupported');
});
test('reports successful and failed module initialization', async () => {
  const {api, statuses} = boot('4.0');
  api.notify = () => {};
  await api.initialize('Autothrottle', () => 42);
  await assert.rejects(api.initialize('Design-System', () => {throw new Error('bad init')}), /bad init/);
  assert.deepEqual(statuses, [['GeoFS-V4.0_Autothrottle', 'ready'], ['GeoFS-V4.0_Design-System', 'failed']]);
});
