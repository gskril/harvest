import { useEffect, useRef, useState } from 'react'

import { AlertTriangle, Coins, Loader2, RefreshCw, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { parseUnits } from 'viem'
import {
  useAccount,
  useChainId,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { getOpenseaUrl, isHarvestDeployed } from '@/config/chains'
import { ERC20_ABI, HARVEST_ABI, HARVEST_ADDRESS } from '@/contracts/harvest'
import { useTokens } from '@/hooks/useTokens'
import { type AlchemyToken, formatTokenBalance } from '@/lib/alchemy'
import { cn } from '@/lib/utils'

interface TokenItemProps {
  token: AlchemyToken
  onSell: (token: AlchemyToken, amount: string) => void
  isSelling: boolean
}

function TokenItem({ token, onSell, isSelling }: TokenItemProps) {
  const [amount, setAmount] = useState('')
  const chainId = useChainId()

  const formattedBalance = formatTokenBalance(
    token.tokenBalance,
    token.decimals || 18
  )

  const tokenName = token.name || 'Unknown Token'
  const tokenSymbol = token.symbol || 'tokens'

  return (
    <div className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50">
      <div className="flex items-center gap-3">
        {token.logo ? (
          <img
            src={token.logo}
            alt={token.symbol}
            className="h-10 w-10 rounded-full"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Coins className="h-5 w-5 text-primary" />
          </div>
        )}
        <div>
          <a
            href={getOpenseaUrl(chainId, token.contractAddress)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'block font-medium',
              !tokenName.includes(' ') &&
                'max-w-[15ch] truncate sm:max-w-[20ch]'
            )}
          >
            {tokenName}
          </a>
          <p
            className={cn(
              'text-sm text-muted-foreground',
              !tokenSymbol.includes(' ') &&
                'max-w-[10ch] truncate sm:max-w-[40ch]'
            )}
          >
            {formattedBalance} {tokenSymbol}
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
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          <span className="ml-2">Sell</span>
        </Button>
      </div>
    </div>
  )
}

export function TokenList() {
  const { tokens, isLoading, error, refetch } = useTokens()
  const { address } = useAccount()
  const chainId = useChainId()
  const [sellingToken, setSellingToken] = useState<string | null>(null)
  const [step, setStep] = useState<'idle' | 'approving' | 'selling'>('idle')
  const harvestDeployed = isHarvestDeployed(chainId)
  const toastIdRef = useRef<string | null>(null)

  const {
    writeContract: writeApprove,
    data: approveHash,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract()
  const {
    writeContract: writeSell,
    data: sellHash,
    error: sellError,
    reset: resetSell,
  } = useWriteContract()

  const { isSuccess: isApproveSuccess, isError: isApproveError } =
    useWaitForTransactionReceipt({
      hash: approveHash,
    })

  const { isSuccess: isSellSuccess, isError: isSellError } =
    useWaitForTransactionReceipt({
      hash: sellHash,
    })

  // Show toast when step changes
  useEffect(() => {
    if (step === 'approving') {
      toastIdRef.current = toast.loading('Approving token transfer...')
    } else if (step === 'selling' && toastIdRef.current) {
      toast.loading('Selling token...', { id: toastIdRef.current })
    }
  }, [step])

  // Handle success
  useEffect(() => {
    if (isSellSuccess && step === 'selling') {
      if (toastIdRef.current) {
        toast.success('Token sold successfully!', { id: toastIdRef.current })
        toastIdRef.current = null
      }
      setSellingToken(null)
      setStep('idle')
      refetch()
    }
  }, [isSellSuccess, step, refetch])

  // Handle errors (including user rejections)
  useEffect(() => {
    const hasError = approveError || sellError || isApproveError || isSellError

    if (hasError && step !== 'idle') {
      const errorMessage =
        approveError?.message || sellError?.message || 'Transaction failed'
      const isUserRejection =
        errorMessage.includes('User rejected') ||
        errorMessage.includes('user rejected') ||
        errorMessage.includes('User denied')

      if (toastIdRef.current) {
        toast.error(isUserRejection ? 'Transaction cancelled' : errorMessage, {
          id: toastIdRef.current,
        })
        toastIdRef.current = null
      }

      setSellingToken(null)
      setStep('idle')
      resetApprove()
      resetSell()
    }
  }, [
    approveError,
    sellError,
    isApproveError,
    isSellError,
    step,
    resetApprove,
    resetSell,
  ])

  const handleSell = async (token: AlchemyToken, amountStr: string) => {
    if (!address || !amountStr || !harvestDeployed) return

    const decimals = token.decimals || 18
    const amount = parseUnits(amountStr, decimals)

    setSellingToken(token.contractAddress)
    setStep('approving')

    try {
      // First approve the Harvest contract to spend tokens
      writeApprove({
        address: token.contractAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [HARVEST_ADDRESS, amount],
        chainId,
      })
    } catch (err) {
      console.error('Error approving:', err)
      if (toastIdRef.current) {
        toast.error('Failed to approve token transfer', {
          id: toastIdRef.current,
        })
        toastIdRef.current = null
      }
      setSellingToken(null)
      setStep('idle')
    }
  }

  // When approval is successful, proceed to sell
  if (isApproveSuccess && step === 'approving' && sellingToken) {
    const token = tokens.find((t) => t.contractAddress === sellingToken)
    if (token) {
      setStep('selling')
      writeSell({
        address: HARVEST_ADDRESS,
        abi: HARVEST_ABI,
        functionName: 'sellErc20',
        args: [
          token.contractAddress as `0x${string}`,
          BigInt(token.tokenBalance),
        ],
        chainId,
      })
    }
  }

  if (!address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            ERC20 Tokens
          </CardTitle>
          <CardDescription>Connect your wallet to view tokens</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              ERC20 Tokens
              {tokens.length > 0 && (
                <Badge variant="secondary">{tokens.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Sell your tokens to the Harvest contract for 1 gwei each
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border p-4"
              >
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-8 text-center text-destructive">
            <p>Error loading tokens: {error}</p>
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        ) : tokens.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Coins className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>No ERC20 tokens found</p>
            <p className="mt-2 text-sm">
              Make sure you have the Alchemy API key configured
            </p>
          </div>
        ) : !harvestDeployed ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm">
                Harvest is not deployed on this chain. Switch to Ethereum or
                Base to sell.
              </p>
            </div>
            <ScrollArea className="h-96">
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
        )}
      </CardContent>
    </Card>
  )
}
