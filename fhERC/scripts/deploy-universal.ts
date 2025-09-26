import { ethers } from "hardhat";
import { Contract } from "ethers";

interface DeploymentConfig {
  name: string;
  symbol: string;
  decimals: number;
  isConverter: boolean;
  registrar: string;
  mintVerifier: string;
  withdrawVerifier: string;
  transferVerifier: string;
  burnVerifier: string;
}

interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  gasPrice?: string;
  gasLimit?: number;
}

const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  ethereum: {
    chainId: 1,
    name: "Ethereum Mainnet",
    rpcUrl: process.env.ETHEREUM_RPC_URL || "",
    explorerUrl: "https://etherscan.io",
  },
  avalanche: {
    chainId: 43114,
    name: "Avalanche C-Chain",
    rpcUrl: process.env.AVALANCHE_RPC_URL || "",
    explorerUrl: "https://snowtrace.io",
  },
  polygon: {
    chainId: 137,
    name: "Polygon",
    rpcUrl: process.env.POLYGON_RPC_URL || "",
    explorerUrl: "https://polygonscan.com",
  },
  base: {
    chainId: 8453,
    name: "Base",
    rpcUrl: process.env.BASE_RPC_URL || "",
    explorerUrl: "https://basescan.org",
  },
  arbitrum: {
    chainId: 42161,
    name: "Arbitrum One",
    rpcUrl: process.env.ARBITRUM_RPC_URL || "",
    explorerUrl: "https://arbiscan.io",
  },
  optimism: {
    chainId: 10,
    name: "Optimism",
    rpcUrl: process.env.OPTIMISM_RPC_URL || "",
    explorerUrl: "https://optimistic.etherscan.io",
  },
  // Testnets
  sepolia: {
    chainId: 11155111,
    name: "Sepolia",
    rpcUrl: process.env.SEPOLIA_RPC_URL || "",
    explorerUrl: "https://sepolia.etherscan.io",
  },
  fuji: {
    chainId: 43113,
    name: "Avalanche Fuji",
    rpcUrl: process.env.FUJI_RPC_URL || "",
    explorerUrl: "https://testnet.snowtrace.io",
  },
  mumbai: {
    chainId: 80001,
    name: "Polygon Mumbai",
    rpcUrl: process.env.MUMBAI_RPC_URL || "",
    explorerUrl: "https://mumbai.polygonscan.com",
  },
  baseSepolia: {
    chainId: 84532,
    name: "Base Sepolia",
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || "",
    explorerUrl: "https://sepolia.basescan.org",
  },
};

async function deployRegistrar(): Promise<Contract> {
  console.log("Deploying Registrar...");
  const Registrar = await ethers.getContractFactory("Registrar");
  const registrar = await Registrar.deploy();
  await registrar.waitForDeployment();
  
  const registrarAddress = await registrar.getAddress();
  console.log(`Registrar deployed to: ${registrarAddress}`);
  
  return registrar;
}

async function deployVerifiers(): Promise<{
  mintVerifier: Contract;
  withdrawVerifier: Contract;
  transferVerifier: Contract;
  burnVerifier: Contract;
}> {
  console.log("Deploying Verifier contracts...");
  
  const MintVerifier = await ethers.getContractFactory("MintVerifier");
  const mintVerifier = await MintVerifier.deploy();
  await mintVerifier.waitForDeployment();
  
  const WithdrawVerifier = await ethers.getContractFactory("WithdrawVerifier");
  const withdrawVerifier = await WithdrawVerifier.deploy();
  await withdrawVerifier.waitForDeployment();
  
  const TransferVerifier = await ethers.getContractFactory("TransferVerifier");
  const transferVerifier = await TransferVerifier.deploy();
  await transferVerifier.waitForDeployment();
  
  const BurnVerifier = await ethers.getContractFactory("BurnVerifier");
  const burnVerifier = await BurnVerifier.deploy();
  await burnVerifier.waitForDeployment();
  
  const mintVerifierAddress = await mintVerifier.getAddress();
  const withdrawVerifierAddress = await withdrawVerifier.getAddress();
  const transferVerifierAddress = await transferVerifier.getAddress();
  const burnVerifierAddress = await burnVerifier.getAddress();
  
  console.log(`MintVerifier deployed to: ${mintVerifierAddress}`);
  console.log(`WithdrawVerifier deployed to: ${withdrawVerifierAddress}`);
  console.log(`TransferVerifier deployed to: ${transferVerifierAddress}`);
  console.log(`BurnVerifier deployed to: ${burnVerifierAddress}`);
  
  return {
    mintVerifier,
    withdrawVerifier,
    transferVerifier,
    burnVerifier,
  };
}

