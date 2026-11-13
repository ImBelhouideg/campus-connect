import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import type { DirectoryRepository, Role, User } from '../modules/directory/directory.repository';
import { AppError, ForbiddenError, NotFoundError, UnauthorizedError } from './errors';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/** Express 4 n'attrape pas les erreurs des handlers async : on les transmet à next(). */
export const asyncHandler =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

/**
 * Authentification SIMPLIFIÉE POUR LA DÉMO : l'utilisateur est désigné par l'en-tête x-user-id.
 * À remplacer par un vrai SSO / JWT en production.
 */
export const authenticate =
  (directory: DirectoryRepository): RequestHandler =>
  (req, _res, next) => {
    const id = req.header('x-user-id');
    if (!id) return next(new UnauthorizedError());
    directory
      .findUser(id)
      .then((user) => {
        if (!user) throw new UnauthorizedError(`Utilisateur inconnu : ${id}`);
        req.user = user;
        next();
      })
      .catch(next);
  };

/** RBAC : n'autorise que les rôles listés. */
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Rôle requis : ${roles.join(' ou ')}`));
    }
    next();
  };

export function currentUser(req: Request): User {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Route inconnue : ${req.method} ${req.originalUrl}`));
};

export const errorHandler: ErrorRequestHandler = (err, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Données invalides', details: err.issues },
    });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erreur interne' } });
};
