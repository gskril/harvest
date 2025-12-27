import { AlertTriangle, ExternalLink, Wallet } from 'lucide-react'
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
  isHarvestDeployed,
} from '@/config/chains'
import { HARVEST_ADDRESS } from '@/contracts/harvest'

export function HarvestInfo({ className }: { className?: string }) {
  const chainId = useChainId()
  const { data: balance } = useBalance({
    address: HARVEST_ADDRESS,
  })

  const explorerUrl = getBlockExplorer(chainId)
  const contractUrl = `${explorerUrl}/address/${HARVEST_ADDRESS}`
  const chainConfig = getChainConfig(chainId)
  const isDeployed = isHarvestDeployed(chainId)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Harvest Contract
        </CardTitle>
        <CardDescription>Sell your tokens for 1 gwei</CardDescription>
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
              {HARVEST_ADDRESS.slice(0, 6)}...{HARVEST_ADDRESS.slice(-4)}
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
                <p>Approve the Harvest contract to transfer your token</p>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="shrink-0">
                  2
                </Badge>
                <p>Call the sell function (ERC20, ERC721, or ERC1155)</p>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="shrink-0">
                  3
                </Badge>
                <p>Receive 1 gwei for your token (contract must have ETH)</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
