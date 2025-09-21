import { ethers } from "hardhat";
import hre from "hardhat";
import fs from "fs";
import path from "path";

const main = async () => {
    console.log("🚀 Deploying fhERC Universal Encrypted ERC to Ethereum Sepolia...\n");

    const [deployer] = await ethers.getSigners();
    console.log("👤 Deployer:", deployer.address);
    console.log("💰 Balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
    console.log("");

    // Deploy verifiers first
    console.log("📋 Step 1: Deploying ZK Verifiers...");
    
    const RegistrationVerifier = await ethers.getContractFactory("RegistrationCircuitGroth16Verifier");
    const registrationVerifier = await RegistrationVerifier.deploy();
    await registrationVerifier.waitForDeployment();
    console.log("✅ RegistrationVerifier deployed to:", await registrationVerifier.getAddress());

    const MintVerifier = await ethers.getContractFactory("MintCircuitGroth16Verifier");
    const mintVerifier = await MintVerifier.deploy();
    await mintVerifier.waitForDeployment();
    console.log("✅ MintVerifier deployed to:", await mintVerifier.getAddress());

    const WithdrawVerifier = await ethers.getContractFactory("WithdrawCircuitGroth16Verifier");
    const withdrawVerifier = await WithdrawVerifier.deploy();
    await withdrawVerifier.waitForDeployment();
    console.log("✅ WithdrawVerifier deployed to:", await withdrawVerifier.getAddress());

    const TransferVerifier = await ethers.getContractFactory("TransferCircuitGroth16Verifier");
    const transferVerifier = await TransferVerifier.deploy();
    await transferVerifier.waitForDeployment();
    console.log("✅ TransferVerifier deployed to:", await transferVerifier.getAddress());

    const BurnVerifier = await ethers.getContractFactory("BurnCircuitGroth16Verifier");
    const burnVerifier = await BurnVerifier.deploy();
    await burnVerifier.waitForDeployment();
    console.log("✅ BurnVerifier deployed to:", await burnVerifier.getAddress());

    // Deploy BabyJubJub library
    console.log("\n📋 Step 2: Deploying BabyJubJub Library...");
    const BabyJubJub = await ethers.getContractFactory("BabyJubJub");
    const babyJubJub = await BabyJubJub.deploy();
    await babyJubJub.waitForDeployment();
    console.log("✅ BabyJubJub deployed to:", await babyJubJub.getAddress());

    // Deploy Registrar
    console.log("\n📋 Step 3: Deploying Registrar...");
    const Registrar = await ethers.getContractFactory("Registrar");
    const registrar = await Registrar.deploy(await registrationVerifier.getAddress());
    await registrar.waitForDeployment();
    console.log("✅ Registrar deployed to:", await registrar.getAddress());

    // Deploy UniversalEncryptedERC
    console.log("\n📋 Step 4: Deploying UniversalEncryptedERC...");
    const UniversalEncryptedERC = await ethers.getContractFactory("UniversalEncryptedERC", {
        libraries: {
            BabyJubJub: await babyJubJub.getAddress(),
        },
    });
    
    // Create the constructor parameters struct
    const createParams = {
        registrar: await registrar.getAddress(),
        isConverter: true,
        name: "Universal Encrypted ERC",
        symbol: "U-eERC",
        decimals: 2,
        mintVerifier: await mintVerifier.getAddress(),
        withdrawVerifier: await withdrawVerifier.getAddress(),
        transferVerifier: await transferVerifier.getAddress(),
        burnVerifier: await burnVerifier.getAddress()
    };
    
    const encryptedERC = await UniversalEncryptedERC.deploy(createParams);
    await encryptedERC.waitForDeployment();
    console.log("✅ UniversalEncryptedERC deployed to:", await encryptedERC.getAddress());

    // Deploy test ERC20 token
    console.log("\n📋 Step 5: Deploying Test ERC20...");
    const SimpleERC20 = await ethers.getContractFactory("SimpleERC20");
    const testERC20 = await SimpleERC20.deploy("Test Token", "TEST", 18);
    await testERC20.waitForDeployment();
    console.log("✅ TestERC20 deployed to:", await testERC20.getAddress());

    // Mint some test tokens
    console.log("\n📋 Step 6: Minting Test Tokens...");
    const mintAmount = ethers.parseEther("10000");
    const mintTx = await testERC20.mint(deployer.address, mintAmount);
    await mintTx.wait();
    console.log("✅ Minted", ethers.formatEther(mintAmount), "test tokens to deployer");

    // Note: Auditor public key will be set after user registration
    console.log("\n📋 Step 7: Auditor Setup...");
    console.log("ℹ️  Auditor public key will be set after user registration");

    // Save deployment data
    const deploymentData = {
        network: "sepolia",
        chainId: 11155111,
        deployer: deployer.address,
        deploymentTimestamp: new Date().toISOString(),
        contracts: {
            registrationVerifier: await registrationVerifier.getAddress(),
            mintVerifier: await mintVerifier.getAddress(),
            withdrawVerifier: await withdrawVerifier.getAddress(),
            transferVerifier: await transferVerifier.getAddress(),
            burnVerifier: await burnVerifier.getAddress(),
            babyJubJub: await babyJubJub.getAddress(),
            registrar: await registrar.getAddress(),
            encryptedERC: await encryptedERC.getAddress(),
            testERC20: await testERC20.getAddress(),
        },
        metadata: {
            isConverter: true,
            decimals: 2,
            testTokensMinted: "10000",
            erc20Name: "Test Token",
            erc20Symbol: "TEST"
        }
    };

    // Ensure deployments directory exists
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    // Save deployment data
    const deploymentPath = path.join(deploymentsDir, "latest-sepolia.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
    console.log("✅ Deployment data saved to:", deploymentPath);

    // Verify contracts on Etherscan
    console.log("\n📋 Step 8: Verifying Contracts on Etherscan...");
    try {
        console.log("⏳ Waiting for block confirmations...");
        await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds

        console.log("🔍 Verifying RegistrationVerifier...");
        await hre.run("verify:verify", {
            address: await registrationVerifier.getAddress(),
            constructorArguments: [],
        });

        console.log("🔍 Verifying MintVerifier...");
        await hre.run("verify:verify", {
            address: await mintVerifier.getAddress(),
            constructorArguments: [],
        });

        console.log("🔍 Verifying WithdrawVerifier...");
        await hre.run("verify:verify", {
            address: await withdrawVerifier.getAddress(),
            constructorArguments: [],
        });

        console.log("🔍 Verifying TransferVerifier...");
        await hre.run("verify:verify", {
            address: await transferVerifier.getAddress(),
            constructorArguments: [],
        });

        console.log("🔍 Verifying BurnVerifier...");
        await hre.run("verify:verify", {
            address: await burnVerifier.getAddress(),
            constructorArguments: [],
        });

        console.log("🔍 Verifying BabyJubJub...");
        await hre.run("verify:verify", {
            address: await babyJubJub.getAddress(),
            constructorArguments: [],
        });

        console.log("🔍 Verifying Registrar...");
        await hre.run("verify:verify", {
            address: await registrar.getAddress(),
            constructorArguments: [await registrationVerifier.getAddress()],
        });

        console.log("🔍 Verifying UniversalEncryptedERC...");
        await hre.run("verify:verify", {
            address: await encryptedERC.getAddress(),
            constructorArguments: [createParams],
        });

        console.log("🔍 Verifying TestERC20...");
        await hre.run("verify:verify", {
            address: await testERC20.getAddress(),
            constructorArguments: ["Test Token", "TEST", 18],
        });

        console.log("✅ All contracts verified on Etherscan!");
    } catch (error) {
        console.log("⚠️ Contract verification failed:", error.message);
        console.log("You can verify manually later using the addresses above");
    }

    console.log("\n🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!");
    console.log("=" .repeat(60));
    console.log("📋 Contract Addresses:");
    console.log("  Registrar:", await registrar.getAddress());
    console.log("  UniversalEncryptedERC:", await encryptedERC.getAddress());
    console.log("  TestERC20:", await testERC20.getAddress());
    console.log("");
    console.log("🔗 View on Etherscan:");
    console.log(`  Registrar: https://sepolia.etherscan.io/address/${await registrar.getAddress()}`);
    console.log(`  UniversalEncryptedERC: https://sepolia.etherscan.io/address/${await encryptedERC.getAddress()}`);
    console.log(`  TestERC20: https://sepolia.etherscan.io/address/${await testERC20.getAddress()}`);
    console.log("");
    console.log("🚀 Ready for frontend integration!");
};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
