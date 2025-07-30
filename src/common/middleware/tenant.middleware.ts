import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { tenantContext } from '../context/tenant.context';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'] as string; // Assuming tenant ID is passed in a custom header

    if (tenantId) {
      tenantContext.run({ tenantId }, () => {
        next();
      });
    } else {
      // If no tenant ID is provided, run with a default context or throw an error
      // For now, we'll run with an undefined tenantId, which will default to 'public' schema
      tenantContext.run({ tenantId: undefined }, () => {
        next();
      });
    }
  }
}
