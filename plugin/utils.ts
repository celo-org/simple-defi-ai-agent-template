import { Token } from '@uniswap/sdk-core';
import { FeeAmount } from './constants';

// Convert amount to readable format (from wei to token)
export function toReadableAmount(rawAmount: bigint, decimals: number): string {
  return (Number(rawAmount) / 10 ** decimals).toString();
}

// Convert readable amount to wei format
export function fromReadableAmount(amount: number, decimals: number): bigint {
  return BigInt(Math.floor(amount * 10 ** decimals));
}

// Compute key for token pair - ensures consistent ordering regardless of input order
export function getTokenPairKey(tokenA: Token, tokenB: Token, fee: FeeAmount): string {
  const [token0, token1] = tokenA.sortsBefore(tokenB) 
    ? [tokenA, tokenB] 
    : [tokenB, tokenA];
    
  return `${token0.address}:${token1.address}:${fee}`;
}
