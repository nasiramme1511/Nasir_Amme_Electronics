'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export interface AuthenticatedUser {
  id: string;
  shopId: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: string;
  roles: string[];
  permissions: string[];
}

interface AuthContextType {
  user: AuthenticatedUser | null;
  roles: string[];
  permissions: string[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (code: string) => boolean;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.user) {
          setUser(json.data.user);
          return;
        }
      }
      setUser(null);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) {
          if (typeof document !== 'undefined') {
            document.cookie =
              'nae_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
            document.cookie =
              'nae_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
          }
          return null;
        }
        return res.json();
      })
      .then((json) => {
        if (!isMounted) return;
        if (json?.success && json?.data?.user) {
          setUser(json.data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        if (isMounted) setUser(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Route protection redirect for unauthenticated users
  useEffect(() => {
    if (!isLoading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [isLoading, user, pathname, router]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return {
          success: false,
          error: json.error?.message || 'Login failed. Please check your credentials.',
        };
      }

      setUser(json.data.user);
      router.push('/');
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error during login.',
      };
    }
  };

  const logout = async () => {
    try {
      if (typeof document !== 'undefined') {
        document.cookie =
          'nae_session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        document.cookie =
          'nae_user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      }
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Logout network notice:', err);
    } finally {
      setUser(null);
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = '/login?logged_out=1';
      } else {
        router.push('/login?logged_out=1');
      }
    }
  };

  const hasPermission = (code: string): boolean => {
    if (!user) return false;
    if (user.roles.includes('admin')) return true;
    return user.permissions.includes(code);
  };

  const hasRole = (...targetRoles: string[]): boolean => {
    if (!user) return false;
    if (user.roles.includes('admin')) return true;
    return user.roles.some((r) => targetRoles.includes(r));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        roles: user?.roles ?? [],
        permissions: user?.permissions ?? [],
        isLoading,
        login,
        logout,
        refreshUser,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
