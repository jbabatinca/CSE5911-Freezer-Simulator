export type UserRole = 'admin' | 'user';

interface AuthState {
  isAuthenticated: boolean;
  role: UserRole;
  adminPassword: string;
}

const DEFAULT_PASSWORD = '123456';
const STORAGE_KEY = 'freezer_app_auth';

let authState: AuthState = {
  isAuthenticated: false,
  role: 'user',
  adminPassword: DEFAULT_PASSWORD,
};

export function initializeAuth(): void {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      authState = JSON.parse(stored);
    } catch (e) {
      authState = {
        isAuthenticated: false,
        role: 'user',
        adminPassword: DEFAULT_PASSWORD,
      };
    }
  }
}

export function isAdminAuthenticated(): boolean {
  return authState.isAuthenticated && authState.role === 'admin';
}

export function getCurrentUserRole(): UserRole {
  return authState.role;
}

export function authenticateAdmin(password: string): boolean {
  if (password === authState.adminPassword) {
    authState.isAuthenticated = true;
    authState.role = 'admin';
    saveAuthState();
    return true;
  }
  return false;
}

export function switchToUserMode(): void {
  authState.isAuthenticated = false;
  authState.role = 'user';
  saveAuthState();
}

export function logout(): void {
  authState.isAuthenticated = false;
  authState.role = 'user';
  saveAuthState();
}

export function changeAdminPassword(oldPassword: string, newPassword: string): boolean {
  if (oldPassword === authState.adminPassword) {
    authState.adminPassword = newPassword;
    saveAuthState();
    return true;
  }
  return false;
}

export function getAdminPassword(): string {
  return authState.adminPassword;
}

function saveAuthState(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(authState));
}
