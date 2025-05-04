import { Request } from 'express';
import { User } from '../../users/entities/user.entity';

export interface RequestWithUser extends Request {
  user: {
    id: string;
    userId: string;
    [key: string]: any;
  };
} 