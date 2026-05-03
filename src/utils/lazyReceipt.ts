// Lazy wrapper that defers loading jsPDF (and its html2canvas dep) until
// the user actually downloads a receipt. Keeps these heavy libs out of
// the initial bundle without changing any calling code's behavior.
export const downloadReceipt = async (data: Parameters<typeof import('./generateReceipt').downloadReceipt>[0]) => {
  const mod = await import('./generateReceipt');
  return mod.downloadReceipt(data);
};
