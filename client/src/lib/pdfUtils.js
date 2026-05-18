function showToast(msg, isError = false) {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = [
    'position:fixed', 'bottom:24px', 'right:24px', 'z-index:9999',
    `background:${isError ? '#ef4444' : '#22c55e'}`, 'color:#fff',
    'padding:10px 18px', 'border-radius:8px', 'font-size:14px',
    'box-shadow:0 4px 12px rgba(0,0,0,0.18)', 'transition:opacity 0.3s',
    'pointer-events:none'
  ].join(';');
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

export const savePdf = async (blob, tipo, filename) => {
  try {
    if (window.electronAPI?.savePdf) {
      const arrayBuffer = await blob.arrayBuffer();
      const filePath = await window.electronAPI.savePdf(tipo, filename, arrayBuffer);
      showToast(`PDF guardado: ${filePath}`);
    } else {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  } catch (err) {
    console.error('Error al guardar PDF:', err);
    showToast('No se pudo guardar el PDF', true);
  }
};
