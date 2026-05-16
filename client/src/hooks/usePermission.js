import useAuthStore from '../store/authStore';

export function usePermission(modulo, accion) {
  const permisos = useAuthStore((s) => s.usuario?.permisos);
  if (!permisos) return false;
  if (permisos.all) return true;
  return permisos[modulo]?.[accion] === true;
}
