// SPDX-License-Identifier: MIT
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useSelfKYC } from '@/lib/sdk';
import { CheckCircle, AlertCircle, Loader2, Shield, User, Globe, FileText, KeyRound, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showToast, removeToast } from '@/components/simple-toast';
import { SelfQRCode } from '@/components/self-qr-code';

interface KYCStepProps {
  onKYCComplete?: (kycData: any) => void;
  onKYCError?: (error: string) => void;
  onSkip?: () => void;
  className?: string;
}

export function KYCStep({ 
  onKYCComplete, 
  onKYCError, 
  onSkip,
  className = '' 
}: KYCStepProps) {
  const { 
    isVerified, 
    kycData, 
    isLoading, 
    error, 
    config, 
    verifyKYC, 
    clearError 
  } = useSelfKYC();

  const { address: walletAddress, isConnected } = useAccount();
  
  const [showKYCForm, setShowKYCForm] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // Check KYC status when component loads
  useEffect(() => {
    const checkKYCStatus = async () => {
      setIsCheckingStatus(true);
      try {
        // The useSelfKYC hook will automatically fetch the verification status
        // We just need to wait for it to load
        setTimeout(() => {
          setIsCheckingStatus(false);
        }, 2000);
      } catch (err) {
        console.error('Error checking KYC status:', err);
        setIsCheckingStatus(false);
      }
    };

    checkKYCStatus();
  }, []);

  const handleClearError = useCallback(() => {
    clearError();
  }, [clearError]);

  // If wallet is not connected, show connection prompt
  if (!isConnected || !walletAddress) {
    return (
      <div className={`backdrop-blur-3xl backdrop-saturate-200 border border-orange-500/40 rounded-2xl px-6 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)] ${className}`} style={{ background: "rgba(255, 165, 0, 0.06)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-orange-400" />
            </div>
            <h2 className="text-xl font-bold text-orange-400">Wallet Required</h2>
          </div>
        </div>
        
        <div className="text-center py-8">
          <p className="text-orange-300 mb-4">
            Please connect your wallet to start KYC verification.
          </p>
          <p className="text-orange-300/70 text-sm">
            Your wallet address is required for identity verification and on-chain proof submission.
          </p>
        </div>
      </div>
    );
  }

  // If we're still checking the status, show loading
  if (isCheckingStatus || isLoading) {
    return (
      <div className={`backdrop-blur-3xl backdrop-saturate-200 border border-white/15 rounded-2xl px-6 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)] ${className}`} style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-white">Checking KYC Status...</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-white/70">Please wait while we verify your KYC status...</p>
        </div>
      </div>
    );
  }

  if (isVerified && kycData) {
    return (
      <div className={`backdrop-blur-3xl backdrop-saturate-200 border border-green-500/40 rounded-2xl px-6 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)] ${className}`} style={{ background: "rgba(34, 197, 94, 0.06)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-green-400">✅ KYC Verified</h3>
          </div>
          <div className="text-xs text-green-300/70 bg-green-500/10 px-2 py-1 rounded-full">
            Verified {new Date(kycData.timestamp * 1000).toLocaleDateString()}
          </div>
        </div>
        
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-sm text-green-300 mb-2">
            🎉 Your identity has been successfully verified! You now have access to all institutional features.
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm text-white/80">
            <Globe className="w-4 h-4 text-white/60" />
            <span>Nationality: {kycData.nationality}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/80">
            <FileText className="w-4 h-4 text-white/60" />
            <span>Document: {kycData.documentType === 1 ? 'E-Passport' : 'EU ID Card'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/80">
            <Shield className="w-4 h-4 text-white/60" />
            <span>OFAC Clear: {kycData.isOfacClear ? '✅ Yes' : '❌ No'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/80">
            <User className="w-4 h-4 text-white/60" />
            <span>Verifications: {kycData.verificationCount}</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-green-500/20">
          <Button
            onClick={() => {
              showToast('success', '✅ KYC Complete', 'Proceeding with verified account.');
              onKYCComplete?.(kycData);
            }}
            className="w-full rounded-full bg-green-500/20 border border-green-500/30 text-green-300 hover:bg-green-500/30 px-5 py-3 font-medium"
          >
            Continue with Verified Account
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`backdrop-blur-3xl backdrop-saturate-200 border border-white/15 rounded-2xl px-6 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)] ${className}`} style={{ background: "rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">KYC Verification</h2>
        </div>
        <div className="text-xs text-orange-300 bg-orange-500/10 px-2 py-1 rounded-full border border-orange-500/20">
          ⚠️ Not Verified
        </div>
      </div>

      <div className="mb-6">
        <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg mb-4">
          <p className="text-sm text-orange-300">
            🔐 KYC verification required to access institutional features and higher transaction limits.
          </p>
        </div>
        <p className="text-sm text-white/70">
          Complete identity verification using Self.xyz to unlock all platform capabilities.
        </p>
      </div>

      {config && (
        <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
          <h3 className="text-sm font-semibold text-white/60 mb-3">Requirements:</h3>
          <div className="grid grid-cols-2 gap-2 text-sm text-white/50">
            <div>• Minimum age: {config.minimumAge}</div>
            <div>• OFAC check: {config.requireOfacCheck ? 'Required' : 'Not required'}</div>
            <div>• Document types: {config.allowedDocumentTypes.map(t => t === 1 ? 'E-Passport' : 'EU ID Card').join(', ')}</div>
            {config.excludedCountries.length > 0 && (
              <div>• Excluded countries: {config.excludedCountries.join(', ')}</div>
            )}
          </div>
        </div>
      )}

      {!showKYCForm ? (
        <div className="space-y-3">
          <Button
            onClick={() => {
              setShowKYCForm(true);
              showToast('info', '🔐 KYC Verification Started', 'Please generate your Self.xyz proof to continue.');
            }}
            className="w-full rounded-full bg-white/10 border border-white/15 text-white hover:bg-white/15 px-5 py-3 font-medium"
          >
            Start KYC Verification
          </Button>
          {onSkip && (
            <Button
              onClick={() => {
                showToast('warning', '⚠️ KYC Skipped', 'You can complete KYC verification later in settings.');
                onSkip();
              }}
              variant="outline"
              className="w-full rounded-full border-white/15 text-white/70 hover:bg-white/10 px-5 py-3 bg-transparent"
            >
              Skip for Now
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {!showQRCode ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                <KeyRound className="w-8 h-8 text-white" />
              </div>
              <p className="text-sm text-white/60 mb-6">
                Complete your identity verification using Self.xyz
              </p>
              
              <div className="grid grid-cols-1 gap-3">
                <Button
                  onClick={() => setShowQRCode(true)}
                  className="w-full rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 px-5 py-3 font-medium"
                >
                  📱 Start Verification with Self.xyz App
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <SelfQRCode 
                sessionData={{
                  scope: config?.scope || 'tsunami-wallet-kyc',
                  configId: config?.configId || '1',
                  endpoint: process.env.NEXT_PUBLIC_SELF_ENDPOINT || 'https://staging-api.self.xyz',
                  userId: walletAddress as string,
                  requirements: {
                    minimumAge: config?.minimumAge || 18,
                    requireOfacCheck: config?.requireOfacCheck || false,
                    excludedCountries: config?.excludedCountries || [],
                    allowedDocumentTypes: config?.allowedDocumentTypes || [1, 2, 3]
                  }
                }}
                userId={walletAddress as string}
                onSuccess={() => {
                  console.log('Self.xyz verification successful');
                  showToast('success', 'Verification Successful', 'Your identity has been verified through Self.xyz');
                  // The proof will come from the Self.xyz verification callback
                  // For now, trigger the verification completion
                  onKYCComplete?.(null);
                }}
                onError={(error) => {
                  console.error('Self.xyz verification error:', error);
                  showToast('error', 'Verification Error', error);
                  onKYCError?.(error);
                }}
              />
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-300">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
          <button onClick={handleClearError} className="ml-auto text-red-400 hover:text-red-300">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
