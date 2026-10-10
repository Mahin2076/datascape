// Shared, framework-free contract for map, resident panels, and housing data.
export function createSelectionStore({ cityIds, years, initial }) {
  const listeners = new Set();
  let value = { cityId: cityIds[0], year: years[0], scenario: { rentChangePct: 0, incomeChangePct: 0 } };
  const snapshot = () => ({ ...value, scenario: { ...value.scenario } });
  function set(patch) {
    const next = { ...value, ...patch, scenario: { ...value.scenario, ...patch.scenario } };
    if (!cityIds.includes(next.cityId) || !years.includes(next.year)) throw new RangeError('Unknown city or year');
    for (const key of ['rentChangePct', 'incomeChangePct']) {
      if (!Number.isFinite(next.scenario[key]) || next.scenario[key] < -100) throw new RangeError('Invalid scenario percentage');
    }
    next.scenario = { rentChangePct: next.scenario.rentChangePct, incomeChangePct: next.scenario.incomeChangePct };
    if (JSON.stringify(next) === JSON.stringify(value)) return snapshot();
    value = next;
    for (const listener of listeners) listener(snapshot());
    return snapshot();
  }
  if (initial) set(initial);
  return { get: snapshot, set, subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); } };
}
