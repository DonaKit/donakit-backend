import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private client: SupabaseClient;

  onModuleInit() {
    const url = process.env.SUPABASE_URL;
    const secretKey =
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !secretKey) {
      this.logger.warn(
        '⚠️  SUPABASE_URL o SUPABASE_SECRET_KEY no están definidos en las variables de entorno.',
      );
      return;
    }

    this.client = createClient(url, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    this.logger.log(
      'Cliente administrativo de Supabase inicializado exitosamente (Secret Key / Bypass RLS).',
    );
  }

  /**
   * Obtiene la instancia completa del cliente de Supabase.
   */
  getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error(
        'El cliente de Supabase no ha sido inicializado. Verifica SUPABASE_URL y SUPABASE_SECRET_KEY en tu .env.',
      );
    }
    return this.client;
  }

  /**
   * Acceso directo al módulo de Storage de Supabase.
   */
  get storage() {
    return this.getClient().storage;
  }

  /**
   * Sube un asset de campaña al bucket configurado.
   */
  async uploadCampaignAsset(
    filePath: string,
    fileBuffer: Buffer | Uint8Array,
    contentType: string = 'image/png',
  ) {
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'campaign-assets';
    const { data, error } = await this.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      this.logger.error(`Error al subir asset '${filePath}':`, error);
      throw error;
    }

    const { data: publicUrlData } = this.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return {
      path: data.path,
      publicUrl: publicUrlData.publicUrl,
    };
  }

  /**
   * Obtiene la URL pública directa de un asset en campaign-assets.
   */
  getAssetPublicUrl(filePath: string): string {
    const { data } = this.storage
      .from('campaign-assets')
      .getPublicUrl(filePath);
    return data.publicUrl;
  }
}
