import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const AuditContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return {
      user: request.user,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    };
  },
);
