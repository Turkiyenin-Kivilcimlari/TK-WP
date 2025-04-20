import { UserRole } from '@/models/User';
import { JwtPayload } from 'jsonwebtoken';

export interface CustomJwtPayload extends JwtPayload {
  id: string;
  role: UserRole;
  email: string;
}
