export const VIEWBOX = { width: 696, height: 650 };
export const HUB = { x: 348, y: 320 };
export const ORBIT = { rx: 215, ry: 150 };
export const RADII = { primary: 38, satellite: 29, hub: 60 };

const toRadians = (angleDeg) => angleDeg * Math.PI / 180;

export function primaryPosition(angleDeg) {
  const angle = toRadians(angleDeg);
  return {
    x: HUB.x + Math.cos(angle) * ORBIT.rx,
    y: HUB.y + Math.sin(angle) * ORBIT.ry,
  };
}

export function satellitePositions(angleDeg, count) {
  const primary = primaryPosition(angleDeg);
  const orbitAngle = Math.atan2(primary.y - HUB.y, primary.x - HUB.x);
  const step = count > 4 ? 37 : 44;
  const distance = count > 4 ? 124 : 112;

  return Array.from({ length: count }, (_, index) => {
    const angle = orbitAngle + (index - (count - 1) / 2) * step * Math.PI / 180;
    return {
      x: Number((primary.x + Math.cos(angle) * distance).toFixed(2)),
      y: Number((primary.y + Math.sin(angle) * distance).toFixed(2)),
    };
  });
}

export function layoutForMap(map) {
  return Object.fromEntries(map.map((node) => [node.id, {
      primary: primaryPosition(node.angle),
      satellites: Object.fromEntries(
        node.clients.map((clientId, index) => [clientId, satellitePositions(node.angle, node.clients.length)[index]]),
      ),
    }]));
}
