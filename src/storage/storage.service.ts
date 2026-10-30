import { Injectable, Logger } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private supabase?: SupabaseClient;
  private readonly bucketName: string;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    } else {
      this.logger.warn(
        'Variables de entorno de Supabase (SUPABASE_URL / SUPABASE_KEY) no configuradas. Las subidas a Storage fallarán si no se provee un cliente personalizado.',
      );
    }

    this.bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'campaign-assets';
  }

  /**
   * Permite inyectar un cliente mock de Supabase en entornos de prueba.
   */
  setCustomClient(client: SupabaseClient): void {
    this.supabase = client;
  }

  /**
   * Sube un buffer de imagen a Supabase Storage con sobreescritura (upsert).
   * Retorna la URL pública accesible por CDN.
   */
  async uploadFile(
    path: string,
    buffer: Buffer,
    contentType = 'image/png',
  ): Promise<string> {
    if (!this.supabase) {
      throw new Error(
        'El cliente de Supabase Storage no está configurado (faltan variables de entorno).',
      );
    }

    this.logger.log(
      `Subiendo archivo al bucket '${this.bucketName}': path='${path}' (${buffer.length} bytes)`,
    );

    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(path, buffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      this.logger.error(
        `Error al subir archivo a Supabase Storage en '${this.bucketName}/${path}': ${error.message}`,
      );
      throw error;
    }

    const { data } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(path);

    this.logger.log(`Archivo subido exitosamente. URL pública: ${data.publicUrl}`);
    return data.publicUrl;
  }
}
