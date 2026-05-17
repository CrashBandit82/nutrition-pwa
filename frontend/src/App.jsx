import React, { useEffect } from 'react'
import Dashboard from './components/Dashboard'
import './index.css'

export default function App() {
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('✓ Service Worker registered')
        })
        .catch((err) => {
          console.log('Service Worker registration failed:', err)
        })
    }

    // Request camera permissions on load
    if ('permissions' in navigator) {
      navigator.permissions
        .query({ name: 'camera' })
        .then((result) => {
          if (result.state === 'denied') {
            console.warn('Camera permission denied')
          }
        })
        .catch((err) => console.log('Permissions API not supported'))
    }
  }, [])

  return <Dashboard />
}
