import { RESIDENTS } from './fixtures.js';

// Walking sprites reuse the four explicitly fictional household examples per city.
// Give each selectable sprite its own stable ID; do not imply 110 surveyed people.
export function profilesForSprites(sprites) {
  return sprites.flatMap(({residentId,cityId,spriteIndex}) => {
    const templates=RESIDENTS.filter(r=>r.cityId===cityId);
    const ordinal=Number(residentId.match(/-resident-(\d+)$/)?.[1]);
    if (!templates.length || !Number.isInteger(ordinal) || ordinal<1) return [];
    const template=templates[(ordinal-1)%templates.length];
    return [{...template,id:residentId,sprite:spriteIndex}];
  });
}
