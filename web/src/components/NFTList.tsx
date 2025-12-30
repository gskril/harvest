import { useEffect, useRef, useState } from 'react'

import {
  AlertTriangle,
  ImageIcon,
  Info,
  Loader2,
  RefreshCw,
  Send,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  useAccount,
  useChainId,
  useConfig,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'
import { readContract } from 'wagmi/actions'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getBlockExplorer, isHarvestDeployed } from '@/config/chains'
import {
  ERC721_ABI,
  ERC1155_ABI,
  HARVEST_ABI,
  HARVEST_ADDRESS,
} from '@/contracts/harvest'
import { useBatchSell } from '@/hooks/useBatchSell'
import { useNFTs } from '@/hooks/useNFTs'
import { type NFTWithAcquisition } from '@/lib/opensea'
import { cn } from '@/lib/utils'

interface NFTItemProps {
  nft: NFTWithAcquisition
  onSell: (nft: NFTWithAcquisition, amount?: string) => void
  isSelling: boolean
  chainId: number
  selectionMode?: boolean
  isSelected?: boolean
  onToggleSelect?: (nftKey: string) => void
  isBatchProcessing?: boolean
}

function formatAcquisitionDate(date: Date | null): string {
  if (!date) return 'Unknown'
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getAcquisitionLabel(nft: NFTWithAcquisition): string {
  switch (nft.acquisitionType) {
    case 'purchase':
      return `Bought for ${nft.acquisitionPrice} ${nft.acquisitionSymbol}`
    case 'mint':
      if (nft.acquisitionPrice && nft.acquisitionSymbol) {
        return `Minted for ${nft.acquisitionPrice} ${nft.acquisitionSymbol}`
      }
      return 'Minted'
    case 'transfer':
      return 'Received'
    default:
      return 'Unknown'
  }
}

function NFTItem({
  nft,
  onSell,
  isSelling,
  chainId,
  selectionMode,
  isSelected,
  onToggleSelect,
  isBatchProcessing,
}: NFTItemProps) {
  const [amount, setAmount] = useState('1')
  const [imgError, setImgError] = useState(false)
  const isERC1155 = nft.tokenType === 'ERC1155'

  const imageUrl = nft.display_image_url || nft.image_url

  const nftName = nft.name || `#${nft.identifier}`

  const collectionName = nft.collection || 'Unknown Collection'

  const txUrl = nft.acquisitionTxHash
    ? `${getBlockExplorer(chainId)}/tx/${nft.acquisitionTxHash}`
    : null

  const nftKey = `${nft.contract}-${nft.identifier}`

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50',
        isSelected && 'border-primary bg-primary/5'
      )}
    >
      <div className="flex items-center gap-3">
        {selectionMode && (
          <Checkbox
            checked={isSelected}
            onChange={() => onToggleSelect?.(nftKey)}
            disabled={isBatchProcessing}
            aria-label={`Select ${nftName}`}
          />
        )}
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={nftName}
            className="h-16 w-16 rounded-lg bg-primary/10 object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
            <ImageIcon className="h-8 w-8 text-primary" />
          </div>
        )}
        <div>
          <a
            href={nft.opensea_url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'block font-medium',
              !nftName.includes(' ') && 'max-w-[20ch] truncate sm:max-w-[40ch]'
            )}
          >
            {nftName.length > 60 ? `${nftName.slice(0, 60)}...` : nftName}
          </a>
          <p
            className={cn(
              'text-sm text-muted-foreground',
              !collectionName.includes(' ') &&
                'max-w-[20ch] truncate sm:max-w-[40ch]'
            )}
          >
            {collectionName}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant={isERC1155 ? 'default' : 'secondary'}>
              {nft.tokenType}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                nft.acquisitionType === 'purchase' &&
                  'border-green-500/50 text-green-600',
                nft.acquisitionType === 'mint' &&
                  'border-blue-500/50 text-blue-600',
                nft.acquisitionType === 'transfer' &&
                  'border-purple-500/50 text-purple-600'
              )}
            >
              {getAcquisitionLabel(nft)}
            </Badge>
            {nft.acquisitionDate &&
              (txUrl ? (
                <a
                  href={txUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary hover:underline"
                >
                  {formatAcquisitionDate(nft.acquisitionDate)}
                </a>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {formatAcquisitionDate(nft.acquisitionDate)}
                </span>
              ))}
          </div>
        </div>
      </div>
      {!selectionMode && (
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
            disabled={
              isSelling || (isERC1155 && (!amount || parseInt(amount) < 1))
            }
          >
            {isSelling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="ml-2">Sell</span>
          </Button>
        </div>
      )}
    </div>
  )
}

