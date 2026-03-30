import 'dotenv/config';
import { NativeConnection, Worker } from '@temporalio/worker';
import * as activities from '../src/modules/payouts/payout.activities';
import * as path from 'path';

async function run() {
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
  });

  const worker = await Worker.create({
    connection,
    namespace: 'default',
    taskQueue: 'payout-queue',
    workflowsPath: path.resolve(
      __dirname,
      '../src/modules/payouts/payout.workflow.ts',
    ),
    activities,
  });

  console.log('Temporal worker started on task queue: payout-queue');
  await worker.run();
}

run().catch((err) => {
  console.error('Worker failed:', err);
  process.exit(1);
});
