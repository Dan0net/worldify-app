import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import UI from './ui/UI.tsx'
import { Worldify } from './3d/Worldify.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UI />
  </StrictMode>,
)

new Worldify();