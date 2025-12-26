import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TokenList } from '@/components/TokenList';
import { NFTList } from '@/components/NFTList';
import { HarvestInfo } from '@/components/HarvestInfo';
import { Coins, ImageIcon, Wheat } from 'lucide-react';

function App() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Wheat className="w-8 h-8 text-primary" />
            <h1 className="text-xl font-bold">Harvest</h1>
          </div>
          <ConnectButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-8">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <Wheat className="w-24 h-24 text-primary mb-6" />
            <h2 className="text-3xl font-bold mb-4">Welcome to Harvest</h2>
            <p className="text-muted-foreground mb-8 max-w-md">
              Connect your wallet to view your tokens and NFTs. Sell unwanted assets to the Harvest contract for 1 gwei each.
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
                  <TabsTrigger value="tokens" className="flex items-center gap-2">
                    <Coins className="w-4 h-4" />
                    Tokens
                  </TabsTrigger>
                  <TabsTrigger value="nfts" className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
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
      <footer className="border-t mt-auto">
        <div className="container flex h-16 items-center justify-center px-4">
          <p className="text-sm text-muted-foreground">
            Harvest DApp - Sell your tokens for 1 gwei each
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
