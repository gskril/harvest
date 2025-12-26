import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNFTs } from '@/hooks/useNFTs';
import { type AlchemyNFT } from '@/lib/alchemy';
import { HARVEST_ABI, ERC721_ABI, ERC1155_ABI, HARVEST_ADDRESS } from '@/contracts/harvest';
import { isHarvestDeployed } from '@/config/chains';
import { ImageIcon, RefreshCw, Send, Check, Loader2, AlertTriangle } from 'lucide-react';

interface NFTItemProps {
  nft: AlchemyNFT;
  onSell: (nft: AlchemyNFT, amount?: string) => void;
  isSelling: boolean;
}

function NFTItem({ nft, onSell, isSelling }: NFTItemProps) {
  const [amount, setAmount] = useState('1');
  const isERC1155 = nft.tokenType === 'ERC1155';
  
  const imageUrl = nft.image?.thumbnailUrl || 
                   nft.image?.cachedUrl || 
                   nft.image?.pngUrl ||
                   nft.raw?.metadata?.image ||
                   nft.contract.openSeaMetadata?.imageUrl;

  const nftName = nft.name || 
                  nft.raw?.metadata?.name || 
                  `#${nft.tokenId}`;

  const collectionName = nft.contract.name || 
                         nft.contract.openSeaMetadata?.collectionName ||
                         'Unknown Collection';

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={nftName}
            className="w-16 h-16 rounded-lg object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-primary" />
          </div>
        )}
        <div>
          <p className="font-medium">{nftName}</p>
          <p className="text-sm text-muted-foreground">{collectionName}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={isERC1155 ? "default" : "secondary"}>
              {nft.tokenType}
            </Badge>
            {isERC1155 && nft.balance && (
              <Badge variant="outline">Balance: {nft.balance}</Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isERC1155 && (
          <Input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-24"
            min="1"
          />
        )}
        <Button
          size="sm"
          onClick={() => onSell(nft, isERC1155 ? amount : undefined)}
          disabled={isSelling || (isERC1155 && (!amount || parseInt(amount) < 1))}
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

export function NFTList() {
  const { nfts, isLoading, error, totalCount, refetch } = useNFTs();
  const { address } = useAccount();
  const chainId = useChainId();
  const [sellingNFT, setSellingNFT] = useState<string | null>(null);
  const [step, setStep] = useState<'idle' | 'approving' | 'selling'>('idle');
  const [pendingSell, setPendingSell] = useState<{ nft: AlchemyNFT; amount?: string } | null>(null);
  const harvestDeployed = isHarvestDeployed(chainId);

  const { writeContract: writeApprove, data: approveHash } = useWriteContract();
  const { writeContract: writeSell, data: sellHash } = useWriteContract();

  const { isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isSuccess: isSellSuccess, isLoading: isSellLoading } = useWaitForTransactionReceipt({
    hash: sellHash,
  });

  const handleSell = async (nft: AlchemyNFT, amount?: string) => {
    if (!address || !harvestDeployed) return;

    const nftKey = `${nft.contract.address}-${nft.tokenId}`;
    setSellingNFT(nftKey);
    setStep('approving');
    setPendingSell({ nft, amount });

    try {
      if (nft.tokenType === 'ERC721') {
        // For ERC721, approve the specific token
        writeApprove({
          address: nft.contract.address as `0x${string}`,
          abi: ERC721_ABI,
          functionName: 'approve',
          args: [HARVEST_ADDRESS, BigInt(nft.tokenId)],
          chainId,
        });
      } else {
        // For ERC1155, set approval for all
        writeApprove({
          address: nft.contract.address as `0x${string}`,
          abi: ERC1155_ABI,
          functionName: 'setApprovalForAll',
          args: [HARVEST_ADDRESS, true],
          chainId,
        });
      }
    } catch (err) {
      console.error('Error approving:', err);
      setSellingNFT(null);
      setStep('idle');
      setPendingSell(null);
    }
  };

  // When approval is successful, proceed to sell
  if (isApproveSuccess && step === 'approving' && pendingSell) {
    const { nft, amount } = pendingSell;
    setStep('selling');
    
    if (nft.tokenType === 'ERC721') {
      writeSell({
        address: HARVEST_ADDRESS,
        abi: HARVEST_ABI,
        functionName: 'sellErc721',
        args: [nft.contract.address as `0x${string}`, BigInt(nft.tokenId)],
        chainId,
      });
    } else {
      writeSell({
        address: HARVEST_ADDRESS,
        abi: HARVEST_ABI,
        functionName: 'sellErc1155',
        args: [
          nft.contract.address as `0x${string}`,
          BigInt(nft.tokenId),
          BigInt(amount || '1'),
        ],
        chainId,
      });
    }
  }

  // Reset state when sell is successful
  if (isSellSuccess && step === 'selling') {
    setSellingNFT(null);
    setStep('idle');
    setPendingSell(null);
    refetch();
  }

  if (!address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            NFTs
          </CardTitle>
          <CardDescription>Connect your wallet to view NFTs</CardDescription>
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
              <ImageIcon className="w-5 h-5" />
              NFTs
              {totalCount > 0 && (
                <Badge variant="secondary">{totalCount}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Sell your NFTs to the Harvest contract for 1 gwei each
            </CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={refetch} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-4 border rounded-lg">
                <Skeleton className="w-16 h-16 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            <p>Error loading NFTs: {error}</p>
            <Button variant="outline" onClick={refetch} className="mt-4">
              Try Again
            </Button>
          </div>
        ) : nfts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No NFTs found</p>
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
                {nfts.map((nft) => (
                  <NFTItem
                    key={`${nft.contract.address}-${nft.tokenId}`}
                    nft={nft}
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
              {nfts.map((nft) => (
                <NFTItem
                  key={`${nft.contract.address}-${nft.tokenId}`}
                  nft={nft}
                  onSell={handleSell}
                  isSelling={sellingNFT === `${nft.contract.address}-${nft.tokenId}`}
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
                  <span>Approving NFT transfer...</span>
                </>
              )}
              {step === 'selling' && !isSellLoading && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Selling NFT...</span>
                </>
              )}
              {isSellSuccess && (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  <span>NFT sold successfully!</span>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
