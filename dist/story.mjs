// Pure timeline transitions. Rendering and timers stay in app.js.
export function transition(state, action, lastYear) {
  if (!Number.isInteger(lastYear) || lastYear < 0) throw new RangeError('Invalid timeline');
  switch (action.type) {
    case 'play': return {year: 0, playing: lastYear > 0};
    case 'pause': return {...state, playing: false};
    case 'reveal': return {year: lastYear, playing: false};
    case 'seek':
      if (!Number.isInteger(action.year) || action.year < 0 || action.year > lastYear) throw new RangeError('Invalid year');
      return {year: action.year, playing: false};
    case 'tick': {
      if (!state.playing) return state;
      const year = Math.min(lastYear, state.year + 1);
      return {year, playing: year < lastYear};
    }
    default: throw new Error('Unknown story action');
  }
}

export function rankGrowth(cities, end, metric = 'gap') {
  return cities.map((c, i) => {
    const r = c.data[end].rent / c.data[0].rent - 1;
    const w = c.data[end].income / c.data[0].income - 1;
    return {i, r, w};
  }).sort((a, b) => metric === 'rent' ? b.r - a.r : (b.r - b.w) - (a.r - a.w));
}
