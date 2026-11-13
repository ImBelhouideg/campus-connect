export class AppError extends Error {
  constructor(
    message: string,
    public readonly status = 500,
    public readonly code = 'INTERNAL_ERROR',
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentification requise (en-tête x-user-id)') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Action non autorisée pour ce rôle') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Ressource introuvable') {
    super(message, 404, 'NOT_FOUND');
  }
}

/** Levée par les états du ticket quand une transition est interdite. */
export class InvalidTransitionError extends AppError {
  constructor(status: string, action: string) {
    super(`Action « ${action} » impossible depuis le statut ${status}`, 409, 'INVALID_TRANSITION');
  }
}
