import { create } from 'zustand';

const TOKEN_KEY = 'ferreteria_token';

const useAuthStore = create((set) => ({
  token: localStorage.getItem(TOKEN_KEY) || null,
  usuario: null,

  setAuth: (token, usuario) => {
    localStorage.setItem(TOKEN_KEY, token);
    set({ token, usuario });
  },

  clearAuth: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ token: null, usuario: null });
  }
}));

export default useAuthStore;
