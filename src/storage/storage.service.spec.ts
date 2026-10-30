import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from './storage.service.js';

describe('StorageService', () => {
  let service: StorageService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ error: null }),
          getPublicUrl: vi.fn().mockReturnValue({
            data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/campaign-assets/test.png' },
          }),
          download: vi.fn(),
        }),
      },
    };

    service = new StorageService();
    service.setCustomClient(mockSupabase);
  });

  it('debe subir el buffer al bucket de storage y retornar la URL pública', async () => {
    const buffer = Buffer.from('fake-png-content');
    const path = 'campaign-123/square_1_1.png';

    const url = await service.uploadFile(path, buffer, 'image/png');

    expect(mockSupabase.storage.from).toHaveBeenCalledWith('campaign-assets');
    expect(url).toBe('https://example.supabase.co/storage/v1/object/public/campaign-assets/test.png');
  });

  it('debe lanzar una excepción si la subida a Storage falla', async () => {
    mockSupabase.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: new Error('Bucket not found') }),
      getPublicUrl: vi.fn(),
    });

    const buffer = Buffer.from('fake-png-content');
    await expect(service.uploadFile('test.png', buffer)).rejects.toThrow('Bucket not found');
  });

  it('isSameFile debe retornar true si el archivo existe en storage y tiene el mismo contenido', async () => {
    const buffer = Buffer.from('identical-content');
    const exactArrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    );

    mockSupabase.storage.from.mockReturnValue({
      download: vi.fn().mockResolvedValue({
        data: {
          arrayBuffer: () => Promise.resolve(exactArrayBuffer),
        },
        error: null,
      }),
    });

    const result = await service.isSameFile('test.png', buffer);
    expect(result).toBe(true);
  });

  it('isSameFile debe retornar false si el archivo no existe o difiere en contenido', async () => {
    const buffer = Buffer.from('new-content');
    mockSupabase.storage.from.mockReturnValue({
      download: vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Not found'),
      }),
    });

    const result = await service.isSameFile('test.png', buffer);
    expect(result).toBe(false);
  });
});
