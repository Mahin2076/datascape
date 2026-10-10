// DEV STAND-IN for Teammate 2's data module (feature/housing-data, plan task H3).
// Implements the documented getHousing / calculateBudget contracts over the existing
// dist/assets/data.json so resident stories can be built and tested before H3 lands.
// The integrated app must use dist/data/, not this file.

const DATA_URL = new URL('../../assets/data.json', import.meta.url);
let cache = null;

async function load(fetchImpl) {
  cache ??= fetchImpl(DATA_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`data.json HTTP ${r.status}`);
      return r.json();
    })
    .catch((error) => {
      cache = null; // let the next call retry after a transient failure
      throw error;
    });
  return cache;
}

export function createContractStub({ fetchImpl = globalThis.fetch, db = null } = {}) {
  const source = db ? Promise.resolve(db) : null;
  return Object.freeze({
    async getHousing(cityId, year) {
      const data = await (source ?? load(fetchImpl));
      const city = data.cities.find((c) => c.id === cityId);
      const row = city?.data.find((d) => d.year === year);
      if (!row) return null;
      return {
        monthlyRent: row.rent,
        annualIncome: row.income,
        geography: `${city.name}, ${city.state} (city)`,
        period: row.period,
        sources: [
          { label: 'B25064 rent', url: row.sources.b25064 },
          { label: 'B19013 income', url: row.sources.b19013 },
        ],
      };
    },
    calculateBudget({ monthlyRent, annualIncome, rentChangePct = 0, incomeChangePct = 0 }) {
      const monthlyIncome = (annualIncome * (1 + incomeChangePct / 100)) / 12;
      const adjustedRent = monthlyRent * (1 + rentChangePct / 100);
      if (!(monthlyIncome > 0)) {
        return { status: 'income_unavailable', monthlyIncome: null, adjustedRent, remainingAfterRent: null, rentToIncomeRatio: null };
      }
      return {
        status: 'ok',
        monthlyIncome,
        adjustedRent,
        remainingAfterRent: monthlyIncome - adjustedRent,
        rentToIncomeRatio: adjustedRent / monthlyIncome,
      };
    },
  });
}
