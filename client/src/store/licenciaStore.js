import { create } from 'zustand';
import api from '../lib/api';
import { getSessionId } from '../services/licenciaService';

let _heartbeatTimer = null;

const useLicenciaStore = create((set) => ({
  checking: false,
  resultado: null,
  sesiones: null,
  setChecking: (v) => set({ checking: v }),
  setResultado: (r) => set({ resultado: r, checking: false }),
  setSesiones: (s) => set({ sesiones: s }),
  startHeartbeat: () => {
    if (_heartbeatTimer) clearInterval(_heartbeatTimer);
    const beat = () => api.post('/auth/heartbeat', { session_id: getSessionId() })
      .then(({ data }) => { if (data.sesiones) set({ sesiones: data.sesiones }); })
      .catch(() => {});
    beat();
    _heartbeatTimer = setInterval(beat, 9 * 60 * 1000);
  },
  stopHeartbeat: () => {
    if (_heartbeatTimer) { clearInterval(_heartbeatTimer); _heartbeatTimer = null; }
  },
}));

export default useLicenciaStore;