export function NFTList() {
  const { nfts, isLoading, error, totalCount, refetch } = useNFTs()
  const { address } = useAccount()
  const chainId = useChainId()
  const config = useConfig()
  const [sellingNFT, setSellingNFT] = useState<string | null>(null)
  const [step, setStep] = useState<'idle' | 'approving' | 'selling'>('idle')
  const [pendingSell, setPendingSell] = useState<{
    nft: NFTWithAcquisition
    amount?: string
  } | null>(null)
  const harvestDeployed = isHarvestDeployed(chainId)
  const toastIdRef = useRef<string | null>(null)

  // Batch selection state
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedNFTs, setSelectedNFTs] = useState<Set<string>>(new Set())
  const batchToastIdRef = useRef<string | null>(null)

  // Batch sell hook
  const {
    status: batchStatus,
    error: batchError,
    processingCount,
    executeBatchSell,
    reset: resetBatchSell,
  } = useBatchSell()

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
      toastIdRef.current = toast.loading('Approving NFT transfer...')
    } else if (step === 'selling' && toastIdRef.current) {
      toast.loading('Selling NFT...', { id: toastIdRef.current })
    }
  }, [step])

  // Handle success
  useEffect(() => {
    if (isSellSuccess && step === 'selling') {
      if (toastIdRef.current) {
        toast.success('NFT sold successfully!', { id: toastIdRef.current })
        toastIdRef.current = null
      }
      setSellingNFT(null)
      setStep('idle')
      setPendingSell(null)
      refetch()
      resetApprove()
      resetSell()
    }
  }, [isSellSuccess, step, refetch, resetApprove, resetSell])

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

      setSellingNFT(null)
      setStep('idle')
      setPendingSell(null)
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

  // Batch sell status effect
  useEffect(() => {
    if (
      (batchStatus === 'preparing' || batchStatus === 'pending') &&
      !batchToastIdRef.current
    ) {
      batchToastIdRef.current = toast.loading(
        `Processing ${processingCount} NFT${processingCount > 1 ? 's' : ''}...`
      )
    } else if (batchStatus === 'confirming' && batchToastIdRef.current) {
      toast.loading('Confirming batch transaction...', {
        id: batchToastIdRef.current,
      })
    } else if (batchStatus === 'success') {
      const count = processingCount // Capture before reset
      if (batchToastIdRef.current) {
        toast.success(
          `Successfully sold ${count} NFT${count > 1 ? 's' : ''}!`,
          { id: batchToastIdRef.current }
        )
        batchToastIdRef.current = null
      }
      setSelectedNFTs(new Set())
      setSelectionMode(false)
      refetch()
      resetBatchSell()
    } else if (batchStatus === 'error') {
      if (batchToastIdRef.current) {
        toast.error(batchError || 'Batch transaction failed', {
          id: batchToastIdRef.current,
        })
        batchToastIdRef.current = null
      }
      resetBatchSell()
    }
  }, [batchStatus, batchError, processingCount, refetch, resetBatchSell])

  // Selection helpers
  const toggleNFTSelection = (nftKey: string) => {
    setSelectedNFTs((prev) => {
      const next = new Set(prev)
      if (next.has(nftKey)) {
        next.delete(nftKey)
      } else {
        next.add(nftKey)
      }
      return next
    })
  }

  const exitSelectionMode = () => {
    setSelectionMode(false)
    setSelectedNFTs(new Set())
    resetBatchSell()
  }

  const handleBatchSell = () => {
    const selectedNftList = nfts.filter((nft) =>
      selectedNFTs.has(`${nft.contract}-${nft.identifier}`)
    )
    if (selectedNftList.length > 0) {
      executeBatchSell(selectedNftList)
    }
  }

  const isBatchProcessing =
    batchStatus === 'preparing' ||
    batchStatus === 'pending' ||
    batchStatus === 'confirming'

  const handleSell = async (nft: NFTWithAcquisition, amount?: string) => {
    if (!address || !harvestDeployed) return

    const nftKey = `${nft.contract}-${nft.identifier}`
    setSellingNFT(nftKey)
    setPendingSell({ nft, amount })

    try {
      // Check if already approved
      let isApproved = false

      if (nft.tokenType === 'ERC721') {
        // Check getApproved for this specific token
        const approved = await readContract(config, {
          address: nft.contract as `0x${string}`,
          abi: ERC721_ABI,
          functionName: 'getApproved',
          args: [BigInt(nft.identifier)],
          chainId,
        })
        if (approved === HARVEST_ADDRESS) {
          isApproved = true
        } else {
          // Also check isApprovedForAll
          const approvedForAll = await readContract(config, {
            address: nft.contract as `0x${string}`,
            abi: ERC721_ABI,
            functionName: 'isApprovedForAll',
            args: [address, HARVEST_ADDRESS],
            chainId,
          })
          isApproved = approvedForAll
        }
      } else {
        // For ERC1155, check isApprovedForAll
        const approvedForAll = await readContract(config, {
          address: nft.contract as `0x${string}`,
          abi: ERC1155_ABI,
          functionName: 'isApprovedForAll',
          args: [address, HARVEST_ADDRESS],
          chainId,
        })
        isApproved = approvedForAll
      }

      if (isApproved) {
        // Skip approval, go directly to selling
        setStep('selling')
        toastIdRef.current = toast.loading('Selling NFT...')

        if (nft.tokenType === 'ERC721') {
          writeSell({
            address: HARVEST_ADDRESS,
            abi: HARVEST_ABI,
            functionName: 'sellErc721',
            args: [nft.contract as `0x${string}`, BigInt(nft.identifier)],
            chainId,
          })
        } else {
          writeSell({
            address: HARVEST_ADDRESS,
            abi: HARVEST_ABI,
            functionName: 'sellErc1155',
            args: [
              nft.contract as `0x${string}`,
              BigInt(nft.identifier),
              BigInt(amount || '1'),
            ],
            chainId,
          })
        }
      } else {
        // Need to approve first
        setStep('approving')

        if (nft.tokenType === 'ERC721') {
          writeApprove({
            address: nft.contract as `0x${string}`,
            abi: ERC721_ABI,
            functionName: 'approve',
            args: [HARVEST_ADDRESS, BigInt(nft.identifier)],
            chainId,
          })
        } else {
          writeApprove({
            address: nft.contract as `0x${string}`,
            abi: ERC1155_ABI,
            functionName: 'setApprovalForAll',
            args: [HARVEST_ADDRESS, true],
            chainId,
          })
        }
      }
    } catch (err) {
      console.error('Error:', err)
      if (toastIdRef.current) {
        toast.error('Failed to process NFT sale', {
          id: toastIdRef.current,
        })
        toastIdRef.current = null
      }
      setSellingNFT(null)
      setStep('idle')
      setPendingSell(null)
    }
  }

  // When approval is successful, proceed to sell
  useEffect(() => {
    if (isApproveSuccess && step === 'approving' && pendingSell) {
      const { nft, amount } = pendingSell
      setStep('selling')

      if (nft.tokenType === 'ERC721') {
        writeSell({
          address: HARVEST_ADDRESS,
          abi: HARVEST_ABI,
          functionName: 'sellErc721',
          args: [nft.contract as `0x${string}`, BigInt(nft.identifier)],
          chainId,
        })
      } else {
        writeSell({
          address: HARVEST_ADDRESS,
          abi: HARVEST_ABI,
          functionName: 'sellErc1155',
          args: [
            nft.contract as `0x${string}`,
            BigInt(nft.identifier),
            BigInt(amount || '1'),
          ],
          chainId,
        })
      }
    }
  }, [isApproveSuccess, step, pendingSell, chainId, writeSell])

  if (!address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            NFTs
          </CardTitle>
          <CardDescription>Connect your wallet to view NFTs</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                NFTs
                {totalCount > 0 && (
                  <Badge variant="secondary">{totalCount}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Sell your NFTs to the Harvest contract for 1 gwei each. Sorted
                by acquisition type, then date.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {harvestDeployed && nfts.length > 0 && !selectionMode && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => setSelectionMode(true)}
                      disabled={isLoading}
                    >
                      Batch Select
                      <Info className="ml-1 h-3 w-3 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p>
                      Select multiple NFTs to sell them in a single transaction.
                      Requires a wallet that supports EIP-5792 (smart accounts
                      or ERC-7702 delegated accounts).
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
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
          </div>
          {selectionMode && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
              <span className="text-sm text-muted-foreground">
                {selectedNFTs.size === 0
                  ? 'Select NFTs to batch sell'
                  : `${selectedNFTs.size} selected`}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exitSelectionMode}
                  disabled={isBatchProcessing}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleBatchSell}
                  disabled={selectedNFTs.size === 0 || isBatchProcessing}
                >
                  {isBatchProcessing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Sell {selectedNFTs.size > 0 ? `(${selectedNFTs.size})` : ''}
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border p-4"
                >
                  <Skeleton className="h-16 w-16 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">
              <p>Error loading NFTs: {error}</p>
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          ) : nfts.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <ImageIcon className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>No NFTs found</p>
              <p className="mt-2 text-sm">
                Make sure you have the OpenSea API key configured
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
                  {nfts.map((nft) => (
                    <NFTItem
                      key={`${nft.contract}-${nft.identifier}`}
                      nft={nft}
                      onSell={() => {}}
                      isSelling={false}
                      chainId={chainId}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="space-y-3">
              {nfts.map((nft) => {
                const nftKey = `${nft.contract}-${nft.identifier}`
                return (
                  <NFTItem
                    key={nftKey}
                    nft={nft}
                    onSell={handleSell}
                    isSelling={sellingNFT === nftKey}
                    chainId={chainId}
                    selectionMode={selectionMode}
                    isSelected={selectedNFTs.has(nftKey)}
                    onToggleSelect={toggleNFTSelection}
                    isBatchProcessing={isBatchProcessing}
                  />
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
