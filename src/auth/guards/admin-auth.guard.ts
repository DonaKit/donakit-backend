import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  type AdminJwtPayload,
  getAdminEmailWhitelist,
  getAdminJwtSecret,
  verifyAdminJwt,
} from '../utils/jwt.util.js';

export interface AdminAuthenticatedRequest extends Request {
  adminUser?: AdminJwtPayload;
}

/**
 * Guard de autenticación para endpoints exclusivos del panel administrativo.
 * Valida:
 * 1. Cabecera `Authorization: Bearer <token>` con JWT HS256 firmado mediante `JWT_SECRET` (o `AUTH_SECRET`).
 * 2. Expiración, emisor, audiencia y rol `ADMIN`.
 * 3. Opcionalmente, si `ADMIN_EMAILS` está definida en el backend, verifica que el email esté en la whitelist.
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  private readonly logger = new Logger(AdminAuthGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<AdminAuthenticatedRequest>();

    const authHeader = request.headers?.authorization;
    const rawHeader = Array.isArray(authHeader) ? authHeader[0] : authHeader;

    if (!rawHeader) {
      throw new UnauthorizedException(
        'Se requiere autenticación de administrador (cabecera Authorization Bearer).',
      );
    }

    const match = rawHeader.trim().match(/^Bearer\s+(\S+)$/i);
    if (!match) {
      throw new UnauthorizedException(
        'Formato de cabecera Authorization inválido. Use: Bearer <token>.',
      );
    }

    const token = match[1];
    const secret = getAdminJwtSecret();
    if (!secret) {
      this.logger.error(
        'JWT_SECRET (ni AUTH_SECRET) está configurado en las variables de entorno del servidor.',
      );
      throw new InternalServerErrorException(
        'La autenticación administrativa no está configurada en el servidor.',
      );
    }

    let payload: AdminJwtPayload;
    try {
      payload = verifyAdminJwt(token, secret);
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'Token JWT inválido.';
      this.logger.warn(`Acceso administrativo rechazado: ${reason}`);
      throw new UnauthorizedException(reason);
    }

    if (payload.role !== 'ADMIN') {
      this.logger.warn(
        `Acceso administrativo denegado para '${payload.email}': rol '${payload.role}' insuficiente.`,
      );
      throw new ForbiddenException(
        'El token no cuenta con permisos de administrador.',
      );
    }

    const whitelist = getAdminEmailWhitelist();
    if (whitelist.length > 0 && !whitelist.includes(payload.email)) {
      this.logger.warn(
        `Acceso administrativo denegado: '${payload.email}' no está en ADMIN_EMAILS.`,
      );
      throw new ForbiddenException(
        'Tu cuenta no está autorizada para operar en el panel administrativo.',
      );
    }

    request.adminUser = payload;
    return true;
  }
}

