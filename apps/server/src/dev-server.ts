import { createProductEvidenceHttpHandler } from './product-evidence-http.ts';
import { createProductEvidenceServiceFromEnv } from './product-evidence-service.ts';
import { createNodeHttpServerAdapter } from './node-http-adapter.ts';

const host = '127.0.0.1';
const port = readDevelopmentPort(process.env.MOCHI_SERVER_PORT);
const service = createProductEvidenceServiceFromEnv(process.env);
const handler = createProductEvidenceHttpHandler({ service });
const server = createNodeHttpServerAdapter({ handler });

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
