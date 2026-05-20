import { create } from 'zustand';
import api from '../lib/api';
import { getSessionId } from '../services/licenciaService';

let _heartbeatTimer = null;

const useLicenciaStore = create((set) => ({
  checking: false,
  resultado: null,
  setChecking: (v) => set({ checking: v }),
  setResultado: (r) => set({ resultado: r, checking: false }),
  startHeartbeat: () => {
    if (_heartbeatTimer) clearInterval(_heartbeatTimer);
    const beat = () => api.post('/auth/heartbeat', { session_id: getSessionId() }).catch(() => {});
    beat();
    _heartbeatTimer = setInterval(beat, 9 * 60 * 1000);
  },
  stopHeartbeat: () => {
    if (_heartbeatTimer) { clearInterval(_heartbeatTimer); _heartbeatTimer = null; }
  },
}));

export default useLicenciaStore;
