import React from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'

export default function BarcodeScanner({ onScan, onError, onClose }) {
  const scannerId = 'html5-qrcode-scanner'

  React.useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      scannerId,
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        videoConstraints: {
          facingMode: { ideal: 'environment' },
        },
      },
      false
    )

    scanner.render(
      (decodedText) => {
        onScan(decodedText)
        scanner.clear()
      },
      (error) => {
        console.log('Scan error:', error)
      }
    )

    return () => {
      scanner.clear()
    }
  }, [onScan])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 safe-top bg-black">
        <h2 className="text-white text-lg font-bold">Scan Barcode</h2>
        <button
          onClick={onClose}
          className="text-white text-2xl font-bold hover:text-gray-300"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div id={scannerId} className="w-full max-w-sm" />
      </div>

      <div className="p-4 safe-bottom bg-black text-center">
        <p className="text-gray-400 text-sm">Point camera at barcode</p>
      </div>
    </div>
  )
}
