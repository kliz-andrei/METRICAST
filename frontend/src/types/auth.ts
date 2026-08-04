export type UserRole = 'ADMINISTRATOR' | 'MANAGER' | 'STAFF';
export type AuthUser = { id: string; email: string; firstName: string; lastName: string; role: UserRole; isActive: boolean };
export type LoginResponse = { user: AuthUser; accessToken: string; accessTokenExpiresIn: string };
