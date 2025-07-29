export class Admin {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string; // e.g., 'admin'
  profileImage?: string;
  refreshToken?: string;
}
