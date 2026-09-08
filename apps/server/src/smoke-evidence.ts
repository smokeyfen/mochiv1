import { createProductEvidenceServiceFromEnv } from './product-evidence-service.ts';
import {
  buildSmokeEvidenceRequest,
  loadSmokeManifest,
  runSmokeEvidence
} from './smoke.ts';
import { formatSanitizedEvidenceInspection, safeCategory } from './smoke-diagnostics.ts';

async function main(): Promise<void> {
  try {
    const manifest = await loadSmokeManifest(process.env.R1_B2_SMOKE_MANIFEST);
    const request = await buildSmokeEvidenceRequest(manifest);
    const service = createProductEvidenceServiceFromEnv(process.env);
    const evidence = await runSmokeEvidence(service, request);
    console.log('R1_B2_LIVE_SMOKE=PASS');
    console.log(`provider=gemini-3-5-flash-lite-intelligence`);
    console.log(`productId=${evidence.productId}`);
    console.log(`inputAssets=${request.media.length}`);
    console.log(`canonicalAssets=${evidence.canonicalAssetIds.length}`);
    console.log(`claims=${evidence.claims.length}`);
    console.log(`uncertainties=${evidence.uncertainties.length}`);
    console.log(`contradictions=${evidence.contradictions.length}`);
    console.log(formatSanitizedEvidenceInspection(evidence));
  } catch (error: unknown) {
    console.error('R1_B2_LIVE_SMOKE=FAIL');
    console.error(`category=${safeCategory(error)}`);
    process.exitCode = 1;
  }
}

void main();
