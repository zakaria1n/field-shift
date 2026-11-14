import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'

import './i18n'
import './styles/index.css'
import App from './app/App'
import { WizardProvider } from './state/wizard'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <WizardProvider>
          <App />
        </WizardProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
