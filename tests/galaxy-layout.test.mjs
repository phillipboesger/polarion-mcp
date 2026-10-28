import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  HUB,
  ORBIT,
  RADII,
  VIEWBOX,
  layoutForMap,
  primaryPosition,
  satellitePositions,
} from '../scripts/galaxy-layout.mjs';

const data = JSON.parse(readFileSync(new URL('../docs/clients.json', import.meta.url)));

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

test('exports the requested geometry constants', () => {
  assert.deepEqual(VIEWBOX, { width: 696, height: 650 });
  assert.deepEqual(HUB, { x: 348, y: 320 });
  assert.deepEqual(ORBIT, { rx: 215, ry: 150 });
  assert.deepEqual(RADII, { primary: 38, satellite: 29, hub: 60 });
});

test('satellite geometry remains valid for every map node and count from one to five', () => {
  const primaries = data.map.map((node) => ({ node, position: primaryPosition(node.angle) }));

  for (const { node } of primaries) {
    for (let count = 1; count <= 5; count += 1) {
      const satellites = satellitePositions(node.angle, count);

      assert.equal(satellites.length, count, `${node.id} count ${count}`);
      for (const satellite of satellites) {
        assert.ok(satellite.x >= RADII.satellite, `${node.id} count ${count}: x=${satellite.x}`);
        assert.ok(satellite.x <= VIEWBOX.width - RADII.satellite, `${node.id} count ${count}: x=${satellite.x}`);
        assert.ok(satellite.y >= RADII.satellite, `${node.id} count ${count}: y=${satellite.y}`);
        assert.ok(satellite.y <= VIEWBOX.height - RADII.satellite - 18, `${node.id} count ${count}: y=${satellite.y}`);
        for (const other of primaries) {
          if (other.node.id !== node.id) {
            assert.ok(
              distance(satellite, other.position) >= RADII.primary + RADII.satellite + 8,
              `${node.id} count ${count} vs ${other.node.id}: ${distance(satellite, other.position)}`,
            );
          }
        }
        assert.ok(
          distance(satellite, HUB) >= RADII.hub + RADII.satellite,
          `${node.id} count ${count} from hub: ${distance(satellite, HUB)}`,
        );
      }
      for (let first = 0; first < satellites.length; first += 1) {
        for (let second = first + 1; second < satellites.length; second += 1) {
          assert.ok(
            distance(satellites[first], satellites[second]) >= 2 * RADII.satellite + 8,
            `${node.id} count ${count}: satellites ${first}/${second}`,
          );
        }
      }
    }
  }
});

test('layoutForMap is deterministic and covers every map client', () => {
  const first = layoutForMap(data.map);
  const second = layoutForMap(data.map);

  assert.deepEqual(first, second);
  assert.deepEqual(Object.keys(first).sort(), data.map.map((node) => node.id).sort());
  for (const node of data.map) {
    assert.deepEqual(Object.keys(first[node.id].satellites), node.clients);
  }
});
