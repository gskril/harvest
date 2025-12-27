import React from 'react'

import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import { WagmiProvider } from 'wagmi'

import App from './App'
import './index.css'
import { config } from './wagmi'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#7c3aed',
            accentColorForeground: 'white',
            borderRadius: 'medium',
          })}
        >
          <App />
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 5000,
              style: {
                background: '#1e1e2e',
                color: '#cdd6f4',
                border: '1px solid #313244',
              },
              success: {
                iconTheme: {
                  primary: '#a6e3a1',
                  secondary: '#1e1e2e',
                },
              },
              error: {
                iconTheme: {
                  primary: '#f38ba8',
                  secondary: '#1e1e2e',
                },
              },
            }}
          />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
)
