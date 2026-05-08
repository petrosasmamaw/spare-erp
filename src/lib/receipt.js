export function generateReceipt(order) {
  const lines = [];

  lines.push('\x1B\x40'); // init

  lines.push("My ERP Shop\n");
  lines.push("--------------------------\n");

  order.items.forEach((item) => {
    const name = item.name || "item";
    const qty = item.qty || 1;
    const price = Number(item.price || 0).toFixed(2);
    lines.push(`${name} ${qty} x ${price}\n`);
  });

  lines.push("--------------------------\n");
  lines.push(`TOTAL: ${Number(order.total || 0).toFixed(2)}\n\n`);

  lines.push('\x1D\x56\x00'); // cut

  return lines;
}
