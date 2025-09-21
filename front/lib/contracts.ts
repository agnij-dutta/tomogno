// Contract addresses and ABIs
export const REGISTRAR_CONTRACT = {
    address: '0x200C0a7C5B49871e41789F5E585Ddb3359e13e8B' as const,
    abi: [
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "user",
            "type": "address"
          }
        ],
        "name": "isUserRegistered",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "user",
            "type": "address"
          }
        ],
        "name": "getUserPublicKey",
        "outputs": [
          {
            "internalType": "uint256[2]",
            "name": "publicKey",
            "type": "uint256[2]"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256[2]",
                    "name": "a",
                    "type": "uint256[2]"
                  },
                  {
                    "internalType": "uint256[2][2]",
                    "name": "b",
                    "type": "uint256[2][2]"
                  },
                  {
                    "internalType": "uint256[2]",
                    "name": "c",
                    "type": "uint256[2]"
                  }
                ],
                "internalType": "struct ProofPoints",
                "name": "proofPoints",
                "type": "tuple"
              },
              {
                "internalType": "uint256[5]",
                "name": "publicSignals",
                "type": "uint256[5]"
              }
            ],
            "internalType": "struct RegisterProof",
            "name": "proof",
            "type": "tuple"
          }
        ],
        "name": "register",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ] as const
  } as const;
  
  
  export const EERC_CONTRACT = {
    address: '0xD5afc45c69644CBd63f362D64B4198a7d81e53C7' as const,
    abi: [
      {
        "inputs": [
          {
            "components": [
              {
                "internalType": "address",
                "name": "registrar",
                "type": "address"
              },
              {
                "internalType": "bool",
                "name": "isConverter",
                "type": "bool"
              },
              {
                "internalType": "string",
                "name": "name",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "symbol",
                "type": "string"
              },
              {
                "internalType": "uint8",
                "name": "decimals",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "mintVerifier",
                "type": "address"
              },
              {
                "internalType": "address",
                "name": "withdrawVerifier",
                "type": "address"
              },
              {
                "internalType": "address",
                "name": "transferVerifier",
                "type": "address"
              },
              {
                "internalType": "address",
                "name": "burnVerifier",
                "type": "address"
              }
            ],
            "internalType": "struct CreateEncryptedERCParams",
            "name": "params",
            "type": "tuple"
          }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
      },
      {
        "inputs": [],
        "name": "InvalidChainId",
        "type": "error"
      },
      {
        "inputs": [],
        "name": "InvalidNullifier",
        "type": "error"
      },
      {
        "inputs": [],
        "name": "InvalidOperation",
        "type": "error"
      },
      {
        "inputs": [],
        "name": "InvalidProof",
        "type": "error"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          }
        ],
        "name": "OwnableInvalidOwner",
        "type": "error"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "account",
            "type": "address"
          }
        ],
        "name": "OwnableUnauthorizedAccount",
        "type": "error"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          }
        ],
        "name": "SafeERC20FailedOperation",
        "type": "error"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          }
        ],
        "name": "TokenBlacklisted",
        "type": "error"
      },
      {
        "inputs": [],
        "name": "TransferFailed",
        "type": "error"
      },
      {
        "inputs": [],
        "name": "UnknownToken",
        "type": "error"
      },
      {
        "inputs": [],
        "name": "UserNotRegistered",
        "type": "error"
      },
      {
        "inputs": [],
        "name": "ZeroAddress",
        "type": "error"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "address",
            "name": "oldAuditor",
            "type": "address"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "newAuditor",
            "type": "address"
          }
        ],
        "name": "AuditorChanged",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "address",
            "name": "user",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "dust",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "tokenId",
            "type": "uint256"
          }
        ],
        "name": "Deposit",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "address",
            "name": "previousOwner",
            "type": "address"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "newOwner",
            "type": "address"
          }
        ],
        "name": "OwnershipTransferStarted",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "address",
            "name": "previousOwner",
            "type": "address"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "newOwner",
            "type": "address"
          }
        ],
        "name": "OwnershipTransferred",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "address",
            "name": "user",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256[7]",
            "name": "auditorPCT",
            "type": "uint256[7]"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "auditorAddress",
            "type": "address"
          }
        ],
        "name": "PrivateBurn",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "address",
            "name": "user",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256[7]",
            "name": "auditorPCT",
            "type": "uint256[7]"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "auditorAddress",
            "type": "address"
          }
        ],
        "name": "PrivateMint",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "address",
            "name": "from",
            "type": "address"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "to",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256[7]",
            "name": "auditorPCT",
            "type": "uint256[7]"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "auditorAddress",
            "type": "address"
          }
        ],
        "name": "PrivateTransfer",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "address",
            "name": "user",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "tokenId",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256[7]",
            "name": "auditorPCT",
            "type": "uint256[7]"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "auditorAddress",
            "type": "address"
          }
        ],
        "name": "Withdraw",
        "type": "event"
      },
      {
        "inputs": [],
        "name": "acceptOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "mintNullifier",
            "type": "uint256"
          }
        ],
        "name": "alreadyMinted",
        "outputs": [
          {
            "internalType": "bool",
            "name": "isUsed",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "auditor",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "auditorPublicKey",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "x",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "y",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "user",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "tokenId",
            "type": "uint256"
          }
        ],
        "name": "balanceOf",
        "outputs": [
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "x",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "y",
                    "type": "uint256"
                  }
                ],
                "internalType": "struct Point",
                "name": "c1",
                "type": "tuple"
              },
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "x",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "y",
                    "type": "uint256"
                  }
                ],
                "internalType": "struct Point",
                "name": "c2",
                "type": "tuple"
              }
            ],
            "internalType": "struct EGCT",
            "name": "eGCT",
            "type": "tuple"
          },
          {
            "internalType": "uint256",
            "name": "nonce",
            "type": "uint256"
          },
          {
            "components": [
              {
                "internalType": "uint256[7]",
                "name": "pct",
                "type": "uint256[7]"
              },
              {
                "internalType": "uint256",
                "name": "index",
                "type": "uint256"
              }
            ],
            "internalType": "struct AmountPCT[]",
            "name": "amountPCTs",
            "type": "tuple[]"
          },
          {
            "internalType": "uint256[7]",
            "name": "balancePCT",
            "type": "uint256[7]"
          },
          {
            "internalType": "uint256",
            "name": "transactionIndex",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "user",
            "type": "address"
          }
        ],
        "name": "balanceOfStandalone",
        "outputs": [
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "x",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "y",
                    "type": "uint256"
                  }
                ],
                "internalType": "struct Point",
                "name": "c1",
                "type": "tuple"
              },
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "x",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "y",
                    "type": "uint256"
                  }
                ],
                "internalType": "struct Point",
                "name": "c2",
                "type": "tuple"
              }
            ],
            "internalType": "struct EGCT",
            "name": "eGCT",
            "type": "tuple"
          },
          {
            "internalType": "uint256",
            "name": "nonce",
            "type": "uint256"
          },
          {
            "components": [
              {
                "internalType": "uint256[7]",
                "name": "pct",
                "type": "uint256[7]"
              },
              {
                "internalType": "uint256",
                "name": "index",
                "type": "uint256"
              }
            ],
            "internalType": "struct AmountPCT[]",
            "name": "amountPCTs",
            "type": "tuple[]"
          },
          {
            "internalType": "uint256[7]",
            "name": "balancePCT",
            "type": "uint256[7]"
          },
          {
            "internalType": "uint256",
            "name": "transactionIndex",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "user",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "tokenId",
            "type": "uint256"
          }
        ],
        "name": "balances",
        "outputs": [
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "x",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "y",
                    "type": "uint256"
                  }
                ],
                "internalType": "struct Point",
                "name": "c1",
                "type": "tuple"
              },
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "x",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "y",
                    "type": "uint256"
                  }
                ],
                "internalType": "struct Point",
                "name": "c2",
                "type": "tuple"
              }
            ],
            "internalType": "struct EGCT",
            "name": "eGCT",
            "type": "tuple"
          },
          {
            "internalType": "uint256",
            "name": "nonce",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "transactionIndex",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "tokenAddress",
            "type": "address"
          }
        ],
        "name": "blacklistedTokens",
        "outputs": [
          {
            "internalType": "bool",
            "name": "isBlacklisted",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "burnVerifier",
        "outputs": [
          {
            "internalType": "contract IBurnVerifier",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "decimals",
        "outputs": [
          {
            "internalType": "uint8",
            "name": "",
            "type": "uint8"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "tokenAddress",
            "type": "address"
          },
          {
            "internalType": "uint256[7]",
            "name": "amountPCT",
            "type": "uint256[7]"
          }
        ],
        "name": "deposit",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "user",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "tokenAddress",
            "type": "address"
          }
        ],
        "name": "getBalanceFromTokenAddress",
        "outputs": [
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "x",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "y",
                    "type": "uint256"
                  }
                ],
                "internalType": "struct Point",
                "name": "c1",
                "type": "tuple"
              },
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "x",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "y",
                    "type": "uint256"
                  }
                ],
                "internalType": "struct Point",
                "name": "c2",
                "type": "tuple"
              }
            ],
            "internalType": "struct EGCT",
            "name": "eGCT",
            "type": "tuple"
          },
          {
            "internalType": "uint256",
            "name": "nonce",
            "type": "uint256"
          },
          {
            "components": [
              {
                "internalType": "uint256[7]",
                "name": "pct",
                "type": "uint256[7]"
              },
              {
                "internalType": "uint256",
                "name": "index",
                "type": "uint256"
              }
            ],
            "internalType": "struct AmountPCT[]",
            "name": "amountPCTs",
            "type": "tuple[]"
          },
          {
            "internalType": "uint256[7]",
            "name": "balancePCT",
            "type": "uint256[7]"
          },
          {
            "internalType": "uint256",
            "name": "transactionIndex",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "getTokens",
        "outputs": [
          {
            "internalType": "address[]",
            "name": "",
            "type": "address[]"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "isAuditorKeySet",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "isConverter",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "mintVerifier",
        "outputs": [
          {
            "internalType": "contract IMintVerifier",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "name",
        "outputs": [
          {
            "internalType": "string",
            "name": "",
            "type": "string"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "nextTokenId",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "owner",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "pendingOwner",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256[2]",
                    "name": "a",
                    "type": "uint256[2]"
                  },
                  {
                    "internalType": "uint256[2][2]",
                    "name": "b",
                    "type": "uint256[2][2]"
                  },
                  {
                    "internalType": "uint256[2]",
                    "name": "c",
                    "type": "uint256[2]"
                  }
                ],
                "internalType": "struct ProofPoints",
                "name": "proofPoints",
                "type": "tuple"
              },
              {
                "internalType": "uint256[19]",
                "name": "publicSignals",
                "type": "uint256[19]"
              }
            ],
            "internalType": "struct BurnProof",
            "name": "proof",
            "type": "tuple"
          },
          {
            "internalType": "uint256[7]",
            "name": "balancePCT",
            "type": "uint256[7]"
          }
        ],
        "name": "privateBurn",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "user",
            "type": "address"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256[2]",
                    "name": "a",
                    "type": "uint256[2]"
                  },
                  {
                    "internalType": "uint256[2][2]",
                    "name": "b",
                    "type": "uint256[2][2]"
                  },
                  {
                    "internalType": "uint256[2]",
                    "name": "c",
                    "type": "uint256[2]"
                  }
                ],
                "internalType": "struct ProofPoints",
                "name": "proofPoints",
                "type": "tuple"
              },
              {
                "internalType": "uint256[24]",
                "name": "publicSignals",
                "type": "uint256[24]"
              }
            ],
            "internalType": "struct MintProof",
            "name": "proof",
            "type": "tuple"
          }
        ],
        "name": "privateMint",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "registrar",
        "outputs": [
          {
            "internalType": "contract IRegistrar",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "renounceOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "user",
            "type": "address"
          }
        ],
        "name": "setAuditorPublicKey",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "bool",
            "name": "blacklisted",
            "type": "bool"
          }
        ],
        "name": "setTokenBlacklist",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "symbol",
        "outputs": [
          {
            "internalType": "string",
            "name": "",
            "type": "string"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "tokenId",
            "type": "uint256"
          }
        ],
        "name": "tokenAddresses",
        "outputs": [
          {
            "internalType": "address",
            "name": "tokenAddress",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "tokenAddress",
            "type": "address"
          }
        ],
        "name": "tokenIds",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "tokenId",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "tokens",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "to",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "tokenId",
            "type": "uint256"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256[2]",
                    "name": "a",
                    "type": "uint256[2]"
                  },
                  {
                    "internalType": "uint256[2][2]",
                    "name": "b",
                    "type": "uint256[2][2]"
                  },
                  {
                    "internalType": "uint256[2]",
                    "name": "c",
                    "type": "uint256[2]"
                  }
                ],
                "internalType": "struct ProofPoints",
                "name": "proofPoints",
                "type": "tuple"
              },
              {
                "internalType": "uint256[32]",
                "name": "publicSignals",
                "type": "uint256[32]"
              }
            ],
            "internalType": "struct TransferProof",
            "name": "proof",
            "type": "tuple"
          },
          {
            "internalType": "uint256[7]",
            "name": "balancePCT",
            "type": "uint256[7]"
          }
        ],
        "name": "transfer",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "newOwner",
            "type": "address"
          }
        ],
        "name": "transferOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "transferVerifier",
        "outputs": [
          {
            "internalType": "contract ITransferVerifier",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "tokenId",
            "type": "uint256"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256[2]",
                    "name": "a",
                    "type": "uint256[2]"
                  },
                  {
                    "internalType": "uint256[2][2]",
                    "name": "b",
                    "type": "uint256[2][2]"
                  },
                  {
                    "internalType": "uint256[2]",
                    "name": "c",
                    "type": "uint256[2]"
                  }
                ],
                "internalType": "struct ProofPoints",
                "name": "proofPoints",
                "type": "tuple"
              },
              {
                "internalType": "uint256[16]",
                "name": "publicSignals",
                "type": "uint256[16]"
              }
            ],
            "internalType": "struct WithdrawProof",
            "name": "proof",
            "type": "tuple"
          },
          {
            "internalType": "uint256[7]",
            "name": "balancePCT",
            "type": "uint256[7]"
          }
        ],
        "name": "withdraw",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "withdrawVerifier",
        "outputs": [
          {
            "internalType": "contract IWithdrawVerifier",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      }
    ] as const
  } as const;
  
  export const ERC20_TEST = {
    address: '0xd7f834eF5d3A089e3Ec3A9E08EA035926D6A0bA1' as const,
    abi: [
      {
        "inputs": [
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "symbol",
            "type": "string"
          },
          {
            "internalType": "uint8",
            "name": "decimal",
            "type": "uint8"
          }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "spender",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "allowance",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "needed",
            "type": "uint256"
          }
        ],
        "name": "ERC20InsufficientAllowance",
        "type": "error"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "sender",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "balance",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "needed",
            "type": "uint256"
          }
        ],
        "name": "ERC20InsufficientBalance",
        "type": "error"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "approver",
            "type": "address"
          }
        ],
        "name": "ERC20InvalidApprover",
        "type": "error"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "receiver",
            "type": "address"
          }
        ],
        "name": "ERC20InvalidReceiver",
        "type": "error"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "sender",
            "type": "address"
          }
        ],
        "name": "ERC20InvalidSender",
        "type": "error"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "spender",
            "type": "address"
          }
        ],
        "name": "ERC20InvalidSpender",
        "type": "error"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "address",
            "name": "owner",
            "type": "address"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "spender",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "value",
            "type": "uint256"
          }
        ],
        "name": "Approval",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "address",
            "name": "user",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          }
        ],
        "name": "FaucetClaimed",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "address",
            "name": "from",
            "type": "address"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "to",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "value",
            "type": "uint256"
          }
        ],
        "name": "Transfer",
        "type": "event"
      },
      {
        "inputs": [],
        "name": "FAUCET_AMOUNT",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "FAUCET_COOLDOWN",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "spender",
            "type": "address"
          }
        ],
        "name": "allowance",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "spender",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "value",
            "type": "uint256"
          }
        ],
        "name": "approve",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "account",
            "type": "address"
          }
        ],
        "name": "balanceOf",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "user",
            "type": "address"
          }
        ],
        "name": "canClaimFromFaucet",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "claimFromFaucet",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "decimals",
        "outputs": [
          {
            "internalType": "uint8",
            "name": "",
            "type": "uint8"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "decimals_",
        "outputs": [
          {
            "internalType": "uint8",
            "name": "",
            "type": "uint8"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "user",
            "type": "address"
          }
        ],
        "name": "getNextFaucetClaimTime",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "name": "lastFaucetClaim",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "to",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "mint",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "name",
        "outputs": [
          {
            "internalType": "string",
            "name": "",
            "type": "string"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "symbol",
        "outputs": [
          {
            "internalType": "string",
            "name": "",
            "type": "string"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "to",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "value",
            "type": "uint256"
          }
        ],
        "name": "transfer",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "from",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "to",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "value",
            "type": "uint256"
          }
        ],
        "name": "transferFrom",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ] as const
  } as const;
  
  