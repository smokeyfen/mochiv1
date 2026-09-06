import { createHash } from 'node:crypto';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium, type Browser, type Download, type Page } from 'playwright-core';
import type { SaydiBrowserDriver, SaydiBrowserDriverResult, SaydiVoiceBinding } from './saydi-browser-voice.ts';

export interface SaydiPlaywrightDriverOptions {
  readonly outputDirectory: string;
  readonly chromeExecutablePath?: string;
  readonly headless?: boolean;
  readonly studioUrl?: string;
}
export interface ValidatedWavFile { readonly localPath: string; readonly fileSize: number; readonly sha256: string; readonly measuredDurationMs: number; }

/** UI-only implementation: public-page navigation, visible controls, and a browser download. */
export class SaydiPlaywrightDriver implements SaydiBrowserDriver {
  readonly #singleFlight = new SaydiSingleFlight();
  readonly #options: Required<Pick<SaydiPlaywrightDriverOptions, 'headless' | 'studioUrl'>> & SaydiPlaywrightDriverOptions;
  constructor(options: SaydiPlaywrightDriverOptions) { this.#options = { ...options, headless: options.headless ?? false, studioUrl: options.studioUrl ?? 'https://voice.saydi.ai/vi/studio/tts/' }; }
  async synthesize(binding: SaydiVoiceBinding, text: string): Promise<SaydiBrowserDriverResult> {
    return this.#singleFlight.run(async () => {
      let browser: Browser | undefined;
      try {
        await mkdir(this.#options.outputDirectory, { recursive: true });
        const launchOptions = this.#options.chromeExecutablePath ? { headless: this.#options.headless, executablePath: this.#options.chromeExecutablePath } : { headless: this.#options.headless };
        browser = await chromium.launch(launchOptions);
        const page = await browser.newPage({ acceptDownloads: true });
        await preparePublicSaydiUi(page, this.#options.studioUrl, binding, text);
        const download = await triggerPublicUiDownload(page);
        const destination = join(this.#options.outputDirectory, `${binding.voiceIdentityId}-${Date.now()}.wav`);
        await download.saveAs(destination);
        const validated = await validateDownloadedWav(destination);
        return { audioFormat: 'WAV', measuredDurationMs: validated.measuredDurationMs, sha256: validated.sha256, runtimeArtifactRef: validated.localPath };
      } finally { await browser?.close(); }
    });
  }
}

export class SaydiSingleFlight {
  #inFlight = false;
  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.#inFlight) throw new Error('SAYDI_BROWSER_DRIVER_BUSY');
    this.#inFlight = true;
    try { return await operation(); } finally { this.#inFlight = false; }
  }
}

export async function validateDownloadedWav(localPath: string): Promise<ValidatedWavFile> {
  const [bytes, metadata] = await Promise.all([readFile(localPath), stat(localPath)]);
  if (!metadata.isFile() || metadata.size <= 0) throw new Error('SAYDI_WAV_INVALID_FILE');
  const measuredDurationMs = measureWavDurationMs(bytes);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  return { localPath: resolve(localPath), fileSize: metadata.size, sha256, measuredDurationMs };
}

export function measureWavDurationMs(bytes: Uint8Array): number {
  const view = Buffer.from(bytes);
  if (view.length < 44 || view.subarray(0, 4).toString('ascii') !== 'RIFF' || view.subarray(8, 12).toString('ascii') !== 'WAVE') throw new Error('SAYDI_WAV_INVALID_HEADER');
  let offset = 12, byteRate = 0, dataSize = -1;
  while (offset + 8 <= view.length) {
    const id = view.subarray(offset, offset + 4).toString('ascii');
    const size = view.readUInt32LE(offset + 4), dataStart = offset + 8;
    if (dataStart + size > view.length) throw new Error('SAYDI_WAV_INVALID_CHUNK');
    if (id === 'fmt ') { if (size < 16) throw new Error('SAYDI_WAV_INVALID_FORMAT'); byteRate = view.readUInt32LE(dataStart + 8); }
    if (id === 'data') dataSize = size;
    offset = dataStart + size + size % 2;
  }
  if (!Number.isFinite(byteRate) || byteRate <= 0 || dataSize <= 0) throw new Error('SAYDI_WAV_INVALID_FORMAT');
  const duration = Math.round(dataSize / byteRate * 1000);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('SAYDI_WAV_INVALID_DURATION');
  return duration;
}

async function preparePublicSaydiUi(page: Page, studioUrl: string, binding: SaydiVoiceBinding, text: string): Promise<void> {
  await page.goto(studioUrl, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Thêm speaker' }).click();
  await page.getByPlaceholder(/tìm kiếm/i).first().fill(binding.providerVoiceName);
  await page.getByText(binding.providerVoiceName, { exact: true }).click();
  await page.locator('[contenteditable="true"]').first().fill(text);
  await page.getByRole('button', { name: 'MP3' }).click();
  await page.getByText('WAV', { exact: true }).click();
}
async function triggerPublicUiDownload(page: Page): Promise<Download> {
  await page.getByRole('button', { name: 'Tạo giọng nói' }).click();
  const downloadButton = page.getByRole('button', { name: 'Tải xuống' });
  await downloadButton.waitFor({ state: 'visible' });
  const download = page.waitForEvent('download');
  await downloadButton.click();
  return download;
}
