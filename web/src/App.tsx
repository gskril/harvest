import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Wheat } from 'lucide-react'
import { useAccount } from 'wagmi'

import { HarvestInfo } from '@/components/HarvestInfo'
import { NFTList } from '@/components/NFTList'

function App() {
  const { isConnected } = useAccount()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Wheat className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold">Harvest</h1>
          </div>
          <ConnectButton showBalance={false} />
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-8">
        {!isConnected ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
            <Wheat className="mb-6 h-24 w-24 text-primary" />
            <h2 className="mb-4 text-3xl font-bold">Welcome to Harvest</h2>
            <p className="mb-8 max-w-md text-muted-foreground">
              Connect your wallet to view your NFTs. Sell unwanted assets to the
              Harvest contract for 1 gwei each.
            </p>
            <ConnectButton />
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <HarvestInfo className="lg:sticky lg:top-6" />
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-2">
              <NFTList />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
