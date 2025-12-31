import { AlertTriangle, ExternalLink, Info, Wallet } from 'lucide-react'
import { formatEther } from 'viem'
import { useBalance, useChainId } from 'wagmi'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  getBlockExplorer,
  getChainConfig,
  getHarvestAddress,
  isHarvestDeployed,
} from '@/config/chains'

export function HarvestInfo({ className }: { className?: string }) {
  const chainId = useChainId()
  const harvestAddress = getHarvestAddress(chainId)
  const { data: balance } = useBalance({
    address: harvestAddress,
  })

  const explorerUrl = getBlockExplorer(chainId)
  const contractUrl = harvestAddress
    ? `${explorerUrl}/address/${harvestAddress}`
    : explorerUrl
  const chainConfig = getChainConfig(chainId)
  const isDeployed = isHarvestDeployed(chainId)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Harvest Contract
        </CardTitle>
        <CardDescription>Sell your NFTs for 1 gwei</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!isDeployed && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="font-medium text-destructive">
                  Not deployed on {chainConfig?.chain.name}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Please switch to Ethereum or Base to use Harvest
                </p>
              </div>
            </div>
          )}

          <div>
            <p className="mb-1 text-sm text-muted-foreground">
              Contract Address
            </p>
            <a
              href={contractUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 font-mono text-sm text-primary hover:underline"
            >
              {harvestAddress?.slice(0, 6)}...{harvestAddress?.slice(-4)}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div>
            <p className="mb-1 text-sm text-muted-foreground">
              Contract Balance
            </p>
            <p className="text-lg font-semibold">
              {balance ? formatEther(balance.value) : '0'}{' '}
              {chainConfig?.chain.nativeCurrency.symbol || 'ETH'}
            </p>
          </div>

          <div>
            <p className="mb-1 text-sm text-muted-foreground">
              Current Network
            </p>
            <Badge variant={isDeployed ? 'default' : 'secondary'}>
              {chainConfig?.chain.name || 'Unknown'}
            </Badge>
          </div>

          <div>
            <p className="mb-2 text-sm text-muted-foreground">How it works</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="shrink-0">
                  1
                </Badge>
                <p>Approve the Harvest contract to transfer your NFT</p>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="shrink-0">
                  2
                </Badge>
                <p>Call the sell function</p>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="shrink-0">
                  3
                </Badge>
                <p>Receive 1 gwei in exchange for your NFT</p>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-2 rounded-lg border border-muted bg-muted/30 p-3">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>
                  <strong className="text-foreground/80">Disclaimer:</strong>{' '}
                  This tool is not tax, legal, or financial advice. Selling NFTs
                  may have tax implications. Consult a qualified professional
                  before making any decisions.
                </p>
                <p>
                  This software is provided "as is" without warranty. Use at
                  your own risk.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
