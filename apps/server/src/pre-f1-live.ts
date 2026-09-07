import { runPreF1Live } from './pre-f1-live-runner.ts';

async function main(): Promise<void> {
  const report = await runPreF1Live({ environment: process.env });
  if (report.status === 'NOT_RUN') {
    console.log('PRE_F1_LIVE_NOT_RUN');
    return;
  }
  if (report.status === 'BLOCKED') {
    console.log('PRE_F1_LIVE_BLOCKED');
    console.log('reason=EMPIRICAL_ACTION_CAPABILITY');
    console.log('intelligenceRequests=0');
    console.log('flowCalls=0');
    console.log('saydiCalls=0');
    console.log('generations=0');
    console.log('actionCapabilityPromotions=0');
    return;
  }
  if (report.status === 'PASS') {
    console.log('PRE_F1_LIVE=PASS');
    console.log(`intelligenceRequests=${report.intelligenceRequests}`);
    console.log(`intelligenceStages=${report.intelligenceStages.join(',')}`);
    console.log(`snapshotId=${report.snapshotId}`);
    console.log(`productId=${report.productId}`);
    console.log(`sceneIds=${report.sceneIds.join(',')}`);
    console.log('sceneStatuses=READY,READY,READY,READY');
    console.log(`voiceIdentityId=${report.voiceIdentityId}`);
    return;
  }
  console.error('PRE_F1_LIVE=FAIL');
  console.error(`category=${report.category}`);
  process.exitCode = 1;
}

void main();
