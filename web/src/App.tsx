import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Coins, ImageIcon, Wheat } from 'lucide-react'
import { useAccount } from 'wagmi'

import { HarvestInfo } from '@/components/HarvestInfo'
import { NFTList } from '@/components/NFTList'
import { TokenList } from '@/components/TokenList'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
          <ConnectButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-8">
        {!isConnected ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
            <Wheat className="mb-6 h-24 w-24 text-primary" />
            <h2 className="mb-4 text-3xl font-bold">Welcome to Harvest</h2>
            <p className="mb-8 max-w-md text-muted-foreground">
              Connect your wallet to view your tokens and NFTs. Sell unwanted
              assets to the Harvest contract for 1 gwei each.
            </p>
            <ConnectButton />
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <HarvestInfo />
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="tokens" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger
                    value="tokens"
                    className="flex items-center gap-2"
                  >
                    <Coins className="h-4 w-4" />
                    Tokens
                  </TabsTrigger>
                  <TabsTrigger value="nfts" className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    NFTs
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="tokens" className="mt-4">
                  <TokenList />
                </TabsContent>
                <TabsContent value="nfts" className="mt-4">
                  <NFTList />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t">
        <div className="container flex h-16 items-center justify-center px-4">
          <p className="text-sm text-muted-foreground">
            Harvest - Sell your tokens for 1 gwei each
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
