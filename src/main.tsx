import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import UI from './ui/UI.tsx'
import { Game } from './3d/Game'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UI />
  </StrictMode>,
)

const game = new Game();