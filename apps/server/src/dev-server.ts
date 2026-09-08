import { createProductEvidenceHttpHandler } from './product-evidence-http.ts';
import { createProductEvidenceService } from './product-evidence-service.ts';
import { createNodeHttpServerAdapter } from './node-http-adapter.ts';
import { RuntimeConfiguration } from './runtime-configuration.ts';
import { ProductionWorkspaceService } from './production-workspace.ts';
import { createProductionWorkspaceHttpHandler } from './production-workspace-http.ts';
import { IntelligenceProviderError } from '@mochi/providers';

const host = '127.0.0.1';
const port = readDevelopmentPort(process.env.MOCHI_SERVER_PORT);
const runtime = new RuntimeConfiguration();
const service = { analyze(request: Parameters<ReturnType<typeof createProductEvidenceService>['analyze']>[0]) {
  const intelligence = runtime.provider();
  if (!intelligence) throw new IntelligenceProviderError('CONFIGURATION', false);
  return createProductEvidenceService({ intelligence }).analyze(request);
} };
const evidenceHandler = createProductEvidenceHttpHandler({ service });
const workspaceHandler = createProductionWorkspaceHttpHandler({ runtime, workspace:new ProductionWorkspaceService(runtime) });
const handler = async (request:Request):Promise<Response> => new URL(request.url).pathname === '/api/product-evidence' ? evidenceHandler(request) : workspaceHandler(request);
const server = createNodeHttpServerAdapter({ handler, maxBodyBytes: 100 * 1024 * 1024 });

server.listen(port, host, () => {
  console.log(`Mochi server listening on http://${host}:${port}`);
});

function readDevelopmentPort(value: string | undefined): number {
  if (value === undefined || value.trim().length === 0) return 8787;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('MOCHI_SERVER_PORT_INVALID');
  }
  return port;
}
