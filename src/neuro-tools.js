// Transparent teaching worksheets; values never write to the physiology solver.
function bounded(value, name, min, max) {
  if (!Number.isFinite(value) || value < min || value > max) throw new RangeError(`${name} must be a finite number from ${min} to ${max}.`);
  return value;
}

export function calculatePerfusion({ map, icp, cvp }) {
  bounded(map, 'MAP', 0, 250); bounded(icp, 'ICP', 0, 100); bounded(cvp, 'CVP', 0, 60);
  const downstream = Math.max(icp, cvp);
  return { cpp: map - icp, effectiveGradient: map - downstream, downstream };
}

export function calculateGCS({ eye, verbal, motor }) {
  for (const [name, value, max] of [['Eye', eye, 4], ['Verbal', verbal, 5], ['Motor', motor, 6]]) {
    if (value !== null && (!Number.isInteger(value) || value < 1 || value > max)) throw new RangeError(`${name} must be an integer from 1 to ${max}, or not testable.`);
  }
  return { total: [eye, verbal, motor].includes(null) ? null : eye + verbal + motor,
    components: `E${eye ?? 'NT'} V${verbal ?? 'NT'} M${motor ?? 'NT'}` };
}

export function calculateOsmolarity({ sodium, glucose, bun }) {
  bounded(sodium, 'Sodium', 80, 220); bounded(glucose, 'Glucose', 0, 2000); bounded(bun, 'BUN', 0, 300);
  return 2 * sodium + glucose / 18 + bun / 2.8;
}
