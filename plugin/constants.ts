import { Token } from "@uniswap/sdk-core";
import IUniswapV3PoolABI from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";
import { celo } from "viem/chains";

export const POOL_ABI = IUniswapV3PoolABI.abi;

// Uniswap V3 deployment addresses for Celo mainnet
// Source: https://docs.uniswap.org/contracts/v3/reference/deployments/celo-deployments
export const POOL_FACTORY_CONTRACT_ADDRESS =
  "0xAfE208a311B21f13EF87E33A90049fC17A7acDEc";
export const QUOTER_CONTRACT_ADDRESS =
  "0x82825d0554fA07f7FC52Ab63c961F330fdEFa8E8"; // QuoterV2

// Fee tiers for Uniswap V3 pools
export enum FeeAmount {
  LOWEST = 100,
  LOW = 500,
  MEDIUM = 3000,
  HIGH = 10000,
}

// Example tokens on Celo
export const CELO_NATIVE = new Token(
  celo.id,
  "0x471EcE3750Da237f93B8E339c536989b8978a438",
  18,
  "CELO",
  "Celo Native Asset"
);

export const CUSD = new Token(
  celo.id,
  "0x765DE816845861e75A25fCA122bb6898B8B1282a",
  18,
  "cUSD",
  "Celo Dollar"
);

export const CEUR = new Token(
  celo.id,
  "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
  18,
  "cEUR",
  "Celo Euro"
);

export const SUPPORTED_TOKENS: { [key: string]: Token } = {
  CELO: CELO_NATIVE,
  CUSD: CUSD,
  CEUR: CEUR,
};

// ABI for Uniswap V3 Quoter contract
export const QUOTER_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "tokenIn",
        type: "address",
      },
      {
        internalType: "address",
        name: "tokenOut",
        type: "address",
      },
      {
        internalType: "uint24",
        name: "fee",
        type: "uint24",
      },
      {
        internalType: "uint256",
        name: "amountIn",
        type: "uint256",
      },
      {
        internalType: "uint160",
        name: "sqrtPriceLimitX96",
        type: "uint160",
      },
    ],
    name: "quoteExactInputSingle",
    outputs: [
      {
        internalType: "uint256",
        name: "amountOut",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
];

// ABI for Uniswap V3 Factory
export const FACTORY_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "tokenA",
        type: "address",
      },
      {
        internalType: "address",
        name: "tokenB",
        type: "address",
      },
      {
        internalType: "uint24",
        name: "fee",
        type: "uint24",
      },
    ],
    name: "getPool",
    outputs: [
      {
        internalType: "address",
        name: "pool",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];
