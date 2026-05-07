import { Request, Response, NextFunction } from 'express';
import { auditService } from '../infrastructure/audit';

export const auditMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const originalSend = res.send;

  res.send = function (data: any) {
    const user = (req as any).user;
    const tenantId = req.params.tenantId || req.query.tenantId || user?.tenantId;

    // Log apenas operações que modificam dados
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && res.statusCode < 300) {
      const resourceMatch = req.path.match(/\/api\/([^/]+)/);
      const resource = resourceMatch?.[1] || 'unknown';
      const resourceId = req.params.id || 'unknown';

      if (tenantId) {
        auditService.logAction(
          tenantId,
          req.method,
          resource,
          resourceId,
          req.body,
          user?.id,
          req.ip,
          req.get('user-agent')
      ).catch((err: Error) => console.error('Audit log error:', err));
      }
    }

    return originalSend.call(this, data);
  };

  next();
};
