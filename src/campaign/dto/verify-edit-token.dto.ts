import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEditTokenDto {
  /**
   * Token secreto de edición de la campaña a verificar.
   */
  @Transform(({ obj, value }) =>
    typeof value === 'string' ? value.trim() : obj?.edit_token?.trim(),
  )
  @IsNotEmpty({ message: 'El editToken es requerido para la verificación.' })
  @IsString({ message: 'El editToken debe ser una cadena de texto válida.' })
  editToken!: string;
}

