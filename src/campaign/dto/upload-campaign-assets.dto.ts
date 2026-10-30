import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import type { asset_format } from '@prisma/client';

export const VALID_ASSET_FORMATS = ['SQUARE_1_1', 'STORY_9_16'] as const;

export class CampaignAssetItemDto {
  /**
   * Formato de la placa generada ('SQUARE_1_1' o 'STORY_9_16').
   */
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsNotEmpty({ message: 'El formato de la placa es requerido.' })
  @IsIn(VALID_ASSET_FORMATS, {
    message: 'El formato de la placa debe ser SQUARE_1_1 o STORY_9_16.',
  })
  format!: asset_format;

  /**
   * Imagen en Base64 (Data URL tipo 'data:image/png;base64,...' o string Base64 puro).
   */
  @Transform(({ obj, value }) => value ?? obj?.image_base64)
  @IsNotEmpty({ message: 'La imagen en Base64 es requerida.' })
  @IsString({ message: 'La imagen en Base64 debe ser una cadena de texto válida.' })
  imageBase64!: string;

  /**
   * Ancho de la placa en píxeles (opcional, por defecto 1080).
   */
  @IsOptional()
  @IsInt({ message: 'El ancho (width) debe ser un número entero.' })
  @Min(100, { message: 'El ancho mínimo permitido es 100 píxeles.' })
  width?: number;

  /**
   * Alto de la placa en píxeles (opcional, por defecto 1080 para 1:1 y 1920 para 9:16).
   */
  @IsOptional()
  @IsInt({ message: 'El alto (height) debe ser un número entero.' })
  @Min(100, { message: 'El alto mínimo permitido es 100 píxeles.' })
  height?: number;
}

export class UploadCampaignAssetsDto {
  /**
   * Token secreto de edición de la campaña, generado al crear el borrador.
   */
  @Transform(({ obj, value }) => (typeof value === 'string' ? value.trim() : obj?.edit_token?.trim()))
  @IsNotEmpty({
    message: 'El editToken es requerido para autorizar la subida de placas.',
  })
  @IsString({ message: 'El editToken debe ser una cadena de texto válida.' })
  editToken!: string;

  /**
   * Lista de placas generadas a almacenar.
   */
  @Transform(({ value }) => (Array.isArray(value) ? value : value ? [value] : []))
  @IsArray({ message: 'Las placas deben enviarse en una lista (array).' })
  @ArrayMinSize(1, { message: 'Debe enviarse al menos una placa para registrar.' })
  @ValidateNested({ each: true })
  @Type(() => CampaignAssetItemDto)
  assets!: CampaignAssetItemDto[];
}

