export const savePdf = async (blob, tipo, filename) => {
  if (window.electronAPI?.savePdf) {
    const arrayBuffer = await blob.arrayBuffer();
    await window.electronAPI.savePdf(tipo, filename, arrayBuffer);
  } else {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }
};
