const PATTERN_KEYS = [
  "squat",
  "hinge",
  "horizontal_push",
  "vertical_push",
  "horizontal_pull",
  "vertical_pull",
];

const fetchJson = async path => {
  const response = await fetch(path, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`DATA_UNAVAILABLE:${path}`);
  }
  return response.json();
};

export const loadRampingData = async () => {
  const [exercises, progressionRules, rounding, ...patterns] = await Promise.all([
    fetchJson("/data/exercises/exercises.json"),
    fetchJson("/data/progression/progression_rules.json"),
    fetchJson("/data/settings/rounding.json"),
    ...PATTERN_KEYS.map(key => fetchJson(`/data/patterns/${key}.json`)),
  ]);

  return {
    exercises,
    progressionRules,
    rounding,
    patterns: PATTERN_KEYS.reduce((acc, key, index) => {
      acc[key] = patterns[index];
      return acc;
    }, {}),
  };
};