async function deployUniversalEncryptedERC(
  config: DeploymentConfig
): Promise<Contract> {
  console.log("Deploying UniversalEncryptedERC...");
  
  const UniversalEncryptedERC = await ethers.getContractFactory("UniversalEncryptedERC");
  
  const params = {
    name: config.name,
    symbol: config.symbol,
    decimals: config.decimals,
    isConverter: config.isConverter,
    registrar: config.registrar,
    mintVerifier: config.mintVerifier,
    withdrawVerifier: config.withdrawVerifier,
    transferVerifier: config.transferVerifier,
    burnVerifier: config.burnVerifier,
  };
  
  const universalERC = await UniversalEncryptedERC.deploy(params);
  await universalERC.waitForDeployment();
  
  const universalERCAddress = await universalERC.getAddress();
  console.log(`UniversalEncryptedERC deployed to: ${universalERCAddress}`);
  
  return universalERC;
}

async function deployCrossChainGateway(): Promise<Contract> {
  console.log("Deploying CrossChainGateway...");
  
  const CrossChainGateway = await ethers.getContractFactory("CrossChainGateway");
  const gateway = await CrossChainGateway.deploy();
  await gateway.waitForDeployment();
  
  const gatewayAddress = await gateway.getAddress();
  console.log(`CrossChainGateway deployed to: ${gatewayAddress}`);
  
  return gateway;
}

async function setupTokenSupport(
  universalERC: Contract,
  gateway: Contract,
  chainConfig: ChainConfig
): Promise<void> {
  console.log("Setting up token support...");
  
  // Register native token support
  await universalERC.registerTokenType(address(0), 1); // TokenType.NATIVE
  console.log("Native token support registered");
  
  // Add current chain to gateway
  await gateway.addSupportedChain(chainConfig.chainId, await gateway.getAddress());
  console.log(`Chain ${chainConfig.chainId} added to gateway`);
  
  // Set native token mapping
  await gateway.setTokenMapping(address(0), chainConfig.chainId, address(0));
  console.log("Native token mapping set");
}

async function deployToChain(chainName: string): Promise<void> {
  const chainConfig = CHAIN_CONFIGS[chainName];
  if (!chainConfig) {
    throw new Error(`Unknown chain: ${chainName}`);
  }
  
  console.log(`\n🚀 Deploying to ${chainConfig.name} (Chain ID: ${chainConfig.chainId})`);
  console.log("=" * 60);
  
  try {
    // Deploy core contracts
    const registrar = await deployRegistrar();
    const verifiers = await deployVerifiers();
    
    // Deploy UniversalEncryptedERC
    const config: DeploymentConfig = {
      name: "Universal Encrypted Token",
      symbol: "UET",
      decimals: 18,
      isConverter: true, // Start as converter mode
      registrar: await registrar.getAddress(),
      mintVerifier: await verifiers.mintVerifier.getAddress(),
      withdrawVerifier: await verifiers.withdrawVerifier.getAddress(),
      transferVerifier: await verifiers.transferVerifier.getAddress(),
      burnVerifier: await verifiers.burnVerifier.getAddress(),
    };
    
    const universalERC = await deployUniversalEncryptedERC(config);
    
    // Deploy CrossChainGateway
    const gateway = await deployCrossChainGateway();
    
    // Setup token support
    await setupTokenSupport(universalERC, gateway, chainConfig);
    
    // Save deployment info
    const deploymentInfo = {
      chainId: chainConfig.chainId,
      chainName: chainConfig.name,
      contracts: {
        registrar: await registrar.getAddress(),
        universalERC: await universalERC.getAddress(),
        gateway: await gateway.getAddress(),
        verifiers: {
          mint: await verifiers.mintVerifier.getAddress(),
          withdraw: await verifiers.withdrawVerifier.getAddress(),
          transfer: await verifiers.transferVerifier.getAddress(),
          burn: await verifiers.burnVerifier.getAddress(),
        },
      },
      timestamp: new Date().toISOString(),
      blockNumber: await ethers.provider.getBlockNumber(),
    };
    
    // Save to deployments directory
    const fs = require("fs");
    const path = require("path");
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    const chainDir = path.join(deploymentsDir, chainName);
    
    if (!fs.existsSync(chainDir)) {
      fs.mkdirSync(chainDir, { recursive: true });
    }
    
    const deploymentFile = path.join(chainDir, "deployment.json");
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    
    console.log(`\n✅ Deployment completed for ${chainConfig.name}`);
    console.log(`📁 Deployment info saved to: ${deploymentFile}`);
    console.log(`🔗 Explorer: ${chainConfig.explorerUrl}/address/${await universalERC.getAddress()}`);
    
  } catch (error) {
    console.error(`❌ Deployment failed for ${chainConfig.name}:`, error);
    throw error;
  }
}

async function main() {
  const chainName = process.env.CHAIN || "fuji";
  
  console.log("🌐 Universal eERC (fhERC) Deployment Script");
  console.log("=" * 50);
  console.log(`Target Chain: ${chainName}`);
  console.log(`Network: ${await ethers.provider.getNetwork()}`);
  
  await deployToChain(chainName);
  
  console.log("\n🎉 All deployments completed successfully!");
}

// Handle different deployment scenarios
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export {
  deployRegistrar,
  deployVerifiers,
  deployUniversalEncryptedERC,
  deployCrossChainGateway,
  setupTokenSupport,
  deployToChain,
  CHAIN_CONFIGS,
};
