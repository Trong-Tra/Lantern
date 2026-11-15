// Fictional development fixtures, never market prices or wallet balances.
export const mockAssets: Record<
  string,
  { price: number; balance: number; change: number }
> = {
  MON: { price: 0.042, balance: 12500, change: 4.82 },
  USDC: { price: 1, balance: 2500, change: 0.01 },
  ETH: { price: 3200, balance: 0.85, change: 2.36 },
};

export function getMockQuote(
  amount: string,
  sell: string,
  buy: string,
  slippage: string,
  limit = ""
) {
  const quantity = Number(amount);
  const tolerance = Number(slippage);
  const target = Number(limit);
  if (
    !mockAssets[sell] ||
    !mockAssets[buy] ||
    sell === buy ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    quantity > mockAssets[sell].balance ||
    !Number.isFinite(tolerance) ||
    tolerance < 0 ||
    tolerance > 100 ||
    (limit !== "" && (!Number.isFinite(target) || target <= 0))
  )
    return null;
  const rate =
    limit === "" ? mockAssets[buy].price / mockAssets[sell].price : target;
  const received = (quantity / rate) * 0.997;
  if (!Number.isFinite(received)) return null;
  return {
    received,
    minimum: received * (1 - tolerance / 100),
    fee: quantity * mockAssets[sell].price * 0.003,
  };
}
