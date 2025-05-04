import { lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router'
import { UpProvider } from './contexts/UpProvider.jsx'
import './index.scss'
import './styles/global.scss'


const Home = lazy(() => import('./routes/Home.jsx'));
const Admin = lazy(() => import('./routes/Admin.jsx'));
const Deposit = lazy(() => import('./routes/Deposit.jsx'));

const root = document.getElementById('root')

createRoot(root).render(
  <BrowserRouter>
    <Routes>
      <Route index element={<UpProvider><Home /></UpProvider>} />
      <Route path="admin" element={<Admin />} />
      <Route path="deposit" element={<UpProvider><Deposit /></UpProvider>} />
    </Routes>
  </BrowserRouter>
)
