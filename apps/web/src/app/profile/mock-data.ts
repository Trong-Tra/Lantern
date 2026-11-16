// Fictional development fixtures, never wallet or market data.
export const mockTokens = [
  { symbol: "MON", name: "Monad", amount: 12500, price: 0.48, change: 5.24, color: "#e8ad35" },
  { symbol: "USDC", name: "USD Coin", amount: 4250, price: 1, change: 0.01, color: "#22b8aa" },
  { symbol: "ETH", name: "Ethereum", amount: 0.75, price: 3200, change: -1.32, color: "#a375eb" },
];
export const mockTotal = mockTokens.reduce((sum, token) => sum + token.amount * token.price, 0);
export const mockHistory = [
  { action: "Swap", detail: "250 USDC → 520.83 MON", time: "Today, 14:32", status: "Completed" },
  { action: "Receive", detail: "1,000 USDC", time: "Yesterday, 09:15", status: "Completed" },
  { action: "Swap", detail: "0.1 ETH → 320 USDC", time: "Nov 12, 18:40", status: "Completed" },
];
export const mockOrders = [
  { action: "Limit buy", detail: "1,000 MON", time: "Limit price: $0.42", status: "Open" },
  { action: "Limit sell", detail: "0.25 ETH", time: "Limit price: $3,500.00", status: "Open" },
];
export const mockPositions = [
  { name: "MON / USDC", protocol: "Mock liquidity pool", value: 1800, detail: "12.4% illustrative APR" },
  { name: "Staked MON", protocol: "Mock staking position", value: 960, detail: "2,000 MON · 4.8% illustrative APR" },
];
export const mockChartValues: Record<string, number[]> = {
  "1D": [12200, 12280, 12240, 12420, 12320, 12530, 12480, 12600, 12550, mockTotal],
  "1W": [11500, 11700, 11620, 11900, 11800, 12140, 12030, 12320, 12240, mockTotal],
  "1M": [9800, 10400, 10100, 11000, 10600, 11500, 11200, 12100, 11800, mockTotal],
  "1Y": [4000, 5800, 5200, 7400, 6800, 8900, 8100, 10400, 9800, mockTotal],
  All: [1000, 2800, 2300, 4500, 3800, 6200, 5800, 9100, 8500, mockTotal],
};
export function mockChartPath(period: string) {
  const values = mockChartValues[period] ?? mockChartValues["1W"];
  const low = Math.min(...values);
  const range = Math.max(...values) - low || 1;
  return values.map((value, index) => `${index ? "L" : "M"}${index * 1000 / (values.length - 1)} ${260 - (value - low) / range * 220}`).join(" ");
}
