import { createHash, randomUUID } from 'node:crypto';
import { link, mkdir, open, readFile, unlink } from 'node:fs/promises';
import { basename, join } from 'node:path';
import {
  PRODUCTION_SNAPSHOT_V1,
  SCHEMA_VERSION,
  type ProductionSnapshotV1,
  validateProductionSnapshotV1
} from '@mochi/contracts';
import { compileProductionContract, type CompileProductionContractRequest } from '@mochi/reasoning';

const SNAPSHOT_ID_PATTERN = /^ps_[0-9a-f]{64}$/;

export type ProductionSnapshotErrorCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'CORRUPT_SNAPSHOT'
  | 'SNAPSHOT_CONFLICT'
  | 'STORAGE_FAILURE';

/** Stable P0 boundary: details from the filesystem and compiler never escape this error. */
export class ProductionSnapshotError extends Error {
  readonly code: ProductionSnapshotErrorCode;
  constructor(code: ProductionSnapshotErrorCode) {
    super(`PRODUCTION_SNAPSHOT_ERROR:${code}`);
    this.name = 'ProductionSnapshotError';
    this.code = code;
  }
}

export interface CreateProductionSnapshotRequest {
  readonly projectId: string;
  readonly productionRequest: CompileProductionContractRequest;
}

export interface ProductionSnapshotStore {
  create(request: CreateProductionSnapshotRequest): Promise<ProductionSnapshotV1>;
  save(snapshot: ProductionSnapshotV1): Promise<ProductionSnapshotV1>;
  load(snapshotId: string): Promise<ProductionSnapshotV1>;
}

export interface ProductionSnapshotStoreOptions {
  /** Trusted server configuration; never serialized into a snapshot. */
  readonly storageRoot: string;
}

type SnapshotContent = Omit<ProductionSnapshotV1, 'snapshotId'>;

function hasNonBlankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** One deterministic JSON authority: sorted object keys and untouched array/string values. */
export function canonicalJson(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new ProductionSnapshotError('INVALID_INPUT');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(item => canonicalJson(item)).join(',')}]`;
  if (!value || typeof value !== 'object') throw new ProductionSnapshotError('INVALID_INPUT');
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
}

export function productionSnapshotContent(snapshot: ProductionSnapshotV1): SnapshotContent {
  const { snapshotId: _snapshotId, ...content } = snapshot;
  return content;
}

export function computeProductionSnapshotId(content: SnapshotContent): string {
  const hash = createHash('sha256').update(canonicalJson(content), 'utf8').digest('hex');
  return `ps_${hash}`;
}

function assertValidSnapshot(snapshot: unknown, integrityCode: ProductionSnapshotErrorCode): asserts snapshot is ProductionSnapshotV1 {
  if (validateProductionSnapshotV1(snapshot).length > 0) throw new ProductionSnapshotError(integrityCode);
}

function assertSafeSnapshotId(snapshotId: unknown, code: ProductionSnapshotErrorCode): asserts snapshotId is string {
  if (typeof snapshotId !== 'string' || !SNAPSHOT_ID_PATTERN.test(snapshotId)) throw new ProductionSnapshotError(code);
}

function snapshotPath(storageRoot: string, snapshotId: string): string {
  assertSafeSnapshotId(snapshotId, 'INVALID_INPUT');
  const filename = `${snapshotId}.json`;
  const path = join(storageRoot, filename);
  if (basename(path) !== filename) throw new ProductionSnapshotError('INVALID_INPUT');
  return path;
}

function normalizeStorageError(error: unknown): ProductionSnapshotError {
  if (error instanceof ProductionSnapshotError) return error;
  return new ProductionSnapshotError('STORAGE_FAILURE');
}

function parseAndVerifyPersistedSnapshot(text: string, requestedSnapshotId: string): ProductionSnapshotV1 {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new ProductionSnapshotError('CORRUPT_SNAPSHOT'); }
  assertValidSnapshot(parsed, 'CORRUPT_SNAPSHOT');
  const snapshot = parsed;
  if (snapshot.snapshotId !== requestedSnapshotId
    || computeProductionSnapshotId(productionSnapshotContent(snapshot)) !== requestedSnapshotId) {
    throw new ProductionSnapshotError('CORRUPT_SNAPSHOT');
  }
  return snapshot;
}

/**
 * Creates an injected-root store. P0 has no HTTP wiring and no provider dependency:
 * creation recompiles and validates R8 before it persists anything.
 */
export function createProductionSnapshotStore(options: ProductionSnapshotStoreOptions): ProductionSnapshotStore {
  if (!hasNonBlankString(options?.storageRoot)) throw new ProductionSnapshotError('INVALID_INPUT');
  const storageRoot = options.storageRoot;

  async function load(snapshotId: string): Promise<ProductionSnapshotV1> {
    assertSafeSnapshotId(snapshotId, 'INVALID_INPUT');
    let text: string;
    try {
      text = await readFile(snapshotPath(storageRoot, snapshotId), 'utf8');
    } catch (error: unknown) {
      if ((error as { code?: unknown })?.code === 'ENOENT') throw new ProductionSnapshotError('NOT_FOUND');
      throw normalizeStorageError(error);
    }
    return parseAndVerifyPersistedSnapshot(text, snapshotId);
  }

  async function save(snapshot: ProductionSnapshotV1): Promise<ProductionSnapshotV1> {
    assertValidSnapshot(snapshot, 'INVALID_INPUT');
    const expectedSnapshotId = computeProductionSnapshotId(productionSnapshotContent(snapshot));
    if (snapshot.snapshotId !== expectedSnapshotId) throw new ProductionSnapshotError('INVALID_INPUT');
    const target = snapshotPath(storageRoot, snapshot.snapshotId);
    const serialized = canonicalJson(snapshot);
    let temporaryPath: string | undefined;
    try {
      await mkdir(storageRoot, { recursive: true });
      temporaryPath = join(storageRoot, `.${snapshot.snapshotId}.${randomUUID()}.tmp`);
      const handle = await open(temporaryPath, 'wx');
      try { await handle.writeFile(serialized, 'utf8'); } finally { await handle.close(); }
      try {
        await link(temporaryPath, target);
        await unlink(temporaryPath);
        return snapshot;
      } catch (error: unknown) {
        if ((error as { code?: unknown })?.code !== 'EEXIST') throw error;
        const existingText = await readFile(target, 'utf8');
        let existing: ProductionSnapshotV1;
        try { existing = parseAndVerifyPersistedSnapshot(existingText, snapshot.snapshotId); }
        catch { throw new ProductionSnapshotError('SNAPSHOT_CONFLICT'); }
        if (canonicalJson(existing) !== serialized) throw new ProductionSnapshotError('SNAPSHOT_CONFLICT');
        return existing;
      }
    } catch (error: unknown) {
      throw normalizeStorageError(error);
    } finally {
      if (temporaryPath) {
        try { await unlink(temporaryPath); } catch { /* no temporary file remains, or cleanup is unavailable */ }
      }
    }
  }

  return {
    async create(request: CreateProductionSnapshotRequest): Promise<ProductionSnapshotV1> {
      if (!hasNonBlankString(request?.projectId)) throw new ProductionSnapshotError('INVALID_INPUT');
      let productionContract;
      try { productionContract = compileProductionContract(request.productionRequest); }
      catch { throw new ProductionSnapshotError('INVALID_INPUT'); }
      const content: SnapshotContent = {
        schemaVersion: SCHEMA_VERSION,
        snapshotVersion: PRODUCTION_SNAPSHOT_V1,
        projectId: request.projectId,
        productId: productionContract.productId,
        sourceEvidenceVersion: productionContract.sourceEvidenceVersion,
        canonicalAssetIds: productionContract.canonicalAssetIds,
        productionContract
      };
      const snapshot: ProductionSnapshotV1 = { ...content, snapshotId: computeProductionSnapshotId(content) };
      assertValidSnapshot(snapshot, 'INVALID_INPUT');
      return save(snapshot);
    },
    save,
    load
  };
}
