'use client';

import React from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { EERC_CONTRACT } from '../lib/contracts';
import { sepolia } from 'wagmi/chains';
import { useSignMessage } from 'wagmi';
import { getDecryptedBalance, i0 } from '../lib/balances/balances';

export function useEncryptedBalance() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const { data: encryptedBalance, isLoading, error } = useReadContract({
    address: EERC_CONTRACT.address,
    abi: EERC_CONTRACT.abi,
    functionName: 'getBalanceFromTokenAddress',
    args: address ? [address, "0x0000000000000000000000000000000000000000"] : undefined,
    chainId: sepolia.id,
    query: {
      enabled: !!address,
    },
  });

  // Debug the contract call result
  React.useEffect(() => {
    console.log('🔍 Contract call result:', { encryptedBalance, isLoading, error });
  }, [encryptedBalance, isLoading, error]);

  const [decryptedBalance, setDecryptedBalance] = React.useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = React.useState(false);
  const [decryptError, setDecryptError] = React.useState<string | null>(null);

  React.useEffect(() => {
    console.log('🔍 useEncryptedBalance effect triggered:', { encryptedBalance, address });
    if (encryptedBalance && address) {
      const decryptBalance = async () => {
        try {
          setIsDecrypting(true);
          setDecryptError(null);
          
          console.log('🔍 Encrypted balance data:', encryptedBalance);
          
          const message = `Decrypt balance for ${address}`;
          const signature = await signMessageAsync({ message });
          
          const privateKey = i0(signature);
          console.log('🔍 Derived private key:', privateKey.toString());
          
          const balance = await getDecryptedBalance(privateKey, [], [], encryptedBalance as any);
          console.log('🔍 Decrypted balance result:', balance.toString());
          setDecryptedBalance(balance.toString());
        } catch (err) {
          console.error('Error decrypting balance:', err);
          setDecryptError(err instanceof Error ? err.message : 'Failed to decrypt balance');
        } finally {
          setIsDecrypting(false);
        }
      };

      decryptBalance();
    }
  }, [encryptedBalance, address, signMessageAsync]);

  const formattedEncryptedBalance = decryptedBalance ? 
    `${parseFloat(decryptedBalance).toFixed(4)} eETH` : 
    '0.0000 eETH';

  return {
    encryptedBalance,
    decryptedBalance,
    formattedEncryptedBalance,
    isLoading: isLoading || isDecrypting,
    error: error || decryptError,
  };
}