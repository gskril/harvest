import { useBalance, useChainId } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HARVEST_ADDRESS } from '@/contracts/harvest';
import { Wallet, ExternalLink } from 'lucide-react';
import { formatEther } from 'viem';

const BLOCK_EXPLORERS: Record<number, string> = {
  1: 'https://etherscan.io',
  11155111: 'https://sepolia.etherscan.io',
  137: 'https://polygonscan.com',
  42161: 'https://arbiscan.io',
  10: 'https://optimistic.etherscan.io',
  8453: 'https://basescan.org',
};

export function HarvestInfo() {
  const chainId = useChainId();
  const { data: balance } = useBalance({
    address: HARVEST_ADDRESS,
  });

  const explorerUrl = BLOCK_EXPLORERS[chainId] || BLOCK_EXPLORERS[1];
  const contractUrl = `${explorerUrl}/address/${HARVEST_ADDRESS}`;

  const isValidAddress = HARVEST_ADDRESS !== '0x0000000000000000000000000000000000000000';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Harvest Contract
        </CardTitle>
        <CardDescription>
          Sell your tokens and NFTs for 1 gwei each
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Contract Address</p>
            {isValidAddress ? (
              <a
                href={contractUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-mono text-primary hover:underline"
              >
                {HARVEST_ADDRESS.slice(0, 6)}...{HARVEST_ADDRESS.slice(-4)}
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <p className="text-sm text-destructive">
                Not configured - Set VITE_HARVEST_ADDRESS in .env
              </p>
            )}
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Contract Balance</p>
            <p className="text-lg font-semibold">
              {balance ? formatEther(balance.value) : '0'} ETH
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">How it works</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="shrink-0">1</Badge>
                <p>Approve the Harvest contract to transfer your token</p>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="shrink-0">2</Badge>
                <p>Call the sell function (ERC20, ERC721, or ERC1155)</p>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="shrink-0">3</Badge>
                <p>Receive 1 gwei for your token (contract must have ETH)</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
