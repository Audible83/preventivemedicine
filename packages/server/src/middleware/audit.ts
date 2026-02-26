import { Request, Response, NextFunction } from 'express';
import { logAuditEvent } from '../db/queries.js';

export function auditMiddleware(action: string, resource: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (req.user) {
      try {
        await logAuditEvent({
          userId: req.user.userId,
          action,
          resource,
          resourceId: req.params.id as string | undefined,
          details: { method: req.method, path: req.path },
        });
      } catch (err) {
        console.error('Audit log failed:', err);
      }
    }
    next();
  };
}
