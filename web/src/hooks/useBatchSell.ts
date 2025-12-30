import { useCallback, useEffect, useMemo, useState } from 'react'

import { encodeFunctionData } from 'viem'
import {
  useAccount,
  useCapabilities,
  useChainId,
  useConfig,
  useSendCalls,
  useWaitForCallsStatus,
} from 'wagmi'
import { readContract } from 'wagmi/actions'

import {
  ERC721_ABI,
  ERC1155_ABI,
  HARVEST_ABI,
  HARVEST_ADDRESS,
} from '@/contracts/harvest'
import type { NFTWithAcquisition } from '@/lib/opensea'

export type BatchSellStatus =
  | 'idle'
  | 'preparing'
  | 'pending'
  | 'confirming'
  | 'success'
  | 'error'

interface Call {
  to: `0x${string}`
  data: `0x${string}`
}

interface UseBatchSellReturn {
  /** Whether the wallet supports batch calls (EIP-5792) */
  supportsBatchCalls: boolean
  /** Whether we're still checking wallet capabilities */
  isCheckingCapabilities: boolean
  /** Current status of the batch operation */
  status: BatchSellStatus
  /** Error message if status is 'error' */
  error: string | null
  /** Number of NFTs being processed */
  processingCount: number
  /** Execute batch sell for the given NFTs */
  executeBatchSell: (nfts: NFTWithAcquisition[]) => Promise<void>
  /** Reset the hook state */
  reset: () => void
}

export function useBatchSell(): UseBatchSellReturn {
  const { address } = useAccount()
  const chainId = useChainId()
  const config = useConfig()

  const [status, setStatus] = useState<BatchSellStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [processingCount, setProcessingCount] = useState(0)
  const [batchId, setBatchId] = useState<string | null>(null)

  // Check wallet capabilities for EIP-5792 support (wallet_getCapabilities)
  const {
    data: capabilities,
    isLoading: isCheckingCapabilities,
    error: capabilitiesError,
  } = useCapabilities()

  // Determine if wallet supports batch calls on the current chain
  const supportsBatchCalls = useMemo(() => {
    // If there was an error fetching capabilities, wallet doesn't support EIP-5792
    if (capabilitiesError) return false
    if (!capabilities) return false

    // Check if the current chain has any capabilities (indicates EIP-5792 support)
    const chainCapabilities = capabilities[chainId]
    if (!chainCapabilities) return false

    // Wallet returned capabilities for this chain, so it supports sendCalls
    return true
  }, [capabilities, chainId, capabilitiesError])

  // useSendCalls for batching transactions
  const {
    sendCalls,
    data: sendCallsData,
    error: sendCallsError,
    reset: resetSendCalls,
  } = useSendCalls()

  // Wait for calls to be confirmed (handles polling automatically)
  const { data: callsStatusData, isSuccess: isCallsConfirmed } =
    useWaitForCallsStatus({
      id: batchId as string,
      query: {
        enabled: !!batchId,
      },
    })

  // Update batch ID when sendCalls succeeds
  useEffect(() => {
    if (sendCallsData) {
      setBatchId(sendCallsData.id)
      setStatus('confirming')
    }
  }, [sendCallsData])

  // Handle calls confirmation
  useEffect(() => {
    if (isCallsConfirmed && callsStatusData) {
      setStatus('success')
      setBatchId(null)
    }
  }, [isCallsConfirmed, callsStatusData])

  // Handle sendCalls errors
  useEffect(() => {
    if (sendCallsError) {
      const message = sendCallsError.message || 'Batch transaction failed'
      const isUserRejection =
        message.includes('User rejected') ||
        message.includes('user rejected') ||
        message.includes('User denied')
      const isUnsupportedWallet =
        message.includes('An unknown RPC error occurred') ||
        message.includes('Method not supported') ||
        message.includes('method not found')

      if (isUserRejection) {
        setError('Transaction cancelled')
      } else if (isUnsupportedWallet) {
        setError(
          'Your wallet does not support batch transactions (EIP-5792/ERC-7702)'
        )
      } else {
        setError(message)
      }
      setStatus('error')
    }
  }, [sendCallsError])

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
    setProcessingCount(0)
    setBatchId(null)
    resetSendCalls()
  }, [resetSendCalls])

  const executeBatchSell = useCallback(
    async (nfts: NFTWithAcquisition[]) => {
      if (!address || nfts.length === 0) return

      setStatus('preparing')
      setError(null)
      setProcessingCount(nfts.length)

      try {
        const calls: Call[] = []

        // Process each NFT: check approval and build calls
        for (const nft of nfts) {
          const contractAddress = nft.contract as `0x${string}`
          const tokenId = BigInt(nft.identifier)

          if (nft.tokenType === 'ERC721') {
            // Check if already approved
            let isApproved = false

            try {
              const approved = await readContract(config, {
                address: contractAddress,
                abi: ERC721_ABI,
                functionName: 'getApproved',
                args: [tokenId],
                chainId,
              })

              if (approved === HARVEST_ADDRESS) {
                isApproved = true
              } else {
                const approvedForAll = await readContract(config, {
                  address: contractAddress,
                  abi: ERC721_ABI,
                  functionName: 'isApprovedForAll',
                  args: [address, HARVEST_ADDRESS],
                  chainId,
                })
                isApproved = approvedForAll
              }
            } catch {
              // If check fails, assume not approved
              isApproved = false
            }

            // Add approval call if needed
            if (!isApproved) {
              const approveData = encodeFunctionData({
                abi: ERC721_ABI,
                functionName: 'approve',
                args: [HARVEST_ADDRESS, tokenId],
              })
              calls.push({ to: contractAddress, data: approveData })
            }

            // Add sell call
            const sellData = encodeFunctionData({
              abi: HARVEST_ABI,
              functionName: 'sellErc721',
              args: [contractAddress, tokenId],
            })
            calls.push({ to: HARVEST_ADDRESS, data: sellData })
          } else {
            // ERC1155
            let isApproved = false

            try {
              const approvedForAll = await readContract(config, {
                address: contractAddress,
                abi: ERC1155_ABI,
                functionName: 'isApprovedForAll',
                args: [address, HARVEST_ADDRESS],
                chainId,
              })
              isApproved = approvedForAll
            } catch {
              isApproved = false
            }

            // Add approval call if needed
            if (!isApproved) {
              const approveData = encodeFunctionData({
                abi: ERC1155_ABI,
                functionName: 'setApprovalForAll',
                args: [HARVEST_ADDRESS, true],
              })
              calls.push({ to: contractAddress, data: approveData })
            }

            // Add sell call (amount defaults to 1 for batch)
            const sellData = encodeFunctionData({
              abi: HARVEST_ABI,
              functionName: 'sellErc1155',
              args: [contractAddress, tokenId, BigInt(1)],
            })
            calls.push({ to: HARVEST_ADDRESS, data: sellData })
          }
        }

        if (calls.length === 0) {
          setError('No calls to execute')
          setStatus('error')
          return
        }

        setStatus('pending')

        // Execute the batch
        sendCalls({ calls })
      } catch (err) {
        console.error('Batch sell error:', err)
        setError(err instanceof Error ? err.message : 'Failed to prepare batch')
        setStatus('error')
      }
    },
    [address, chainId, config, sendCalls]
  )

  return {
    supportsBatchCalls,
    isCheckingCapabilities,
    status,
    error,
    processingCount,
    executeBatchSell,
    reset,
  }
}
