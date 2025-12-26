import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from 'wagmi';
import { parseUnits } from 'viem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTokens } from '@/hooks/useTokens';
import { formatTokenBalance, type AlchemyToken } from '@/lib/alchemy';
import { HARVEST_ABI, ERC20_ABI, HARVEST_ADDRESS } from '@/contracts/harvest';
import { isHarvestDeployed } from '@/config/chains';
import { Coins, RefreshCw, Send, Check, Loader2, AlertTriangle } from 'lucide-react';

interface TokenItemProps {
  token: AlchemyToken;
  onSell: (token: AlchemyToken, amount: string) => void;
  isSelling: boolean;
}

function TokenItem({ token, onSell, isSelling }: TokenItemProps) {
  const [amount, setAmount] = useState('');
  const formattedBalance = formatTokenBalance(token.tokenBalance, token.decimals || 18);

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3">
        {token.logo ? (
          <img src={token.logo} alt={token.symbol} className="w-10 h-10 rounded-full" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Coins className="w-5 h-5 text-primary" />
          </div>
        )}
        <div>
          <p className="font-medium">{token.name || 'Unknown Token'}</p>
          <p className="text-sm text-muted-foreground">
            {formattedBalance} {token.symbol || '???'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="text"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-32"
        />
        <Button
          size="sm"
          onClick={() => onSell(token, amount)}
          disabled={!amount || isSelling}
        >
          {isSelling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span className="ml-2">Sell</span>
        </Button>
      </div>
    </div>
  );
}

export function TokenList() {
  const { tokens, isLoading, error, refetch } = useTokens();
  const { address } = useAccount();
  const chainId = useChainId();
  const [sellingToken, setSellingToken] = useState<string | null>(null);
  const [step, setStep] = useState<'idle' | 'approving' | 'selling'>('idle');
  const harvestDeployed = isHarvestDeployed(chainId);

  const { writeContract: writeApprove, data: approveHash } = useWriteContract();
  const { writeContract: writeSell, data: sellHash } = useWriteContract();

  const { isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isSuccess: isSellSuccess, isLoading: isSellLoading } = useWaitForTransactionReceipt({
    hash: sellHash,
  });

  const handleSell = async (token: AlchemyToken, amountStr: string) => {
    if (!address || !amountStr || !harvestDeployed) return;

    const decimals = token.decimals || 18;
    const amount = parseUnits(amountStr, decimals);

    setSellingToken(token.contractAddress);
    setStep('approving');

    try {
      // First approve the Harvest contract to spend tokens
      writeApprove({
        address: token.contractAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [HARVEST_ADDRESS, amount],
        chainId,
      });
    } catch (err) {
      console.error('Error approving:', err);
      setSellingToken(null);
      setStep('idle');
    }
  };

  // When approval is successful, proceed to sell
  if (isApproveSuccess && step === 'approving' && sellingToken) {
    const token = tokens.find(t => t.contractAddress === sellingToken);
    if (token) {
      setStep('selling');
      writeSell({
        address: HARVEST_ADDRESS,
        abi: HARVEST_ABI,
        functionName: 'sellErc20',
        args: [token.contractAddress as `0x${string}`, BigInt(token.tokenBalance)],
        chainId,
      });
    }
  }

  // Reset state when sell is successful
  if (isSellSuccess && step === 'selling') {
    setSellingToken(null);
    setStep('idle');
    refetch();
  }

  if (!address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            ERC20 Tokens
          </CardTitle>
          <CardDescription>Connect your wallet to view tokens</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5" />
              ERC20 Tokens
            </CardTitle>
            <CardDescription>
              Sell your tokens to the Harvest contract for 1 gwei each
            </CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-4 border rounded-lg">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            <p>Error loading tokens: {error}</p>
            <Button variant="outline" onClick={() => refetch()} className="mt-4">
              Try Again
            </Button>
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Coins className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No ERC20 tokens found</p>
            <p className="text-sm mt-2">
              Make sure you have the Alchemy API key configured
            </p>
          </div>
        ) : !harvestDeployed ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <p className="text-sm">Harvest is not deployed on this chain. Switch to Ethereum or Base to sell.</p>
            </div>
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-3 opacity-60">
                {tokens.map((token) => (
                  <TokenItem
                    key={token.contractAddress}
                    token={token}
                    onSell={() => {}}
                    isSelling={false}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {tokens.map((token) => (
                <TokenItem
                  key={token.contractAddress}
                  token={token}
                  onSell={handleSell}
                  isSelling={sellingToken === token.contractAddress}
                />
              ))}
            </div>
          </ScrollArea>
        )}
        
        {step !== 'idle' && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              {step === 'approving' && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Approving token transfer...</span>
                </>
              )}
              {step === 'selling' && !isSellLoading && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Selling token...</span>
                </>
              )}
              {isSellSuccess && (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Token sold successfully!</span>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
