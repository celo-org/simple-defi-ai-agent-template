import { Tool } from "@goat-sdk/core";
import { EVMWalletClient } from "@goat-sdk/wallet-evm";
import { Token } from "@uniswap/sdk-core";
import IUniswapV3PoolABIJson from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";
import ISwapRouterABIJson from "@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json";
import QuoterV2ABIJson from "@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json";
import SwapRouterV2ABI from "./abis/SwapRouterV2.json";

// Create properly typed versions of the ABIs
const IUniswapV3PoolABI = IUniswapV3PoolABIJson.abi as Abi;
const ISwapRouterABI = ISwapRouterABIJson.abi as Abi;
const QuoterV2ABI = QuoterV2ABIJson.abi as Abi;

import { computePoolAddress } from "@uniswap/v3-sdk";
import { Abi, createPublicClient, http } from "viem";
import { celo } from "viem/chains";

import {
  FeeAmount,
  POOL_FACTORY_CONTRACT_ADDRESS,
  QUOTER_CONTRACT_ADDRESS,
  SUPPORTED_TOKENS,
} from "./constants";
import {
  ExecuteSwapParameters,
  GetQuoteParameters,
  Routing,
  SwapType,
} from "./parameters";
import type { UniswapCtorParams } from "./types/UniswapCtorParams";

