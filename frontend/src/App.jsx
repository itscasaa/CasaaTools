import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ResultPage from './pages/ResultPage'
import HistoryPage from './pages/HistoryPage'
import ScannerPage from './pages/ScannerPage'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/result/:jobId" element={<ResultPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/scanner" element={<ScannerPage />} />
      </Routes>
    </Router>
  )
}