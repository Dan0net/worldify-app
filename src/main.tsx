import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import UI from './ui/UI.tsx'
import Game from './3d/Game.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Game />
    <UI />
  </StrictMode>,
)
