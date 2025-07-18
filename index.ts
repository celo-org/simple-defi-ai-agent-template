import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import readline from "node:readline";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";

import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { uniswap } from "./plugin/uniswap.plugin";

import { viem } from "@goat-sdk/wallet-viem";

import * as dotenv from "dotenv";
dotenv.config();

// 1. Create a wallet client
const account = privateKeyToAccount(
  process.env.WALLET_PRIVATE_KEY as `0x${string}`
);

const walletClient = createWalletClient({
  account: account,
  transport: http(process.env.RPC_PROVIDER_URL),
  chain: celo,
});

(async () => {
  // 2. Get your onchain tools for your wallet
  const tools = await getOnChainTools({
    wallet: viem(walletClient),
    plugins: [
      uniswap(), // No arguments needed for on-chain implementation
    ],
  });

  // 3. Create a readline interface to interact with the agent
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  while (true) {
    const prompt = await new Promise<string>((resolve) => {
      rl.question('Enter your prompt (or "exit" to quit): ', resolve);
    });

    if (prompt === "exit") {
      rl.close();
      break;
    }

    console.log("\n-------------------\n");
    console.log("TOOLS CALLED");
    console.log("\n-------------------\n");
    try {
      const result = await generateText({
        model: openai("gpt-4o-mini"),
        tools: tools,
        maxSteps: 10, // Maximum number of tool invocations per request
        prompt: prompt,
        onStepFinish: (event) => {
          console.log(event.toolResults);
        },
      });

      console.log("\n-------------------\n");
      console.log("RESPONSE");
      console.log("\n-------------------\n");
      console.log(result.text);
    } catch (error) {
      console.error(error);
    }
    console.log("\n-------------------\n");
  }
})();
