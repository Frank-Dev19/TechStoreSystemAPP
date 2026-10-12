export function automaticCustomerConcept(lines: Array<{ type: string; quantity: number; productId?: number | null; name: string }>): string {
  const services = new Set<string>();
  const products = new Map<string, { name: string; quantity: number }>();
  for (const line of lines) {
    const quantity = Number(line.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    const name = String(line.name || '').replace(/\s+/g, ' ').trim();
    if (line.type === 'service') services.add(!name || /^Servicio #\d+$/i.test(name) ? 'Servicio técnico' : name);
    else if (line.type === 'product') {
      const key = JSON.stringify([line.productId ?? null, name]);
      products.set(key, { name, quantity: (products.get(key)?.quantity ?? 0) + quantity });
    }
  }
  return [...services, ...Array.from(products.values(), p => `${Number(p.quantity.toFixed(2))} ${p.name}`)].join(' + ') || 'Servicio técnico';
}
