# Celo Composer - Simple DeFi AI Agent Template

A powerful AI agent template for building DeFi applications on Celo using Uniswap V3 integration. This template enables AI agents to perform token swaps, get quotes, and interact with DeFi protocols on the Celo network.

## 🌟 Features

- **AI-Powered DeFi Operations**: Natural language interface for token swaps and DeFi interactions
- **Uniswap V3 Integration**: Seamless integration with Uniswap V3 on Celo mainnet
- **Multi-Token Support**: Built-in support for CELO, cUSD, and cEUR tokens
- **Real-time Quotes**: Get accurate swap quotes before executing transactions
- **Slippage Protection**: Configurable slippage tolerance for safe trading
- **Interactive CLI**: Chat-based interface for easy interaction with the AI agent

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/pnpm
- Celo wallet with some CELO for gas fees
- OpenAI API key

### Installation

1. **Clone the repository**:

```bash
git clone <repository-url>
cd simple-defi-ai-agent-template
```

2. **Install dependencies**:

```bash
npm install
# or
pnpm install
```

3. **Set up environment variables**:

```bash
cp .env.template .env
```

Fill in your `.env` file with:

```env
OPENAI_API_KEY=your_openai_api_key_here
WALLET_PRIVATE_KEY=your_wallet_private_key_here
RPC_PROVIDER_URL=https://rpc.ankr.com/celo
```

### Usage

1. **Start the AI agent**:

```bash
npm run dev
# or
pnpm ts-node index.ts
```

2. **Interact with the agent**:

```
Enter your prompt: "Swap 1 CELO for cUSD"
Enter your prompt: "Get a quote for swapping 100 cUSD to cEUR"
Enter your prompt: "What's the current price of CELO in cUSD?"
```

## 🔧 Supported Operations

### Token Swaps

- **Exact Input Swaps**: Swap a specific amount of input tokens
- **Quote Generation**: Get estimated output amounts before swapping
- **Slippage Protection**: Configurable slippage tolerance (default: 1%)

### Supported Tokens

- **CELO**: Native Celo token (`0x471EcE3750Da237f93B8E339c536989b8978a438`)
- **cUSD**: Celo Dollar (`0x765DE816845861e75A25fCA122bb6898B8B1282a`)
- **cEUR**: Celo Euro (`0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73`)

## 🏗️ Architecture

### Core Components

- **`index.ts`**: Main application entry point with AI agent setup
- **`plugin/uniswap.service.ts`**: Uniswap V3 integration service
- **`plugin/constants.ts`**: Contract addresses and token configurations
- **`plugin/parameters.ts`**: Parameter schemas and validation
- **`plugin/abis/`**: Contract ABIs for Uniswap V3 interactions

### Smart Contract Addresses (Celo Mainnet)

- **SwapRouter02**: `0x5615CDAb10dc425a742d643d949a7F474C01abc4`
- **UniswapV3Factory**: `0xAfE208a311B21f13EF87E33A90049fC17A7acDEc`
- **QuoterV2**: `0x82825d0554fA07f7FC52Ab63c961F330fdEFa8E8`

## 🛡️ Security Best Practices

### For Development

- Use testnet (Alfajores) for development and testing
- Never commit private keys to version control
- Use environment variables for sensitive information

### For Production

- **Multi-sig Wallets**: Use multi-signature wallets for enhanced security
- **Smart Wallets**: Consider implementing smart wallet solutions with programmable permissions
- **Slippage Limits**: Set appropriate slippage limits to prevent MEV attacks
- **Amount Limits**: Implement transaction amount limits for risk management

## 🔄 Customization

### Adding New Tokens

1. Add token configuration to `plugin/constants.ts`:

```typescript
export const NEW_TOKEN = new Token(
  celo.id,
  "0x...", // Token address
  18, // Decimals
  "SYMBOL",
  "Token Name"
);
```

2. Update `SUPPORTED_TOKENS` object to include the new token.

### Modifying AI Behavior

- Update tool descriptions in `plugin/uniswap.service.ts`
- Modify parameter schemas in `plugin/parameters.ts`
- Adjust the AI model configuration in `index.ts`

## 📊 Example Interactions

```bash
# Get a quote
"What's the estimated output for swapping 10 CELO to cUSD?"

# Execute a swap
"Swap 5 cUSD for cEUR with 2% slippage tolerance"

# Check swap feasibility
"Can I swap 1000 CELO for cUSD? What would be the impact?"
```

## 🌐 Network Configuration

### Celo Mainnet

- **Chain ID**: 42220
- **RPC URL**: `https://rpc.ankr.com/celo`
- **Block Explorer**: [Celoscan](https://celoscan.io/)

### Celo Testnet (Alfajores)

- **Chain ID**: 44787
- **RPC URL**: `https://alfajores-forno.celo-testnet.org`
- **Block Explorer**: [Alfajores Explorer](https://alfajores.celoscan.io/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📚 Resources

- [Celo Documentation](https://docs.celo.org/)
- [Uniswap V3 Documentation](https://docs.uniswap.org/)
- [Celo Composer](https://github.com/celo-org/celo-composer)
- [Viem Documentation](https://viem.sh/)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This is a template for educational and development purposes. Always thoroughly test in a safe environment before deploying to production. The authors are not responsible for any financial losses incurred through the use of this software.
