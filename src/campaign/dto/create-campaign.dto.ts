import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const VALID_BLOOD_TYPES = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  '0+',
  '0-',
  'O+',
  'O-',
  'TODOS',
] as const;

export type ValidBloodType = (typeof VALID_BLOOD_TYPES)[number];

export class CreateCampaignDto {
  /**
   * Nombre completo del paciente receptor de la donación.
   * Obligatorio según US-01 (solo letras, espacios, guiones o apóstrofes; sin números).
   */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'El nombre del paciente es requerido.' })
  @IsString({ message: 'El nombre del paciente debe ser un texto válido.' })
  @MinLength(2, {
    message: 'El nombre del paciente debe contener al menos 2 caracteres.',
  })
  @MaxLength(255, {
    message: 'El nombre del paciente no puede superar los 255 caracteres.',
  })
  @Matches(/^(?=.*[\p{L}])[\p{L}\s'-]+$/u, {
    message:
      'El nombre del paciente solo debe contener letras, espacios o guiones (no se permiten números ni caracteres especiales).',
  })
  patientName!: string;

  /**
   * Identificador único (UUID) del centro de salud o institución receptora.
   * Obligatorio según US-01.
   */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'El centro de salud es requerido.' })
  @IsUUID('4', { message: 'El centro de salud debe ser un UUID v4 válido.' })
  institutionId!: string;

  /**
   * Grupo sanguíneo y factor Rh requerido (ej. "0+", "A+", "B-", "TODOS").
   * Obligatorio según US-01. Acepta también "TODOS" cuando se solicitan donantes de cualquier grupo.
   */
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsNotEmpty({ message: 'El grupo sanguíneo es requerido.' })
  @IsString({ message: 'El grupo sanguíneo debe ser un texto válido.' })
  @IsIn(VALID_BLOOD_TYPES, {
    message:
      'El grupo sanguíneo debe ser uno de los formatos válidos: A+, A-, B+, B-, AB+, AB-, 0+, 0-, O+, O- o TODOS.',
  })
  bloodType!: string;

  /**
   * Tipo de donación solicitada (ej. "Sangre entera", "Plaquetas", "Plasma").
   * Opcional (por defecto en BD: "Sangre entera").
   */
  @Transform(({ value }) => {
    if (value === '' || value === null) return undefined;
    return typeof value === 'string' ? value.trim() : value;
  })
  @IsOptional()
  @IsString({ message: 'El tipo de donación debe ser un texto válido.' })
  @MaxLength(50, {
    message: 'El tipo de donación no puede superar los 50 caracteres.',
  })
  donationType?: string;

  /**
   * Cantidad objetivo de donantes requeridos.
   * Opcional.
   */
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const num = Number(value);
    return Number.isNaN(num) ? value : num;
  })
  @IsOptional()
  @IsInt({
    message: 'La cantidad de donantes requeridos debe ser un número entero.',
  })
  @Min(1, {
    message: 'La cantidad de donantes requeridos debe ser al menos 1.',
  })
  @Max(1000, { message: 'La cantidad de donantes no puede exceder los 1000.' })
  targetDonors?: number;

  /**
   * Fecha límite para la donación (formato ISO 8601 o YYYY-MM-DD).
   * Opcional.
   */
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : value,
  )
  @IsOptional()
  @IsString({
    message: 'La fecha límite debe ser una cadena con formato de fecha válido.',
  })
  deadline?: string;

  /**
   * Observaciones o indicaciones adicionales para los donantes.
   * Opcional.
   */
  @Transform(({ value }) => {
    if (value === '' || value === null) return undefined;
    return typeof value === 'string' ? value.trim() : value;
  })
  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser una cadena de texto.' })
  @MaxLength(1000, {
    message: 'Las observaciones no pueden exceder los 1000 caracteres.',
  })
  observations?: string;
}
