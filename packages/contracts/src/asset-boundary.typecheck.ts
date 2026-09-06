import { SCHEMA_VERSION, type AssetRef } from './index';

// Compile-time regression fixture: AssetRef must remain constructible from logical,
// provider-agnostic metadata alone.
const logicalAssetRef: AssetRef = {
  schemaVersion: SCHEMA_VERSION,
  assetId: 'typecheck-product-front',
  role: 'PRODUCT_FRONT',
  source: 'UPLOAD',
  mimeType: 'image/jpeg',
  sha256: 'typecheck-content-hash',
  viewAngle: 'front',
  qualityScore: 1
};

void logicalAssetRef;
