import { useEffect, useRef, useState } from 'react'

import {
  AlertTriangle,
  ImageIcon,
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
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { getOpenseaUrl, isHarvestDeployed } from '@/config/chains'
import {
  ERC721_ABI,
  ERC1155_ABI,
  HARVEST_ABI,
  HARVEST_ADDRESS,
} from '@/contracts/harvest'
import { useNFTs } from '@/hooks/useNFTs'
import { type AlchemyNFT } from '@/lib/alchemy'
import { cn } from '@/lib/utils'

interface NFTItemProps {
  nft: AlchemyNFT
  onSell: (nft: AlchemyNFT, amount?: string) => void
  isSelling: boolean
}

function NFTItem({ nft, onSell, isSelling }: NFTItemProps) {
  const [amount, setAmount] = useState('1')
  const [imgError, setImgError] = useState(false)
  const isERC1155 = nft.tokenType === 'ERC1155'
  const chainId = useChainId()
  const openseaUrl = getOpenseaUrl(chainId, nft.contract.address, nft.tokenId)

  const imageUrl =
    nft.image?.thumbnailUrl ||
    nft.image?.cachedUrl ||
    nft.image?.pngUrl ||
    nft.raw?.metadata?.image ||
    nft.contract.openSeaMetadata?.imageUrl

  const nftName = nft.name || nft.raw?.metadata?.name || `#${nft.tokenId}`

  const collectionName =
    nft.contract.name ||
    nft.contract.openSeaMetadata?.collectionName ||
    'Unknown Collection'

  return (
    <div className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50">
      <div className="flex items-center gap-3">
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
            href={openseaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'block font-medium',
              !nftName.includes(' ') && 'max-w-[20ch] truncate sm:max-w-[40ch]'
            )}
          >
            {nftName.length > 60 ? `${nftName.slice(0, 60)}…` : nftName}
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
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={isERC1155 ? 'default' : 'secondary'}>
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
    nft: AlchemyNFT
    amount?: string
  } | null>(null)
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
      resetApprove()
      resetSell()
      refetch()
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

  const handleSell = async (nft: AlchemyNFT, amount?: string) => {
    if (!address || !harvestDeployed) return

    const nftKey = `${nft.contract.address}-${nft.tokenId}`
    setSellingNFT(nftKey)
    setPendingSell({ nft, amount })

    try {
      // Check if already approved
      let isApproved = false

      if (nft.tokenType === 'ERC721') {
        // Check getApproved for this specific token
        const approved = await readContract(config, {
          address: nft.contract.address as `0x${string}`,
          abi: ERC721_ABI,
          functionName: 'getApproved',
          args: [BigInt(nft.tokenId)],
          chainId,
        })
        if (approved === HARVEST_ADDRESS) {
          isApproved = true
        } else {
          // Also check isApprovedForAll
          const approvedForAll = await readContract(config, {
            address: nft.contract.address as `0x${string}`,
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
          address: nft.contract.address as `0x${string}`,
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
            args: [nft.contract.address as `0x${string}`, BigInt(nft.tokenId)],
            chainId,
          })
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
          })
        }
      } else {
        // Need to approve first
        setStep('approving')

        if (nft.tokenType === 'ERC721') {
          writeApprove({
            address: nft.contract.address as `0x${string}`,
            abi: ERC721_ABI,
            functionName: 'approve',
            args: [HARVEST_ADDRESS, BigInt(nft.tokenId)],
            chainId,
          })
        } else {
          writeApprove({
            address: nft.contract.address as `0x${string}`,
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
  if (isApproveSuccess && step === 'approving' && pendingSell) {
    const { nft, amount } = pendingSell
    setStep('selling')

    if (nft.tokenType === 'ERC721') {
      writeSell({
        address: HARVEST_ADDRESS,
        abi: HARVEST_ABI,
        functionName: 'sellErc721',
        args: [nft.contract.address as `0x${string}`, BigInt(nft.tokenId)],
        chainId,
      })
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
      })
    }
  }

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              NFTs
              {totalCount > 0 && (
                <Badge variant="secondary">{totalCount}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Sell your NFTs to the Harvest contract for 1 gwei each
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
          <div className="space-y-3">
            {nfts.map((nft) => (
              <NFTItem
                key={`${nft.contract.address}-${nft.tokenId}`}
                nft={nft}
                onSell={handleSell}
                isSelling={
                  sellingNFT === `${nft.contract.address}-${nft.tokenId}`
                }
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
