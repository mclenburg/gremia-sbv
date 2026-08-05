function splitNpmScript(command) {
  if (typeof command !== 'string') return [];
  return command
    .split('&&')
    .map((step) => step.trim())
    .filter(Boolean);
}

function missingOrOutOfOrderSteps(command, requiredSteps) {
  const actualSteps = splitNpmScript(command);
  const problems = [];
  let previousIndex = -1;

  for (const step of requiredSteps) {
    const stepIndex = actualSteps.indexOf(step);
    if (stepIndex < 0) {
      problems.push(`fehlt: ${step}`);
      continue;
    }
    if (stepIndex <= previousIndex) {
      problems.push(`falsche Reihenfolge: ${step}`);
      continue;
    }
    previousIndex = stepIndex;
  }

  return problems;
}

function unexpectedSteps(command, forbiddenSteps) {
  const actualSteps = new Set(splitNpmScript(command));
  return forbiddenSteps.filter((step) => actualSteps.has(step));
}

module.exports = {
  missingOrOutOfOrderSteps,
  splitNpmScript,
  unexpectedSteps,
};
