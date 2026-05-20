import { create } from 'zustand';
import { registerSession } from '../services/licenciaService';

let _heartbeatTimer = null;

const useLicenciaStore = create((set) => ({
  checking: false,
  resultado: null,
  setChecking: (v) => set({ checking: v }),
  setResultado: (r) => set({ resultado: r, checking: false }),
  startHeartbeat: (key) => {
    if (_heartbeatTimer) clearInterval(_heartbeatTimer);
    _heartbeatTimer = setInterval(() => { registerSession(key); }, 9 * 60 * 1000);
  },
  stopHeartbeat: () => {
    if (_heartbeatTimer) { clearInterval(_heartbeatTimer); _heartbeatTimer = null; }
  },
}));

export default useLicenciaStore;
