# Housing data contract

`index.js` implements the teammate 2 core data contract over the committed ACS data. `getHousing(cityId, year)` returns exact monthly rent, annual household income, MOEs, city/place geography, period, Census sources and caveats. Unknown years/cities and unsupported provenance return null. The fetch-backed exports retry after a transient load failure; `createHousingData(db)` provides an isolated synchronous adapter for tests and the app.

`calculateBudget({monthlyRent, annualIncome, rentChangePct, incomeChangePct})` uses `10` for +10% and returns monthly income, adjusted rent, remaining income after rent and a fractional ratio. It preserves precision until presentation. Zero/missing income never produces an infinite ratio; invalid inputs have explicit statuses. These calculations are hypothetical household arithmetic, not claims about measured renter burden.

`getTimeline(cityId)` returns available sourced releases. `compareCities(year, {baseYear, sortBy})` supports gap, rent growth, income growth, monthly rent and rent-to-income ratio. Growth rankings include every city, even when income outpaced rent. All returned records are independent of the source snapshot.

No Census values were changed or independently re-fetched in this integration. The module preserves the existing dataset's source links and limits. Cala coverage remains unverified: no provider endpoint, access credentials or validated response contract was supplied. No live research result is claimed or substituted with generated content.
