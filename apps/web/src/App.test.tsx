import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const createObjectUrl = vi.fn((file: File) => `blob:preview-${file.name}`);
const revokeObjectUrl = vi.fn();

beforeEach(() => {
  createObjectUrl.mockClear();
  revokeObjectUrl.mockClear();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectUrl });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectUrl });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function selectProductImage(name = 'front.jpg') {
  const image = new File(['image bytes'], name, { type: 'image/jpeg' });
  fireEvent.change(screen.getByLabelText('Add product images'), { target: { files: [image] } });
}

function enterValidProjectInput() {
  fireEvent.change(screen.getByLabelText('Product Name'), { target: { value: 'Mochi bottle' } });
  fireEvent.change(screen.getByLabelText('Product Details'), { target: { value: 'Factual bottle description' } });
  fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Beauty' } });
  fireEvent.change(screen.getByLabelText('Audience'), { target: { value: 'Skincare shoppers' } });
  fireEvent.change(screen.getByLabelText('Shooting Context'), { target: { value: 'Vanity in daylight' } });
  fireEvent.change(screen.getByLabelText('Reviewer Persona'), { target: { value: 'Practical reviewer' } });
  fireEvent.change(screen.getByLabelText('Tone'), { target: { value: 'Warm and factual' } });
  fireEvent.change(screen.getByLabelText('Voice Style'), { target: { value: 'Conversational Vietnamese' } });
  selectProductImage();
}

function submitProject() {
  fireEvent.click(screen.getByRole('button', { name: 'Validate project input' }));
}

describe('App', () => {
  it('renders canonical product and creative form fields', () => {
    render(<App />);
    for (const label of ['Product Name', 'Product Details', 'Category', 'Add product images', 'Audience', 'Shooting Context', 'Reviewer Persona', 'Tone', 'Voice Style', 'Voice Gender', 'Voice Region']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it('fails closed when blank input is submitted', () => {
    render(<App />);
    submitProject();
    expect(screen.getByRole('alert')).toHaveTextContent('Project input needs attention');
    expect(screen.queryByText('READY_FOR_ANALYSIS')).not.toBeInTheDocument();
  });

  it('builds a valid canonical input with audience under creativeDirection', () => {
    render(<App />);
    enterValidProjectInput();
    submitProject();
    expect(screen.getByText('READY_FOR_ANALYSIS')).toBeInTheDocument();
    const preview = JSON.parse(screen.getByTestId('canonical-input-preview').textContent ?? '{}');
    expect(preview.projectId).toMatch(/^project-/);
    expect(preview.product.productId).toMatch(/^product-/);
    expect(preview.creativeDirection.audience).toBe('Skincare shoppers');
    expect(preview.product.audience).toBeUndefined();
    expect(preview.creativeDirection).toMatchObject({ voiceGender: 'FEMALE', voiceRegion: 'SOUTH' });
  });

  it('maps supported gender and region values into canonical input', () => {
    render(<App />);
    enterValidProjectInput();
    fireEvent.change(screen.getByLabelText('Voice Gender'), { target: { value: 'MALE' } });
    fireEvent.change(screen.getByLabelText('Voice Region'), { target: { value: 'NORTH' } });
    submitProject();
    const preview = JSON.parse(screen.getByTestId('canonical-input-preview').textContent ?? '{}');
    expect(preview.creativeDirection).toMatchObject({ voiceGender: 'MALE', voiceRegion: 'NORTH' });
  });

  it('creates a logical AssetRef, updates its role, and removes it from canonical input', () => {
    render(<App />);
    enterValidProjectInput();
    expect(screen.getByAltText(/Preview for asset-/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Reference role for asset-/), { target: { value: 'PRODUCT_IN_HAND' } });
    submitProject();
    const preview = JSON.parse(screen.getByTestId('canonical-input-preview').textContent ?? '{}');
    expect(preview.product.assets[0]).toMatchObject({ role: 'PRODUCT_IN_HAND', source: 'UPLOAD', mimeType: 'image/jpeg' });
    fireEvent.click(screen.getByRole('button', { name: 'Remove reference' }));
    submitProject();
    expect(screen.getByRole('alert')).toHaveTextContent('assets required');
    expect(screen.queryByText('READY_FOR_ANALYSIS')).not.toBeInTheDocument();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:preview-front.jpg');
  });

  it('removes a selected image from a still-valid canonical input', () => {
    render(<App />);
    enterValidProjectInput();
    selectProductImage('side.jpg');
    submitProject();
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove reference' })[0]!);
    submitProject();
    const preview = JSON.parse(screen.getByTestId('canonical-input-preview').textContent ?? '{}');
    expect(preview.product.assets).toHaveLength(1);
    expect(preview.product.assets[0].assetId).not.toBeUndefined();
  });

  it('keeps browser runtime data out of canonical preview and exposes no provider action', () => {
    render(<App />);
    enterValidProjectInput();
    submitProject();
    const preview = screen.getByTestId('canonical-input-preview').textContent ?? '';
    expect(preview).not.toContain('blob:');
    expect(preview).not.toContain('front.jpg');
    expect(preview).not.toMatch(/[A-Z]:\\|\/Users\/|\/home\//);
    expect(preview).not.toMatch(/File|Blob|Gemini|Flow|generate/i);
    expect(screen.queryByRole('button', { name: /analyze|gemini|flow|generate/i })).not.toBeInTheDocument();
  });
});
