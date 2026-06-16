import { create } from 'zustand';
import { authApi } from '../lib/api';

interface UserInfo {
  username: string;
  full_name: string;
  email: string;
  bio?: string;
  avatar?: string | null;
}

interface AuthState {
  isAuthenticated: boolean;
  isViewMode: boolean;
  user: UserInfo | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  restore: () => void;
  updateUser: (data: Partial<UserInfo>) => void;
  loginAsViewer: () => Promise<void>;
}

const VIEWER_EMAIL = 'amelitalayam@gmail.com';
const VIEWER_PASS = 'ilovemyfamily20';

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: !!localStorage.getItem('auth_token') && localStorage.getItem('view_mode') !== 'true',
  isViewMode: localStorage.getItem('view_mode') === 'true',
  user: (() => {
    const stored = localStorage.getItem('auth_user');
    return stored ? JSON.parse(stored) : null;
  })(),

  login: async (username: string, password: string) => {
    const data = await authApi.login(username, password);
    const userInfo: UserInfo = {
      username: data.username,
      full_name: data.full_name,
      email: data.email,
      bio: data.bio,
      avatar: data.avatar
    };
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_user', JSON.stringify(userInfo));
    localStorage.removeItem('view_mode');
    set({ isAuthenticated: true, isViewMode: false, user: userInfo });
  },

  register: async (username: string, email: string, password: string, fullName: string) => {
    const data = await authApi.register(username, email, password, fullName);
    const userInfo: UserInfo = {
      username: data.username,
      full_name: data.full_name,
      email: data.email,
      bio: data.bio,
      avatar: data.avatar
    };
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_user', JSON.stringify(userInfo));
    localStorage.removeItem('view_mode');
    set({ isAuthenticated: true, isViewMode: false, user: userInfo });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch (_) {
      // Even if server call fails, clear local state
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('view_mode');
    set({ isAuthenticated: false, isViewMode: false, user: null });
  },

  restore: () => {
    const token = localStorage.getItem('auth_token');
    const stored = localStorage.getItem('auth_user');
    const viewMode = localStorage.getItem('view_mode') === 'true';
    if (token && stored) {
      set({
        isAuthenticated: !viewMode,
        isViewMode: viewMode,
        user: JSON.parse(stored),
      });
    }
  },

  updateUser: (data: Partial<UserInfo>) => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, ...data };
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      return { user: updatedUser };
    });
  },

  loginAsViewer: async () => {
    try {
      const data = await authApi.login(VIEWER_EMAIL, VIEWER_PASS);
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify({
        username: data.username,
        full_name: data.full_name,
        email: data.email,
      }));
      localStorage.setItem('view_mode', 'true');
      set({
        isAuthenticated: false,
        isViewMode: true,
        user: {
          username: data.username,
          full_name: data.full_name,
          email: data.email,
        },
      });
    } catch (e) {
      console.error('Viewer auto-login failed:', e);
    }
  },
}));
