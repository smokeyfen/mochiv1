import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

export type WebRequestHandler = (request: Request) => Promise<Response>;

export interface NodeHttpAdapterOptions {
  readonly handler: WebRequestHandler;
  readonly maxBodyBytes?: number;
}

const DEFAULT_MAX_BODY_BYTES = 10 * 1024 * 1024;

/** Bridges native Node HTTP requests to the locked Web Request handler. */
export function createNodeHttpServerAdapter(options: NodeHttpAdapterOptions): Server {
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
  return createServer(async (incoming, outgoing) => {
    const response = await dispatchNodeRequest(incoming, options.handler, maxBodyBytes);
    await writeNodeResponse(outgoing, response);
  });
}

async function dispatchNodeRequest(
  incoming: IncomingMessage,
  handler: WebRequestHandler,
  maxBodyBytes: number
): Promise<Response> {
  try {
    const request = await toWebRequest(incoming, maxBodyBytes);
    return await handler(request);
  } catch (error: unknown) {
    if (error instanceof RequestBodyLimitError) {
      return Response.json({ ok: false, error: { code: 'PAYLOAD_TOO_LARGE' } }, { status: 413 });
    }
    return Response.json({ ok: false, error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
  }
}

async function toWebRequest(incoming: IncomingMessage, maxBodyBytes: number): Promise<Request> {
  const headers = new Headers();
  for (const [name, value] of Object.entries(incoming.headers)) {
    if (value === undefined) continue;
    for (const headerValue of Array.isArray(value) ? value : [value]) {
      headers.append(name, headerValue);
    }
  }

  const method = incoming.method ?? 'GET';
  const url = new URL(incoming.url ?? '/', 'http://127.0.0.1');
  const body = method === 'GET' || method === 'HEAD'
    ? undefined
    : new Uint8Array(await readBody(incoming, maxBodyBytes));
  return new Request(url, { method, headers, ...(body === undefined ? {} : { body }) });
}

async function readBody(incoming: IncomingMessage, maxBodyBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of incoming) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > maxBodyBytes) throw new RequestBodyLimitError();
    chunks.push(bytes);
  }
  return Buffer.concat(chunks);
}

async function writeNodeResponse(outgoing: ServerResponse, response: Response): Promise<void> {
  outgoing.statusCode = response.status;
  response.headers.forEach((value, name) => outgoing.setHeader(name, value));
  outgoing.end(Buffer.from(await response.arrayBuffer()));
}

class RequestBodyLimitError extends Error {}
