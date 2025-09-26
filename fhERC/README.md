# fhERC - Universal Encrypted ERC20 Token

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.27-blue.svg)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.19.0-orange.svg)](https://hardhat.org/)

A universal privacy-preserving ERC20 token implementation that combines zero-knowledge proofs with multi-chain support and native token compatibility.

## 🌟 Features

### Core Privacy Features
- **Zero-Knowledge Proofs**: All transactions are private using ZK-SNARKs
- **Encrypted Balances**: User balances are encrypted using ElGamal encryption
- **Auditor Compliance**: Built-in auditor system for regulatory compliance
- **Nullifier System**: Prevents double-spending and replay attacks

### Universal Token Support
- **ERC20 Tokens**: Full support for any ERC20 token
- **Native Tokens**: Support for native tokens (ETH, AVAX, MATIC, etc.)
- **Multi-Chain**: Deployable on any EVM-compatible chain
- **Cross-Chain**: Cross-chain transfer capabilities

### Multi-Chain Architecture
- **Universal Deployment**: Same contract works on all EVM chains
- **Cross-Chain Gateway**: Secure cross-chain transfers
- **Chain Detection**: Automatic chain detection and switching
- **Token Mapping**: Automatic token mapping across chains

## 🏗️ Architecture

### Core Components

1. **UniversalEncryptedERC**: Main contract with universal token support
2. **CrossChainGateway**: Handles cross-chain transfers
3. **Registrar**: Manages user registration and public keys
4. **Verifier Contracts**: ZK proof verification for each operation
5. **TokenTracker**: Manages token registration and tracking
6. **EncryptedUserBalances**: Handles encrypted balance storage

### ZK Circuits (Preserved from eERC)

- **Registration Circuit**: User registration with ZK proof
- **Mint Circuit**: Private minting operations
- **Transfer Circuit**: Private transfers between users
- **Withdraw Circuit**: Private withdrawals
- **Burn Circuit**: Private burning operations

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Hardhat
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/fherc.git
cd fherc

# Install dependencies
npm install

# Compile contracts
npm run compile
```

### Environment Setup

Create a `.env` file in the root directory:

```env
# Private key for deployment (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# RPC URLs for different networks
ETHEREUM_RPC_URL=https://eth-mainnet.alchemyapi.io/v2/your_api_key
AVALANCHE_RPC_URL=https://api.avax.network/ext/bc/C/rpc
POLYGON_RPC_URL=https://polygon-rpc.com
BASE_RPC_URL=https://mainnet.base.org
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
OPTIMISM_RPC_URL=https://mainnet.optimism.io

# Testnet RPC URLs
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_api_key
FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# API Keys for contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key
SNOWTRACE_API_KEY=your_snowtrace_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key
BASESCAN_API_KEY=your_basescan_api_key
ARBISCAN_API_KEY=your_arbiscan_api_key
OPTIMISTIC_ETHERSCAN_API_KEY=your_optimistic_etherscan_api_key
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key
```

### Deployment

#### Deploy to Fuji Testnet (Default)

```bash
npm run deploy:fuji
```

#### Deploy to Other Networks

```bash
# Ethereum Mainnet
npm run deploy:ethereum

# Avalanche C-Chain
npm run deploy:avalanche

# Polygon
npm run deploy:polygon

# Base
npm run deploy:base

# Arbitrum
npm run deploy:arbitrum

# Optimism
npm run deploy:optimism

# Testnets
npm run deploy:sepolia
npm run deploy:mumbai
npm run deploy:baseSepolia
```

### Testing

```bash
# Run all tests
npm test

# Run tests with gas reporting
npm run gas

# Run coverage
npm run coverage
```

## 📖 Usage

### Basic Operations

#### 1. User Registration

```solidity
// Register a new user
await registrar.register(userAddress, publicKey, proof);
```

#### 2. Token Deposit

```solidity
// Deposit ERC20 tokens
await universalERC.deposit(amount, tokenAddress, amountPCT);

// Deposit native tokens (ETH, AVAX, etc.)
await universalERC.deposit{value: amount}(amount, address(0), amountPCT);
```

#### 3. Private Transfer

```solidity
// Transfer encrypted tokens privately
await universalERC.transfer(
    to,
    tokenId,
    transferProof,
    balancePCT
);
```

#### 4. Token Withdrawal

```solidity
// Withdraw tokens
await universalERC.withdraw(
    tokenId,
    withdrawProof,
    balancePCT
);
```

### Cross-Chain Operations

#### 1. Initiate Cross-Chain Transfer

```solidity
// Initiate transfer to another chain
bytes32 transferId = await gateway.initiateCrossChainTransfer(
    token,
    amount,
    targetChainId,
    targetUser,
    proofHash
);
```

#### 2. Execute Cross-Chain Transfer

```solidity
// Execute transfer on target chain
await gateway.executeCrossChainTransfer(
    transferId,
    proof
);
```

## 🔧 Configuration

### Supported Chains

| Chain | Chain ID | Status | Explorer |
|-------|----------|--------|----------|
| Ethereum | 1 | ✅ | [Etherscan](https://etherscan.io) |
| Avalanche | 43114 | ✅ | [Snowtrace](https://snowtrace.io) |
| Polygon | 137 | ✅ | [Polygonscan](https://polygonscan.com) |
| Base | 8453 | ✅ | [Basescan](https://basescan.org) |
| Arbitrum | 42161 | ✅ | [Arbiscan](https://arbiscan.io) |
| Optimism | 10 | ✅ | [Optimistic Etherscan](https://optimistic.etherscan.io) |
| Sepolia | 11155111 | ✅ | [Sepolia Etherscan](https://sepolia.etherscan.io) |
| Fuji | 43113 | ✅ | [Fuji Snowtrace](https://testnet.snowtrace.io) |
| Mumbai | 80001 | ✅ | [Mumbai Polygonscan](https://mumbai.polygonscan.com) |
| Base Sepolia | 84532 | ✅ | [Base Sepolia Basescan](https://sepolia.basescan.org) |

### Token Types

- **ERC20**: Standard ERC20 tokens
- **NATIVE**: Native tokens (ETH, AVAX, MATIC, etc.)
- **CUSTOM**: Custom token implementations

## 🛡️ Security

### Audit Status

- [ ] Security Audit (Planned)
- [ ] Formal Verification (Planned)
- [ ] Bug Bounty (Planned)

### Security Features

- **Reentrancy Protection**: All external calls are protected
- **Access Control**: Role-based access control
- **Input Validation**: Comprehensive input validation
- **Overflow Protection**: Safe math operations
- **Nullifier System**: Prevents double-spending

## 📊 Gas Optimization

### Gas Usage Estimates

| Operation | Gas Cost | Notes |
|-----------|----------|-------|
| User Registration | ~500,000 | One-time cost |
| Token Deposit | ~150,000 | Per deposit |
| Private Transfer | ~200,000 | Per transfer |
| Token Withdrawal | ~180,000 | Per withdrawal |
| Cross-Chain Transfer | ~300,000 | Per cross-chain operation |

### Optimization Features

- **Batch Operations**: Batch multiple operations
- **Gas Estimation**: Accurate gas estimation
- **Optimized Circuits**: Efficient ZK circuits
- **Storage Optimization**: Minimal storage usage

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Fork the repository
git clone https://github.com/your-username/fherc.git
cd fherc

# Install dependencies
npm install

# Create a new branch
git checkout -b feature/your-feature

# Make your changes
# ... make changes ...

# Run tests
npm test

# Commit your changes
git commit -m "Add your feature"

# Push to your fork
git push origin feature/your-feature

# Create a Pull Request
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **eERC Team**: For the original eERC implementation
- **FHEVM Team**: For FHEVM inspiration
- **OpenZeppelin**: For secure contract libraries
- **Hardhat Team**: For the development framework
- **ZK Community**: For zero-knowledge proof libraries

## 📞 Support

- **Documentation**: [docs.fherc.org](https://docs.fherc.org)
- **Discord**: [discord.gg/fherc](https://discord.gg/fherc)
- **Telegram**: [t.me/fherc](https://t.me/fherc)
- **Email**: support@fherc.org

## 🔗 Links

- **Website**: [fherc.org](https://fherc.org)
- **GitHub**: [github.com/your-org/fherc](https://github.com/your-org/fherc)
- **Twitter**: [@fherc](https://twitter.com/fherc)
- **Medium**: [medium.com/@fherc](https://medium.com/@fherc)

---

**⚠️ Disclaimer**: This software is experimental and should not be used in production without proper security audits and testing.