// ERC20 ABI for token approvals
const ERC20_ABI = [
  {
    type: "function",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const as Abi;

// Official Uniswap V3 SwapRouterV2 address on Celo
const SWAP_ROUTER_ADDRESS =
  "0x5615CDAb10dc425a742d643d949a7F474C01abc4" as `0x${string}`;

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
        abi: IUniswapV3PoolABI,
        functionName: "token0",
      }),
      publicClient.readContract({
        address: poolAddress as `0x${string}`,
        abi: IUniswapV3PoolABI,
        functionName: "token1",
      }),
      publicClient.readContract({
        address: poolAddress as `0x${string}`,
        abi: IUniswapV3PoolABI,
        functionName: "fee",
      }),
    ]);

    return {
      token0,
      token1,
      fee: Number(fee),
    };
  }

  // Approve tokens for swap
  private async approveToken(
    walletClient: EVMWalletClient,
    tokenAddress: string,
    spenderAddress: string,
    amount: bigint
  ) {
    try {
      // Send the approval transaction using the EVMWalletClient
      const result = await walletClient.sendTransaction({
        to: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [spenderAddress as `0x${string}`, amount],
      });

      const hash = result.hash as `0x${string}`;

      // Wait for the transaction to be mined
      const publicClient = this.getPublicClient();
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      return receipt;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to approve tokens: ${errorMessage}`);
    }
  }

  // Check if approval is needed
  private async checkAndApproveTokenAllowance(
    walletClient: EVMWalletClient,
    tokenAddress: string,
    spenderAddress: string,
    amount: bigint
  ) {
    try {
      const publicClient = this.getPublicClient();
      const account = walletClient.getAddress();

      // Check current allowance
      const currentAllowance = (await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [account as `0x${string}`, spenderAddress as `0x${string}`],
      })) as bigint;

      // If current allowance is less than the amount, approve
      if (currentAllowance < amount) {
        return await this.approveToken(
          walletClient,
          tokenAddress,
          spenderAddress,
          amount
        );
      }

      return null; // No approval needed
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to check token allowance: ${errorMessage}`);
    }
  }

  @Tool({
    name: "uniswap_get_quote",
    description:
      "Get the quote for a swap using Uniswap V3. Supported token symbols: CELO, cUSD, cEUR.",
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

      // Get pool constants
      let poolConstants;
      try {
        poolConstants = await this.getPoolConstants(poolAddress);
      } catch (error) {
        throw new Error(
          `Failed to get pool constants. The pool may not exist.`
        );
      }

      // Read slot0 from the pool to check initialization and pricing
      try {
        const slot0 = (await publicClient.readContract({
          address: poolAddress as `0x${string}`,
          abi: IUniswapV3PoolABI,
          functionName: "slot0",
        })) as [bigint, number, number, number, number, number, boolean];

        if (slot0[0] === 0n) {
          throw new Error("Pool is not initialized; sqrtPriceX96 is 0.");
        }
      } catch (error) {
        throw new Error(
          `Failed to read slot0. The pool may not be initialized.`
        );
      }

      // Read liquidity from the pool
      try {
        const liquidity = await publicClient.readContract({
          address: poolAddress as `0x${string}`,
          abi: IUniswapV3PoolABI,
          functionName: "liquidity",
        });
        if (liquidity === 0n) {
          // Pool has no liquidity, but we'll try to get a quote anyway
        }
      } catch (error) {
        throw new Error(`Failed to read liquidity. The pool may not exist.`);
      }

      // Parse the input amount
      const amountIn = BigInt(parameters.amount);

      // Call the quoter contract
      let quotedAmountOut;
      try {
        const quoteResult = (await publicClient.readContract({
          address: QUOTER_CONTRACT_ADDRESS as `0x${string}`,
          abi: QuoterV2ABI,
          functionName: "quoteExactInputSingle",
          args: [
            {
              tokenIn: tokenIn.address as `0x${string}`,
              tokenOut: tokenOut.address as `0x${string}`,
              amountIn,
              fee: poolFee,
              sqrtPriceLimitX96: 0n, // Passing 0 since we don't want to impose a price limit
            },
          ],
        })) as [bigint, bigint, number, bigint];
        quotedAmountOut = quoteResult[0];
      } catch (error) {
        throw new Error(
          "Quoting failed, which may be due to insufficient liquidity."
        );
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
      let errorMessage = "Unknown error occurred while getting quote.";

      if (error.shortMessage) {
        errorMessage = `Contract call reverted: ${error.shortMessage}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      throw new Error(
        `Failed to get quote: ${errorMessage}. This might be due to insufficient liquidity or an invalid swap path.`
      );
    }
  }

  @Tool({
    name: "uniswap_execute_swap",
    description:
      "Execute a token swap using Uniswap V3. Supported token symbols: CELO, cUSD, cEUR. ",
  })
  async executeSwap(
    walletClient: EVMWalletClient,
    parameters: ExecuteSwapParameters
  ) {
    try {
      const publicClient = this.getPublicClient();

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

      // Parse the input amount
      const amountIn = BigInt(parameters.amount);

      // Calculate deadline (default to 20 minutes if not specified)
      const deadline =
        Math.floor(Date.now() / 1000) + (parameters.deadline || 20) * 60;

      // Calculate slippage tolerance (convert from percentage to bps)
      const slippageTolerance = parameters.slippageTolerance || 5.0; // Increase default slippage to 5%
      const slippageToleranceBps = Math.floor(slippageTolerance * 100); // Convert to basis points

      // Get a quote first to calculate minimum amount out with slippage
      const quoteResult = await this.getQuote(walletClient, {
        tokenIn: parameters.tokenIn,
        tokenOut: parameters.tokenOut,
        amount: parameters.amount,
        type: SwapType.EXACT_INPUT,
        routingPreference: Routing.CLASSIC,
      });

      const amountOut = BigInt(quoteResult.quote.amountOut);

      // Calculate minimum amount out with slippage
      const minimumAmountOut =
        amountOut - (amountOut * BigInt(slippageToleranceBps)) / BigInt(10000);

      // Validate that we have a reasonable quote
      if (amountOut === 0n) {
        throw new Error("No liquidity available for this swap");
      }

      // Check and approve token if needed - CELO is also ERC20 on Celo network
      await this.checkAndApproveTokenAllowance(
        walletClient,
        tokenIn.address,
        SWAP_ROUTER_ADDRESS,
        amountIn
      );

      // Use a higher fee tier if the default doesn't work
      let poolFeeToUse = poolFee;

      // Try to find a pool with liquidity
      const poolAddress = await publicClient.readContract({
        address: POOL_FACTORY_CONTRACT_ADDRESS as `0x${string}`,
        abi: [
          {
            inputs: [
              { name: "tokenA", type: "address" },
              { name: "tokenB", type: "address" },
              { name: "fee", type: "uint24" },
            ],
            name: "getPool",
            outputs: [{ name: "pool", type: "address" }],
            stateMutability: "view",
            type: "function",
          },
        ],
        functionName: "getPool",
        args: [
          tokenIn.address as `0x${string}`,
          tokenOut.address as `0x${string}`,
          poolFeeToUse,
        ],
      });

      // If pool doesn't exist, try other fee tiers
      if (poolAddress === "0x0000000000000000000000000000000000000000") {
        poolFeeToUse = FeeAmount.MEDIUM;

        const mediumPoolAddress = await publicClient.readContract({
          address: POOL_FACTORY_CONTRACT_ADDRESS as `0x${string}`,
          abi: [
            {
              inputs: [
                { name: "tokenA", type: "address" },
                { name: "tokenB", type: "address" },
                { name: "fee", type: "uint24" },
              ],
              name: "getPool",
              outputs: [{ name: "pool", type: "address" }],
              stateMutability: "view",
              type: "function",
            },
          ],
          functionName: "getPool",
          args: [
            tokenIn.address as `0x${string}`,
            tokenOut.address as `0x${string}`,
            poolFeeToUse,
          ],
        });

        if (
          mediumPoolAddress === "0x0000000000000000000000000000000000000000"
        ) {
          throw new Error(
            `No liquidity pool found for ${parameters.tokenIn}/${parameters.tokenOut}`
          );
        }
      }

      // Prepare swap parameters with proper deadline (using existing deadline variable)
      const params = {
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        fee: poolFeeToUse,
        recipient: walletClient.getAddress(),
        deadline: BigInt(deadline),
        amountIn,
        amountOutMinimum: minimumAmountOut,
        sqrtPriceLimitX96: 0n, // No price limit
      };

      // Execute the swap using the correct parameter structure
      const result = await walletClient.sendTransaction({
        to: SWAP_ROUTER_ADDRESS as `0x${string}`,
        abi: SwapRouterV2ABI as Abi,
        functionName: "exactInputSingle",
        args: [params],
      });

      // Wait for the transaction to be mined
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: result.hash as `0x${string}`,
      });

      // Return transaction details
      return {
        transaction: {
          hash: receipt.transactionHash,
          from: receipt.from,
          to: receipt.to,
          tokenIn: parameters.tokenIn,
          tokenOut: parameters.tokenOut,
          amountIn: amountIn.toString(),
          estimatedAmountOut: amountOut.toString(),
          minimumAmountOut: minimumAmountOut.toString(),
          gasUsed: receipt.gasUsed.toString(),
        },
        status: receipt.status === "success" ? "SUCCESS" : "FAILED",
      };
    } catch (error: unknown) {
      let errorMessage = "Unknown error occurred while executing swap.";

      if (error && typeof error === "object") {
        if ("shortMessage" in error && typeof error.shortMessage === "string") {
          errorMessage = `Contract call reverted: ${error.shortMessage}`;
        } else if ("message" in error && typeof error.message === "string") {
          errorMessage = error.message;
        }
      }

      throw new Error(`Failed to execute swap: ${errorMessage}`);
    }
  }
}
