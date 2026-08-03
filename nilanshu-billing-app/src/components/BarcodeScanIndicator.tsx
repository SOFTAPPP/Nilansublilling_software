import React, { useState, useEffect, useCallback } from 'react';
import { ScanBarcode, Check, X } from 'lucide-react';

interface BarcodeScanIndicatorProps {
  /** Whether the scanner listener is active */
  active?: boolean;
}

type ScanStatus = 'idle' | 'success' | 'error';

/**
 * A floating indicator showing barcode scanner status.
 * Listens for custom events dispatched by the BillEngine on scan results.
 */
export const BarcodeScanIndicator: React.FC<BarcodeScanIndicatorProps> = ({ active = true }) => {
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [lastScannedCode, setLastScannedCode] = useState('');
  const [productName, setProductName] = useState('');

  const handleScanResult = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail;
    setLastScannedCode(detail.barcode || '');
    setProductName(detail.productName || '');
    setScanStatus(detail.found ? 'success' : 'error');
    
    // Reset after 2.5 seconds
    setTimeout(() => {
      setScanStatus('idle');
      setLastScannedCode('');
      setProductName('');
    }, 2500);
  }, []);

  useEffect(() => {
    window.addEventListener('barcode-scan-result', handleScanResult);
    return () => window.removeEventListener('barcode-scan-result', handleScanResult);
  }, [handleScanResult]);

  if (!active) return null;

  const statusColors = {
    idle: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
    error: 'bg-red-50 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
  };

  const statusIcons = {
    idle: <ScanBarcode size={16} className="animate-pulse" />,
    success: <Check size={16} />,
    error: <X size={16} />,
  };

  return (
    <div 
      className={`no-print inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-300 ${statusColors[scanStatus]}`}
    >
      {statusIcons[scanStatus]}
      {scanStatus === 'idle' && <span>Scanner Ready</span>}
      {scanStatus === 'success' && <span>✓ {productName || lastScannedCode}</span>}
      {scanStatus === 'error' && <span>✗ Not Found: {lastScannedCode}</span>}
    </div>
  );
};

export default BarcodeScanIndicator;
