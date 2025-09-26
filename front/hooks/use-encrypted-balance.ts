'use client';

import React from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { createPublicClient, http } from 'viem';
import { EERC_CONTRACT } from '../lib/contracts';
import { sepolia } from 'wagmi/chains';
import { useSignMessage } from 'wagmi';
import { getDecryptedBalance, i0 } from '../lib/balances/balances';

export function useEncryptedBalance(tokenAddress?: `0x${string}`, tokenDecimals: number = 18) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const { data: encryptedBalance, isLoading, error } = useReadContract({
    address: EERC_CONTRACT.address,
    abi: EERC_CONTRACT.abi,
    functionName: 'getBalanceFromTokenAddress',
    args: address && tokenAddress ? [address, tokenAddress] : address ? [address, "0x0000000000000000000000000000000000000000"] : undefined,
    chainId: sepolia.id,
    query: {
      enabled: !!address && (!!tokenAddress || true),
    },
    scopeKey: tokenAddress ? `encbal:${tokenAddress}` : 'encbal:native',
  });

  // Debug the contract call result
  React.useEffect(() => {
    console.log('🔍 Contract call result:', { encryptedBalance, isLoading, error });
  }, [encryptedBalance, isLoading, error]);

  const [decryptedBalance, setDecryptedBalance] = React.useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = React.useState(false);
  const [decryptError, setDecryptError] = React.useState<string | null>(null);

  React.useEffect(() => {
    console.log('🔍 useEncryptedBalance effect triggered:', { encryptedBalance, address, tokenAddress });
    if (address) {
      const decryptBalance = async () => {
        try {
          setIsDecrypting(true);
          setDecryptError(null);
          
          console.log('🔍 Encrypted balance data:', encryptedBalance);

          // Helper to test if EGCT is zero
          const isEgctZero = (eb: any) => {
            try {
              const egct = eb?.eGCT ?? eb?.[0];
              const c1x = BigInt(egct?.c1?.x ?? 0);
              const c1y = BigInt(egct?.c1?.y ?? 0);
              const c2x = BigInt(egct?.c2?.x ?? 0);
              const c2y = BigInt(egct?.c2?.y ?? 0);
              return c1x === 0n && c1y === 0n && c2x === 0n && c2y === 0n;
            } catch {
              return true;
            }
          };

          let ebLocal: any = encryptedBalance as any;

          // Always fetch fresh when tokenAddress provided to ensure immediate update on selection change
          try {
            const client = createPublicClient({ chain: sepolia, transport: http() });
            const fetched = await client.readContract({
              address: EERC_CONTRACT.address,
              abi: EERC_CONTRACT.abi,
              functionName: 'getBalanceFromTokenAddress',
              args: [address as `0x${string}`, (tokenAddress || '0x0000000000000000000000000000000000000000') as `0x${string}`],
            });
            ebLocal = fetched;
          } catch (e) {
            console.warn('Direct fetch of encrypted balance failed; using cached value', e);
          }

          // Fallback: if zero for native token, scan all registered tokens and pick first non-zero
          if (!tokenAddress && isEgctZero(ebLocal)) {
            const client = createPublicClient({ chain: sepolia, transport: http() });
            try {
              const tokens = await client.readContract({
                address: EERC_CONTRACT.address,
                abi: EERC_CONTRACT.abi,
                functionName: 'getTokens',
              }) as `0x${string}`[];

              const candidates: (`0x${string}`)[] = [
                '0x0000000000000000000000000000000000000000',
                ...tokens,
              ];

              for (const tokenAddr of candidates) {
                const eb = await client.readContract({
                  address: EERC_CONTRACT.address,
                  abi: EERC_CONTRACT.abi,
                  functionName: 'getBalanceFromTokenAddress',
                  args: [address as `0x${string}`, tokenAddr],
                });
                if (!isEgctZero(eb)) {
                  ebLocal = eb;
                  console.log('🔍 Using non-zero balance from token:', tokenAddr);
                  break;
                }
              }
            } catch (e) {
              console.warn('Fallback token scan failed:', e);
            }
          }
          
          // Use the exact same deterministic message used during registration
          const registrationMessage = `eERC\nRegistering user with\n Address:${address.toLowerCase()}`;
          const signature = await signMessageAsync({ message: registrationMessage });
          
          const privateKey = i0(signature);
          console.log('🔍 Derived private key:', privateKey.toString());
          
          const balance = await getDecryptedBalance(privateKey, [], [], ebLocal as any, tokenDecimals);
          console.log('🔍 Decrypted balance result:', balance.toString());
          
          // Convert from BigInt with tokenDecimals to decimal string
          const balanceInEth = Number(balance) / 10 ** tokenDecimals;
          setDecryptedBalance(balanceInEth.toString());
        } catch (err) {
          console.error('Error decrypting balance:', err);
          setDecryptError(err instanceof Error ? err.message : 'Failed to decrypt balance');
        } finally {
          setIsDecrypting(false);
        }
      };

      decryptBalance();
    }
  }, [encryptedBalance, address, signMessageAsync, tokenAddress]);

  const formattedEncryptedBalance = decryptedBalance ? 
    `${Number(decryptedBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}` : 
    '0.000000';

  return {
    encryptedBalance,
    decryptedBalance,
    formattedEncryptedBalance,
    isLoading: isLoading || isDecrypting,
    error: error || decryptError,
  };
}