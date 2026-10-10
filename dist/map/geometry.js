// Keep a street viewport inside the world, even near its outer boundary.
export function streetCamera({ width, height, worldWidth, worldHeight, x, y, zoom }) {
  const z = Math.max(zoom, width / worldWidth, height / worldHeight);
  const halfW = width / (2 * z), halfH = height / (2 * z);
  return { x: Math.max(halfW, Math.min(worldWidth - halfW, x)), y: Math.max(halfH, Math.min(worldHeight - halfH, y)), z };
}
