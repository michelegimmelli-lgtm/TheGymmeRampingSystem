const clampNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const roundLoad = (load, rounding) => {
  const increment = clampNumber(rounding?.incrementKg, 2.5);
  const mode = rounding?.mode || "nearest";
  const value = clampNumber(load);
  const scaled = value / increment;

  if (mode === "down") return Math.floor(scaled) * increment;
  if (mode === "up") return Math.ceil(scaled) * increment;
  return Math.round(scaled) * increment;
};

export const formatKg = value => {
  const fixed = Number(value).toFixed(1);
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed.replace(".", ",");
};

export const formatPercent = value => `${Math.round(clampNumber(value) * 100)}%`;

export const formatLoadLine = ({ load, reps, percentage }) =>
  `${formatKg(load)} kg × ${reps} (${formatPercent(percentage)})`;

export const formatWorkSetLine = (load, reps) => `${formatKg(load)} kg × ${reps}`;

export const buildProtocol = ({ exerciseKey, targetKg, sets, reps, data }) => {
  const exercise = data.exercises[exerciseKey];
  const pattern = exercise ? data.patterns[exercise.pattern] : null;

  if (!exercise || !pattern) {
    return null;
  }

  const safeSets = Math.max(1, parseInt(sets, 10) || 1);
  const safeReps = Math.max(1, parseInt(reps, 10) || 1);
  const safeTarget = Math.max(0, clampNumber(targetKg));

  const ramping = (pattern.ramping || []).map(step => ({
    ...step,
    load: roundLoad(safeTarget * clampNumber(step.percentage), data.rounding),
  }));

  const workSets = Array.from({ length: safeSets }, () => ({
    load: safeTarget,
    reps: safeReps,
  }));

  return {
    title: `${exercise.name} ${safeSets}x${safeReps} @ ${formatKg(safeTarget)} kg`,
    exercise,
    pattern,
    ramping,
    workSets,
  };
};

export const evaluateProgression = ({ targetSets, targetReps, completedReps, data }) => {
  const rules = data?.progressionRules?.rules || [];
  const repsPerSet = Math.max(1, parseInt(targetReps, 10) || 1);
  const setCount = Math.max(1, parseInt(targetSets, 10) || 1);
  const target = setCount * repsPerSet;
  const completed = completedReps
    .slice(0, setCount)
    .reduce((sum, rep) => sum + Math.min(Math.max(0, parseInt(rep, 10) || 0), repsPerSet), 0);
  const missing = Math.max(0, target - completed);

  const matchedRule = rules.find(rule => {
    const missingMin = clampNumber(rule.when?.missingRepsMin, 0);
    const missingMax = clampNumber(rule.when?.missingRepsMax, Number.MAX_SAFE_INTEGER);

    return missing >= missingMin && missing <= missingMax;
  });

  return {
    missingReps: missing,
    completedReps: completed,
    targetReps: target,
    rule: matchedRule || data?.progressionRules?.fallback,
  };
};

