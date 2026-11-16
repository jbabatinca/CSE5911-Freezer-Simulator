/**
 * authState.ts - simple admin login state for the app.
 * Tracks whether the visitor is an admin, holds the admin password, and
 * persists both in localStorage under "freezer_app_auth". This is a
 * convenience gate for a training tool, not secure authentication.
 */

/** The two kinds of users: 'admin' can configure layouts and question sets; 'user' can only view and train. */
export type UserRole = 'admin' | 'user';

// Persisted login state. Note adminPassword is stored in plain text in localStorage.
interface AuthState {
  isAuthenticated: boolean;
  role: UserRole;
  adminPassword: string;
}

// Admin password used until it is changed in Admin Settings.
// Not real security: this runs client-side and is visible in the source.
const DEFAULT_PASSWORD = '123456';
// localStorage key for the saved AuthState (login status, role, password).
const STORAGE_KEY = 'freezer_app_auth';

// In-memory copy of the auth state; kept in sync with localStorage by saveAuthState().
let authState: AuthState = {
  isAuthenticated: false,
  role: 'user',
  adminPassword: DEFAULT_PASSWORD,
};

/** Loads saved auth state from localStorage at startup; falls back to logged-out defaults if it is corrupt. */
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

/** Returns true only when currently logged in as admin. */
export function isAdminAuthenticated(): boolean {
  return authState.isAuthenticated && authState.role === 'admin';
}

/** Returns the current role ('admin' or 'user'). */
export function getCurrentUserRole(): UserRole {
  return authState.role;
}

/** Logs in as admin if `password` matches; saves the state and returns true, otherwise returns false. */
export function authenticateAdmin(password: string): boolean {
  if (password === authState.adminPassword) {
    authState.isAuthenticated = true;
    authState.role = 'admin';
    saveAuthState();
    return true;
  }
  return false;
}

/** Drops admin access and switches to the 'user' role (saved). */
export function switchToUserMode(): void {
  authState.isAuthenticated = false;
  authState.role = 'user';
  saveAuthState();
}

/** Logs out; same effect as switchToUserMode (separate name so call sites read clearly). */
export function logout(): void {
  authState.isAuthenticated = false;
  authState.role = 'user';
  saveAuthState();
}

/** Sets a new admin password if `oldPassword` is correct. Returns true on success, false if the old password is wrong. */
export function changeAdminPassword(oldPassword: string, newPassword: string): boolean {
  if (oldPassword === authState.adminPassword) {
    authState.adminPassword = newPassword;
    saveAuthState();
    return true;
  }
  return false;
}

/** Returns the current admin password (plain text). */
export function getAdminPassword(): string {
  return authState.adminPassword;
}

// Writes the current auth state to localStorage.
function saveAuthState(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(authState));
}
