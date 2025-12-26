import { useBalance, useChainId } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HARVEST_ADDRESS } from '@/contracts/harvest';
import { getBlockExplorer, isHarvestDeployed, getChainConfig } from '@/config/chains';
import { Wallet, ExternalLink, AlertTriangle } from 'lucide-react';
import { formatEther } from 'viem';

export function HarvestInfo() {
  const chainId = useChainId();
  const { data: balance } = useBalance({
    address: HARVEST_ADDRESS,
  });

  const explorerUrl = getBlockExplorer(chainId);
  const contractUrl = `${explorerUrl}/address/${HARVEST_ADDRESS}`;
  const chainConfig = getChainConfig(chainId);
  const isDeployed = isHarvestDeployed(chainId);

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
          {!isDeployed && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Not deployed on {chainConfig?.chain.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please switch to Ethereum or Base to use Harvest
                </p>
              </div>
            </div>
          )}

          <div>
            <p className="text-sm text-muted-foreground mb-1">Contract Address</p>
            <a
              href={contractUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-mono text-primary hover:underline"
            >
              {HARVEST_ADDRESS.slice(0, 6)}...{HARVEST_ADDRESS.slice(-4)}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Contract Balance</p>
            <p className="text-lg font-semibold">
              {balance ? formatEther(balance.value) : '0'} {chainConfig?.chain.nativeCurrency.symbol || 'ETH'}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Current Network</p>
            <Badge variant={isDeployed ? "default" : "secondary"}>
              {chainConfig?.chain.name || 'Unknown'}
            </Badge>
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
