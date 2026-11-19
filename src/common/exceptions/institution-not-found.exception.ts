import { NotFoundException } from '@nestjs/common';

export class InstitutionNotFoundException extends NotFoundException {
  constructor(institutionId?: string) {
    super(
      institutionId
        ? `El centro de salud con ID '${institutionId}' no fue encontrado o no está activo.`
        : 'El centro de salud seleccionado no existe o no se encuentra disponible.',
    );
  }
}
