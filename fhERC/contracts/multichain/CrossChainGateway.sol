// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title CrossChainGateway
 * @notice A gateway contract that enables cross-chain transfers of encrypted tokens
 * @dev This contract acts as a bridge between different EVM chains for the UniversalEncryptedERC system
 */
contract CrossChainGateway is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    ///////////////////////////////////////////////////
    ///                   State Variables           ///
    ///////////////////////////////////////////////////

    /// @notice Mapping of supported chains
    mapping(uint256 => bool) public supportedChains;
    
    /// @notice Mapping of chain-specific gateway addresses
    mapping(uint256 => address) public chainGateways;
    
    /// @notice Mapping of cross-chain transfer nonces to prevent replay attacks
    mapping(bytes32 => bool) public usedNonces;
    
    /// @notice Mapping of supported tokens for cross-chain transfers
    mapping(address => bool) public supportedTokens;
    
    /// @notice Mapping of token addresses to their cross-chain representations
    mapping(address => mapping(uint256 => address)) public tokenMappings;
    
    /// @notice Mapping of pending cross-chain transfers
    mapping(bytes32 => CrossChainTransfer) public pendingTransfers;
    
    /// @notice Timeout for cross-chain transfers (in seconds)
    uint256 public transferTimeout = 24 hours;
    
    /// @notice Maximum number of supported chains
    uint256 public constant MAX_CHAINS = 50;

    ///////////////////////////////////////////////////
    ///                   Structs                   ///
    ///////////////////////////////////////////////////

    struct CrossChainTransfer {
        address user;
        address token;
        uint256 amount;
        uint256 sourceChainId;
        uint256 targetChainId;
        address targetUser;
        uint256 timestamp;
        bool executed;
        bytes32 proofHash;
    }

    ///////////////////////////////////////////////////
    ///                   Events                   ///
    ///////////////////////////////////////////////////

    event ChainSupported(uint256 indexed chainId, address indexed gateway);
    event ChainUnsupported(uint256 indexed chainId);
    event TokenSupported(address indexed token, bool supported);
    event TokenMappingUpdated(address indexed token, uint256 indexed chainId, address indexed mappedToken);
    event CrossChainTransferInitiated(
        bytes32 indexed transferId,
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 sourceChainId,
        uint256 targetChainId,
        address targetUser
    );
    event CrossChainTransferExecuted(
        bytes32 indexed transferId,
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 sourceChainId,
        uint256 targetChainId
    );
    event CrossChainTransferFailed(
        bytes32 indexed transferId,
        string reason
    );
    event TransferTimeoutUpdated(uint256 newTimeout);

    ///////////////////////////////////////////////////
    ///                   Modifiers                 ///
    ///////////////////////////////////////////////////

    modifier onlySupportedChain(uint256 chainId) {
        require(supportedChains[chainId], "Chain not supported");
        _;
    }

    modifier onlySupportedToken(address token) {
        require(supportedTokens[token], "Token not supported");
        _;
    }

    modifier onlyValidTransfer(bytes32 transferId) {
        require(pendingTransfers[transferId].user != address(0), "Transfer not found");
        require(!pendingTransfers[transferId].executed, "Transfer already executed");
        _;
    }

    ///////////////////////////////////////////////////
    ///                   Constructor               ///
    ///////////////////////////////////////////////////

    constructor() Ownable(msg.sender) {
        // Initialize with current chain
        supportedChains[block.chainid] = true;
        chainGateways[block.chainid] = address(this);
    }

    ///////////////////////////////////////////////////
    ///                   External                  ///
    ///////////////////////////////////////////////////

    /**
     * @notice Adds support for a new chain
     * @param chainId The chain ID to support
     * @param gatewayAddress The gateway address on that chain
     * @dev Only the owner can add new chains
     */
    function addSupportedChain(uint256 chainId, address gatewayAddress) external onlyOwner {
        require(chainId != 0, "Invalid chain ID");
        require(gatewayAddress != address(0), "Invalid gateway address");
        require(!supportedChains[chainId], "Chain already supported");
        
        // Check maximum chains limit
        uint256 supportedCount = 0;
        for (uint256 i = 1; i <= MAX_CHAINS; i++) {
            if (supportedChains[i]) {
                supportedCount++;
            }
        }
        require(supportedCount < MAX_CHAINS, "Maximum chains limit reached");
        
        supportedChains[chainId] = true;
        chainGateways[chainId] = gatewayAddress;
        
        emit ChainSupported(chainId, gatewayAddress);
    }

    /**
     * @notice Removes support for a chain
     * @param chainId The chain ID to remove support for
     * @dev Only the owner can remove chain support
     */
    function removeSupportedChain(uint256 chainId) external onlyOwner {
        require(supportedChains[chainId], "Chain not supported");
        require(chainId != block.chainid, "Cannot remove current chain");
        
        supportedChains[chainId] = false;
        chainGateways[chainId] = address(0);
        
        emit ChainUnsupported(chainId);
    }

    /**
     * @notice Sets support for a token
     * @param token The token address
     * @param supported Whether the token is supported
     * @dev Only the owner can set token support
     */
    function setTokenSupport(address token, bool supported) external onlyOwner {
        require(token != address(0), "Invalid token address");
        supportedTokens[token] = supported;
        emit TokenSupported(token, supported);
    }

    /**
     * @notice Sets token mapping for cross-chain representation
     * @param token The original token address
     * @param chainId The target chain ID
     * @param mappedToken The mapped token address on the target chain
     * @dev Only the owner can set token mappings
     */
    function setTokenMapping(address token, uint256 chainId, address mappedToken) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(supportedChains[chainId], "Chain not supported");
        require(mappedToken != address(0), "Invalid mapped token address");
        
        tokenMappings[token][chainId] = mappedToken;
        emit TokenMappingUpdated(token, chainId, mappedToken);
    }

    /**
     * @notice Sets the transfer timeout
     * @param newTimeout The new timeout in seconds
     * @dev Only the owner can set the timeout
     */
    function setTransferTimeout(uint256 newTimeout) external onlyOwner {
        require(newTimeout > 0, "Invalid timeout");
        transferTimeout = newTimeout;
        emit TransferTimeoutUpdated(newTimeout);
    }

    /**
     * @notice Initiates a cross-chain transfer
     * @param token The token address to transfer
     * @param amount The amount to transfer
     * @param targetChainId The target chain ID
     * @param targetUser The target user address
     * @param proofHash The hash of the proof for the transfer
     * @return transferId The unique transfer ID
     * @dev This function locks the tokens and creates a pending transfer
     */
    function initiateCrossChainTransfer(
        address token,
        uint256 amount,
        uint256 targetChainId,
        address targetUser,
        bytes32 proofHash
    ) external payable onlySupportedChain(targetChainId) onlySupportedToken(token) nonReentrant returns (bytes32 transferId) {
        require(amount > 0, "Amount must be greater than 0");
        require(targetUser != address(0), "Invalid target user");
        require(proofHash != bytes32(0), "Invalid proof hash");
        
        // Generate unique transfer ID
        transferId = keccak256(abi.encodePacked(
            msg.sender,
            token,
            amount,
            targetChainId,
            targetUser,
            proofHash,
            block.timestamp,
            block.number
        ));
        
        require(!usedNonces[transferId], "Transfer ID already used");
        usedNonces[transferId] = true;
        
        // Lock tokens
        if (token == address(0)) {
            // Native token transfer
            require(msg.value >= amount, "Insufficient native token sent");
        } else {
            // ERC20 token transfer
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        }
        
        // Create pending transfer
        pendingTransfers[transferId] = CrossChainTransfer({
            user: msg.sender,
            token: token,
            amount: amount,
            sourceChainId: block.chainid,
            targetChainId: targetChainId,
            targetUser: targetUser,
            timestamp: block.timestamp,
            executed: false,
            proofHash: proofHash
        });
        
        emit CrossChainTransferInitiated(
            transferId,
            msg.sender,
            token,
            amount,
            block.chainid,
            targetChainId,
            targetUser
        );
        
        return transferId;
    }

    /**
     * @notice Executes a cross-chain transfer
     * @param transferId The transfer ID to execute
     * @param proof The proof of the transfer
     * @dev This function releases the locked tokens to the target user
     */
    function executeCrossChainTransfer(
        bytes32 transferId,
        bytes calldata proof
    ) external onlyValidTransfer(transferId) nonReentrant {
        CrossChainTransfer storage transfer = pendingTransfers[transferId];
        
        // Check if transfer has timed out
        require(block.timestamp <= transfer.timestamp + transferTimeout, "Transfer timed out");
        
        // Verify proof (simplified for now - in production, use proper proof verification)
        require(keccak256(proof) == transfer.proofHash, "Invalid proof");
        
        // Mark as executed
        transfer.executed = true;
        
        // Release tokens to target user
        if (transfer.token == address(0)) {
            // Native token transfer
            payable(transfer.targetUser).transfer(transfer.amount);
        } else {
            // ERC20 token transfer
            IERC20(transfer.token).safeTransfer(transfer.targetUser, transfer.amount);
        }
        
        emit CrossChainTransferExecuted(
            transferId,
            transfer.user,
            transfer.token,
            transfer.amount,
            transfer.sourceChainId,
            transfer.targetChainId
        );
    }

    /**
     * @notice Cancels a cross-chain transfer
     * @param transferId The transfer ID to cancel
     * @dev This function returns the locked tokens to the original user
     */
    function cancelCrossChainTransfer(bytes32 transferId) external onlyValidTransfer(transferId) nonReentrant {
        CrossChainTransfer storage transfer = pendingTransfers[transferId];
        
        // Only the original user or after timeout can cancel
        require(
            msg.sender == transfer.user || 
            block.timestamp > transfer.timestamp + transferTimeout,
            "Not authorized to cancel"
        );
        
        // Mark as executed to prevent double execution
        transfer.executed = true;
        
        // Return tokens to original user
        if (transfer.token == address(0)) {
            // Native token transfer
            payable(transfer.user).transfer(transfer.amount);
        } else {
            // ERC20 token transfer
            IERC20(transfer.token).safeTransfer(transfer.user, transfer.amount);
        }
        
        emit CrossChainTransferFailed(transferId, "Transfer cancelled");
    }

    /**
     * @notice Gets the mapped token address for a given token and chain
     * @param token The original token address
     * @param chainId The target chain ID
     * @return mappedToken The mapped token address
     */
    function getMappedToken(address token, uint256 chainId) external view returns (address mappedToken) {
        return tokenMappings[token][chainId];
    }

    /**
     * @notice Gets the pending transfer details
     * @param transferId The transfer ID
     * @return transfer The transfer details
     */
    function getPendingTransfer(bytes32 transferId) external view returns (CrossChainTransfer memory transfer) {
        return pendingTransfers[transferId];
    }

    /**
     * @notice Checks if a transfer is valid and not expired
     * @param transferId The transfer ID
     * @return valid Whether the transfer is valid
     * @return expired Whether the transfer has expired
     */
    function isTransferValid(bytes32 transferId) external view returns (bool valid, bool expired) {
        CrossChainTransfer memory transfer = pendingTransfers[transferId];
        valid = transfer.user != address(0) && !transfer.executed;
        expired = block.timestamp > transfer.timestamp + transferTimeout;
        return (valid, expired);
    }

    ///////////////////////////////////////////////////
    ///                   Internal                  ///
    ///////////////////////////////////////////////////

    /**
     * @notice Emergency function to withdraw stuck tokens
     * @param token The token address (address(0) for native tokens)
     * @param amount The amount to withdraw
     * @dev Only the owner can call this function
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(amount);
        } else {
            IERC20(token).safeTransfer(owner(), amount);
        }
    }

    // Allow contract to receive native tokens
    receive() external payable {}
}
