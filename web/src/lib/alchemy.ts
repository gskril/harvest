// Alchemy RPC URL helper for wagmi transports

const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY || ''

// Map chain IDs to Alchemy network names
const ALCHEMY_NETWORKS: Record<number, string> = {
  1: 'eth-mainnet',
  8453: 'base-mainnet',
}

export const getAlchemyBaseUrl = (chainId: number): string => {
  const network = ALCHEMY_NETWORKS[chainId] || 'eth-mainnet'
  return `https://${network}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
}

interface TransactionValue {
  txHash: string
  value: string | null // Value in wei, null if error
}

/**
 * Batch fetch transaction values for multiple tx hashes.
 * Returns the ETH value sent in each transaction.
 */
export async function batchGetTransactionValues(
  txHashes: string[],
  chainId: number
): Promise<TransactionValue[]> {
  if (txHashes.length === 0) {
    return []
  }

  const rpcUrl = getAlchemyBaseUrl(chainId)

  try {
    // Build batch JSON-RPC request
    const batchRequest = txHashes.map((hash, index) => ({
      jsonrpc: '2.0',
      method: 'eth_getTransactionByHash',
      params: [hash],
      id: index,
    }))

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batchRequest),
    })

    const batchResponse = await response.json()

    // Handle both array response (batch) and single response
    const responses = Array.isArray(batchResponse)
      ? batchResponse
      : [batchResponse]

    // Map results by id to preserve order
    const resultsById = new Map<number, string | null>()
    for (const item of responses) {
      if (item.error || !item.result) {
        resultsById.set(item.id, null)
      } else {
        // value is in hex wei
        resultsById.set(item.id, item.result.value || '0x0')
      }
    }

    return txHashes.map((txHash, index) => ({
      txHash,
      value: resultsById.get(index) ?? null,
    }))
  } catch (error) {
    console.error('Error fetching transaction values:', error)
    return txHashes.map((txHash) => ({ txHash, value: null }))
  }
}

/**
 * Convert hex wei value to ETH string with 4 decimal places.
 * Returns null if value is 0 or invalid.
 */
export function weiToEth(hexValue: string | null): string | null {
  if (!hexValue || hexValue === '0x0' || hexValue === '0x') {
    return null
  }

  try {
    const wei = BigInt(hexValue)
    if (wei === 0n) return null

    // Convert to ETH (divide by 10^18)
    const ethValue = Number(wei) / 1e18
    return ethValue.toFixed(4)
  } catch {
    return null
  }
}
