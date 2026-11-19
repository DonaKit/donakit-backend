import { BadRequestException, ValidationError } from '@nestjs/common';

export function validationExceptionFactory(
  validationErrors: ValidationError[],
): BadRequestException {
  const fieldErrors: Record<string, string[]> = {};
  const messageList: string[] = [];

  function extractErrors(errors: ValidationError[], parentProperty = '') {
    for (const error of errors) {
      const property = parentProperty
        ? `${parentProperty}.${error.property}`
        : error.property;

      if (error.constraints) {
        const messages = Object.values(error.constraints);
        fieldErrors[property] = messages;
        messageList.push(...messages);
      }

      if (error.children && error.children.length > 0) {
        extractErrors(error.children, property);
      }
    }
  }

  extractErrors(validationErrors);

  return new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    message: 'Error de validación en los datos del formulario.',
    errors: fieldErrors,
    details: messageList,
  });
}
