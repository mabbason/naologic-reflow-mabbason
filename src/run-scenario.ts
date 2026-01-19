import { readFileSync } from 'fs';
import { reflow } from './reflow/reflow.service.js';
import type { ReflowInput } from './reflow/types.js';

const scenarioPath = process.argv[2];
if (!scenarioPath) {
  console.log('Usage: npx tsx src/run-scenario.ts <scenario-file>');
  process.exit(1);
}

const scenario = JSON.parse(readFileSync(scenarioPath, 'utf-8'));
const input: ReflowInput = {
  workOrders: scenario.workOrders,
  workCenters: scenario.workCenters,
  manufacturingOrders: scenario.manufacturingOrders,
};

const result = reflow(input);

console.log('\nChanges:');
for (const change of result.changes) {
  console.log(`  ${change.workOrderId}: ${change.previousStartDate} → ${change.newEndDate}`);
}

console.log('\nFinal Schedule:');
for (const order of result.updatedWorkOrders) {
  console.log(`  ${order.docId}: ${order.data.startDate} → ${order.data.endDate}`);
}
