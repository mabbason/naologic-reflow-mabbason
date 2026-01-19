import { readFileSync } from 'fs';
import { DateTime } from 'luxon';
import { reflow } from './reflow/reflow.service.js';
import type { ReflowInput, WorkOrder } from './reflow/types.js';

const scenarioPath = process.argv[2];
if (!scenarioPath) {
  console.log('Usage: npx tsx src/run-scenario.ts <scenario-file>');
  process.exit(1);
}

const scenario = JSON.parse(readFileSync(scenarioPath, 'utf-8'));

if (scenario.description) {
  console.log(`\nScenario: ${scenario.description}`);
}
if (scenario.expectedOutcome?.description) {
  console.log(`Expected: ${scenario.expectedOutcome.description}`);
}

const input: ReflowInput = {
  workOrders: scenario.workOrders,
  workCenters: scenario.workCenters,
  manufacturingOrders: scenario.manufacturingOrders,
};

const originalMap = new Map<string, WorkOrder>(
  input.workOrders.map((wo) => [wo.docId, wo])
);

function formatDiff(originalStart: string, newStart: string): string {
  const original = DateTime.fromISO(originalStart);
  const updated = DateTime.fromISO(newStart);
  const diffMinutes = updated.diff(original, 'minutes').minutes;

  if (diffMinutes === 0) return '';

  const sign = diffMinutes > 0 ? '+' : '';
  const absMins = Math.abs(diffMinutes);

  if (absMins >= 1440) {
    const days = Math.floor(absMins / 1440);
    const hours = Math.floor((absMins % 1440) / 60);
    return hours > 0 ? `  (${sign}${days}d ${hours}h)` : `  (${sign}${days}d)`;
  } else if (absMins >= 60) {
    const hours = Math.floor(absMins / 60);
    const mins = absMins % 60;
    return mins > 0 ? `  (${sign}${hours}h ${mins}m)` : `  (${sign}${hours}h)`;
  }
  return `  (${sign}${diffMinutes}m)`;
}

console.log('\nBefore:');
for (const order of input.workOrders) {
  console.log(`  ${order.docId}: ${order.data.startDate} → ${order.data.endDate}`);
}

const result = reflow(input);

console.log('\nChanges:');
for (const change of result.changes) {
  const startChanged = change.previousStartDate !== change.newStartDate;
  const endChanged = change.previousEndDate !== change.newEndDate;

  if (startChanged) {
    console.log(`  ${change.workOrderId} start: ${change.previousStartDate} → ${change.newStartDate}`);
  }
  if (endChanged) {
    console.log(`  ${change.workOrderId} end:   ${change.previousEndDate} → ${change.newEndDate}`);
  }
}

console.log('\nFinal Schedule:');
for (const order of result.updatedWorkOrders) {
  const original = originalMap.get(order.docId);
  const diff = original ? formatDiff(original.data.startDate, order.data.startDate) : '';
  console.log(`  ${order.docId}: ${order.data.startDate} → ${order.data.endDate}${diff}`);
}
