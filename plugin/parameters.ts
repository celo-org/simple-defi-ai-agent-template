import { createToolParameters } from "@goat-sdk/core";
import { z } from "zod";

export enum SwapType {
  EXACT_INPUT = "EXACT_INPUT",
  EXACT_OUTPUT = "EXACT_OUTPUT",
}

export enum Routing {
  CLASSIC = "CLASSIC",
}

export const QuoteSchema = z.object({
  chainId: z.number(),
  swapper: z.string(),
  input: z.any(),
  output: z.any(),
  slippage: z.any(),
  tradeType: z.nativeEnum(SwapType),
  route: z.any(),
  gasFee: z.string(),
  gasFeeUSD: z.string(),
  gasFeeQuote: z.string(),
  gasUseEstimate: z.string(),
  routeString: z.string(),
  blockNumber: z.string(),
  quoteId: z.string(),
  gasPrice: z.string(),
  maxFeePerGas: z.string(),
  maxPriorityFeePerGas: z.string(),
  txFailureReasons: z.array(z.string()),
  priceImpact: z.number(),
});

export const PermitDataSchema = z.object({
  domain: z.string(),
  types: z.record(z.string(), z.any()),
  primaryType: z.string(),
  message: z.record(z.string(), z.any()),
});

export const QuoteResponseSchema = z.object({
  routing: z.nativeEnum(Routing),
  permitData: PermitDataSchema.optional(),
  quote: QuoteSchema,
});

export const TransactionSchema = z.object({
  from: z.string(),
  to: z.string(),
  amount: z.string(),
  token: z.string(),
});

export const SwapResponseSchema = z.object({
  transaction: TransactionSchema,
  gasFee: z.string(),
});

export class GetQuoteParameters extends createToolParameters(
  z.object({
    tokenIn: z
      .string()
      .describe("The symbol of the input token (e.g., 'CELO', 'cUSD')"),
    tokenOut: z
      .string()
      .describe("The symbol of the output token (e.g., 'CELO', 'cUSD')"),
    tokenOutChainId: z.number().optional(),
    amount: z.string().describe("The amount of tokens to swap in base units"),
    type: z.nativeEnum(SwapType).default(SwapType.EXACT_INPUT),
    routingPreference: z
      .nativeEnum(Routing)
      .default(Routing.CLASSIC)
      .describe(
        "The routing preference determines which protocol to use for the swap."
      ),
  })
) {}

export class ExecuteSwapParameters extends createToolParameters(
  z.object({
    tokenIn: z
      .string()
      .describe("The symbol of the input token (e.g., 'CELO', 'cUSD')"),
    tokenOut: z
      .string()
      .describe("The symbol of the output token (e.g., 'CELO', 'cUSD')"),
    amount: z.string().describe("The amount of tokens to swap in base units"),
    slippageTolerance: z
      .number()
      .default(1)
      .describe(
        "The maximum acceptable slippage percentage (e.g., 0.5 for 0.5%)"
      ),
    deadline: z
      .number()
      .optional()
      .describe("Transaction deadline in minutes from now"),
  })
) {}
