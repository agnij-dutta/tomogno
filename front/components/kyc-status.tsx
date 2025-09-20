'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export function KYCStatus() {
  const { address } = useAccount();
  const [kycStatus, setKycStatus] = useState<{
    isVerified: boolean | null;
    loading: boolean;
    error: string | null;
  }>({
    isVerified: null,
    loading: false,
    error: null
  });

  useEffect(() => {
    if (address) {
      checkKycStatus();
    }
  }, [address]);

  const checkKycStatus = async () => {
    if (!address) return;
    
    setKycStatus(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await fetch('/api/check-kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setKycStatus({
          isVerified: data.isVerified,
          loading: false,
          error: null
        });
      } else {
        setKycStatus({
          isVerified: false,
          loading: false,
          error: data.error || 'Failed to check KYC'
        });
      }
    } catch (error) {
      setKycStatus({
        isVerified: false,
        loading: false,
        error: 'Network error'
      });
    }
  };

  if (!address) {
    return (
      <div className="p-4 rounded-xl bg-gray-500/10 border border-gray-500/20">
        <div className="flex items-center gap-3 text-gray-300">
          <AlertCircle className="w-5 h-5" />
          <div>
            <p className="font-medium">Wallet Not Connected</p>
            <p className="text-xs text-gray-400">Connect your wallet to check KYC status</p>
          </div>
        </div>
      </div>
    );
  }

  if (kycStatus.loading) {
    return (
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <div className="flex items-center gap-3 text-blue-300">
          <Loader2 className="w-5 h-5 animate-spin" />
          <div>
            <p className="font-medium">Checking KYC Status...</p>
            <p className="text-xs text-blue-300/70">Reading from Mock Oracle contract</p>
          </div>
        </div>
      </div>
    );
  }

  if (kycStatus.error) {
    return (
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
        <div className="flex items-center gap-3 text-red-300">
          <AlertCircle className="w-5 h-5" />
          <div>
            <p className="font-medium">Error Checking KYC</p>
            <p className="text-xs text-red-300/70">{kycStatus.error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (kycStatus.isVerified === true) {
    return (
      <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
        <div className="flex items-center gap-3 text-green-300">
          <CheckCircle className="w-5 h-5" />
          <div>
            <p className="font-medium">✅ KYC Verified</p>
            <p className="text-xs text-green-300/70">
              Your wallet is verified on the Mock Oracle contract
            </p>
            <p className="text-xs text-green-300/50 mt-1">
              Address: {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
      <div className="flex items-center gap-3 text-orange-300">
        <AlertCircle className="w-5 h-5" />
        <div>
          <p className="font-medium">❌ KYC Not Verified</p>
          <p className="text-xs text-orange-300/70">
            Complete verification to access institutional features
          </p>
          <p className="text-xs text-orange-300/50 mt-1">
            Address: {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>
        </div>
      </div>
    </div>
  );
}
