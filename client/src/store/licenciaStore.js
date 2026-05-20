import { create } from 'zustand';

const useLicenciaStore = create((set) => ({
  checking: false,
  resultado: null,
  setChecking: (v) => set({ checking: v }),
  setResultado: (r) => set({ resultado: r, checking: false }),
}));

export default useLicenciaStore;
