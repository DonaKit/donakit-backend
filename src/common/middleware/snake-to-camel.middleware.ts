import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware para normalizar claves de snake_case a camelCase en el cuerpo de las peticiones.
 * Esto asegura compatibilidad total tanto si el frontend envía `patientName` como `patient_name`.
 */
@Injectable()
export class SnakeToCamelMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      const fieldMappings: Record<string, string> = {
        patient_name: 'patientName',
        institution_id: 'institutionId',
        blood_type: 'bloodType',
        donation_type: 'donationType',
        target_donors: 'targetDonors',
        edit_token: 'editToken',
        image_base64: 'imageBase64',
      };

      for (const [snakeKey, camelKey] of Object.entries(fieldMappings)) {
        if (
          req.body[snakeKey] !== undefined &&
          req.body[camelKey] === undefined
        ) {
          req.body[camelKey] = req.body[snakeKey];
        }
      }
    }
    next();
  }
}
