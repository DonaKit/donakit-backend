import { BadRequestException } from '@nestjs/common';

export interface ParsedImageBuffer {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
};

/**
 * Parsea y valida una imagen enviada como string Base64 (Data URL o Base64 puro).
 * Retorna el Buffer decodificado, su Content-Type y la extensión correspondiente.
 */
export function parseBase64Image(dataString: string): ParsedImageBuffer {
  if (!dataString || typeof dataString !== 'string') {
    throw new BadRequestException(
      'La imagen en Base64 no tiene un formato válido.',
    );
  }

  const trimmed = dataString.trim();

  // Detecta formato Data URL: data:image/png;base64,iVBORw...
  const dataUrlMatch = trimmed.match(/^data:([A-Za-z-+/]+);base64,(.+)$/s);

  let contentType = 'image/png';
  let base64Data = trimmed;

  if (dataUrlMatch && dataUrlMatch.length === 3) {
    contentType = dataUrlMatch[1].toLowerCase();
    base64Data = dataUrlMatch[2].trim();
  }

  const extension = ALLOWED_CONTENT_TYPES[contentType];
  if (!extension) {
    throw new BadRequestException(
      `Tipo de imagen '${contentType}' no admitido. Formatos permitidos: image/png, image/jpeg, image/webp.`,
    );
  }

  try {
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length === 0) {
      throw new Error('Buffer vacío');
    }
    return { buffer, contentType, extension };
  } catch {
    throw new BadRequestException(
      'Error al decodificar la cadena Base64 de la imagen.',
    );
  }
}

