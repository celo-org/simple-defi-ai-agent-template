import { Tool } from "@goat-sdk/core";
import { EVMWalletClient } from "@goat-sdk/wallet-evm";
import { Token } from "@uniswap/sdk-core";
import { computePoolAddress } from "@uniswap/v3-sdk";
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";
import {
  FeeAmount,
  POOL_ABI,
  POOL_FACTORY_CONTRACT_ADDRESS,
  QUOTER_ABI,
  QUOTER_CONTRACT_ADDRESS,
  SUPPORTED_TOKENS,
} from "./constants";
import { GetQuoteParameters } from "./parameters";
import type { UniswapCtorParams } from "./types/UniswapCtorParams";

export class UniswapService {
  constructor(private readonly params: UniswapCtorParams) {}

  // Create a public client to interact with the blockchain
  private getPublicClient() {
    return createPublicClient({
      chain: celo,
      transport: http(),
    });
  }

  // Get pool address using Uniswap SDK
  private getPoolAddress(tokenA: Token, tokenB: Token, fee: FeeAmount): string {
    return computePoolAddress({
      factoryAddress: POOL_FACTORY_CONTRACT_ADDRESS,
      tokenA,
      tokenB,
      fee,
    });
  }

  // Get pool information (token0, token1, fee)
  private async getPoolConstants(poolAddress: string) {
    const publicClient = this.getPublicClient();

    // Use publicClient directly for contract reads
    const [token0, token1, fee] = await Promise.all([
      publicClient.readContract({
        address: poolAddress as `0x${string}`,
        abi: POOL_ABI,
        functionName: "token0",
      }),
      publicClient.readContract({
        address: poolAddress as `0x${string}`,
        abi: POOL_ABI,
        functionName: "token1",
      }),
      publicClient.readContract({
        address: poolAddress as `0x${string}`,
        abi: POOL_ABI,
        functionName: "fee",
      }),
    ]);

    return {
      token0,
      token1,
      fee: Number(fee),
    };
  }

  // Note: A proper approval function would be implemented here
  // For now we're focusing only on the quote functionality as requested

  @Tool({
    name: "uniswap_get_quote",
    description: "Get the quote for a swap using Uniswap V3. Supported token symbols: CELO, cUSD, cEUR.",
  })
  async getQuote(
    walletClient: EVMWalletClient,
    parameters: GetQuoteParameters
  ) {
    const publicClient = this.getPublicClient();
    try {
      // Map token symbols to Token objects
      const getTokenBySymbol = (symbol: string): Token => {
        const token = SUPPORTED_TOKENS[symbol.toUpperCase()];
        if (!token) {
          throw new Error(`Unsupported token symbol: ${symbol}`);
        }
        return token;
      };

      const tokenIn = getTokenBySymbol(parameters.tokenIn);
      const tokenOut = getTokenBySymbol(parameters.tokenOut);

      // Use lowest fee for CELO/cUSD (100 = 0.01%)
      const poolFee = FeeAmount.LOWEST;

      // Get pool address
      const poolAddress = this.getPoolAddress(tokenIn, tokenOut, poolFee);
      console.log("Computed Pool Address:", poolAddress);

      // Get pool constants
      let poolConstants;
      try {
        poolConstants = await this.getPoolConstants(poolAddress);
        console.log("Pool Constants (token0, token1, fee):");
        console.log("  Token0:", poolConstants.token0);
        console.log("  Token1:", poolConstants.token1);
        console.log("  Fee:", poolConstants.fee);
      } catch (error) {
        console.error(`Error getting pool constants for ${poolAddress}:`, error);
        throw new Error(`Failed to get pool constants. The pool may not exist.`);
      }

      // Read slot0 from the pool to check initialization and pricing
      try {
        const slot0 = await publicClient.readContract({
          address: poolAddress as `0x${string}`,
          abi: POOL_ABI,
          functionName: 'slot0',
        }) as [bigint, number, number, number, number, number, boolean];
        console.log("Pool Slot0 (sqrtPriceX96, tick, unlocked):");
        console.log("  sqrtPriceX96:", slot0[0]);
        console.log("  tick:", slot0[1]);
        console.log("  unlocked:", slot0[6]);
        if (slot0[0] === 0n) {
          throw new Error('Pool is not initialized; sqrtPriceX96 is 0.');
        }
      } catch (error) {
        console.error(`Error reading slot0 for ${poolAddress}:`, error);
        throw new Error(`Failed to read slot0. The pool may not be initialized.`);
      }
      
      // Read liquidity from the pool
      try {
        const liquidity = await publicClient.readContract({
          address: poolAddress as `0x${string}`,
          abi: POOL_ABI,
          functionName: 'liquidity',
        });
        console.log("Pool Liquidity:", liquidity);
        if (liquidity === 0n) {
          console.warn("Warning: Pool has no liquidity.");
        }
      } catch (error) {
        console.error(`Error reading liquidity for ${poolAddress}:`, error);
        throw new Error(`Failed to read liquidity. The pool may not exist.`);
      }

      // Parse the input amount
      const amountIn = BigInt(parameters.amount);

      // Call the quoter contract
      let quotedAmountOut;
      try {
        quotedAmountOut = (await publicClient.readContract({
          address: QUOTER_CONTRACT_ADDRESS as `0x${string}`,
          abi: QUOTER_ABI,
          functionName: "quoteExactInputSingle",
          args: [
            poolConstants.token0 as `0x${string}`,
            poolConstants.token1 as `0x${string}`,
            BigInt(poolConstants.fee),
            amountIn,
            0n, // sqrtPriceLimitX96
          ],
        })) as bigint;
      } catch (error) {
        console.error('Error calling quoteExactInputSingle:', error);
        throw new Error('Quoting failed, which may be due to insufficient liquidity.');
      }

      // Format the response similar to the API format
      return {
        quote: {
          chainId: walletClient.getChain().id,
          tokenIn: parameters.tokenIn,
          tokenOut: parameters.tokenOut,
          amountIn: parameters.amount,
          amountOut: quotedAmountOut.toString(),
          fee: poolConstants.fee,
          priceImpact: 0, // Would require additional calculation
          route: [
            {
              tokenIn: parameters.tokenIn,
              tokenOut: parameters.tokenOut,
              fee: poolConstants.fee,
            },
          ],
        },
      };
    } catch (error: any) {
      console.error("Error getting quote:", error);
      let errorMessage = "Unknown error occurred while getting quote.";

      if (error.shortMessage) {
        errorMessage = `Contract call reverted: ${error.shortMessage}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      throw new Error(`Failed to get quote: ${errorMessage}. This might be due to insufficient liquidity or an invalid swap path.`);
    }
  }

  // Note: A proper swap function would be implemented here
  // For now we're focusing only on the quote functionality as requested
}
