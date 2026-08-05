import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { Layout } from './components/ui/Layout';
import { useStore } from './store/useStore';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';

import CashBill from './pages/CashBill';
import CreditBill from './pages/CreditBill';
import PartyStatement from './pages/PartyStatement';
import Dashboard from './pages/Dashboard';
import StockManagement from './pages/StockManagement';
import CustomerManagement from './pages/CustomerManagement';
import TransporterManagement from './pages/TransporterManagement';
import QuickBill from './pages/QuickBill';
import ReturnBill from './pages/ReturnBill';
import TransportBill from './pages/TransportBill';
import BillHistory from './pages/BillHistory';
import ReceiptCopy from './pages/ReceiptCopy';
import Voucher from './pages/Voucher';
import { Titlebar } from './components/ui/Titlebar';
import GlobalDialog from './components/GlobalDialog';
import { NetworkStatus } from './components/ui/NetworkStatus';
import { useLiveSync } from './hooks/useLiveSync';

import { getDb } from './utils/api';

function App() {
  const { fetchProducts, fetchParties, fetchSettings, fetchBills, fetchTransporters, token } = useStore();

  // Activate live sync — polls the DB every 5s so all instances stay in sync
  useLiveSync();

  // Warm up DB connection immediately on app start
  useEffect(() => {
    getDb().catch(console.error);
  }, []);

  useEffect(() => {
    const isToken = sessionStorage.getItem('token');
    const loadInitialData = async () => {
      if (isToken) {
        await fetchProducts();
        await fetchParties();
        await fetchSettings();
        await fetchBills();
        await fetchTransporters();
      }
    };
    loadInitialData();

    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        try {
          const appWindow = getCurrentWindow();
          const isFullscreen = await appWindow.isFullscreen();
          await appWindow.setFullscreen(!isFullscreen);
        } catch (err) {
          console.error("Failed to toggle fullscreen:", err);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Auto Updater Logic
    const checkForUpdates = async () => {
      try {
        const update = await check();
        if (update) {
          useStore.getState().showDialog({
            title: 'Update Available!',
            message: `Version ${update.version} is available. Do you want to download and install it now?`,
            type: 'confirm',
            onConfirm: async () => {
              useStore.getState().showDialog({
                title: 'Downloading Update...',
                message: 'Please wait while the update is downloading. The software will automatically restart when finished.',
                type: 'alert'
              });
              let downloaded = 0;
              let contentLength = 0;
              await update.downloadAndInstall((event) => {
                switch (event.event) {
                  case 'Started':
                    contentLength = event.data.contentLength || 0;
                    break;
                  case 'Progress':
                    downloaded += event.data.chunkLength;
                    break;
                  case 'Finished':
                    break;
                }
              });
              await relaunch();
            }
          });
        }
      } catch (err) {
        console.error("Failed to check for updates:", err);
      }
    };
    // Delay check slightly so app loads first
    setTimeout(checkForUpdates, 3000);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fetchProducts, fetchParties, fetchSettings, fetchBills, fetchTransporters, token]);

  return (
    <BrowserRouter>
      <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground">
        <Titlebar />
        <NetworkStatus />
        <div className="flex-1 relative overflow-hidden flex flex-col">
          <GlobalDialog />
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="cash-bill" element={<CashBill />} />
              <Route path="credit-bill" element={<CreditBill />} />
              <Route path="quick-bill" element={<QuickBill />} />
              <Route path="return-bill" element={<ReturnBill />} />
              <Route path="transport-bill" element={<TransportBill />} />
              <Route path="customers" element={<CustomerManagement />} />
              <Route path="transporters" element={<TransporterManagement />} />
              <Route path="party-statements" element={<PartyStatement />} />
              <Route path="bill-history" element={<BillHistory />} />
              <Route path="stock" element={<StockManagement />} />
              <Route path="receipt" element={<ReceiptCopy />} />
              <Route path="voucher" element={<Voucher />} />
            </Route>
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
