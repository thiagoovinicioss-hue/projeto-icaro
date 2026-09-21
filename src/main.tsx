import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/space-grotesk'
import '@fontsource/space-mono/400.css'
import '@fontsource/kalam/400.css'
import '@fontsource/kalam/700.css'
import { preloadMemoryFonts } from './components/three/memory/memoryTextures'

preloadMemoryFonts()
import { App } from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)