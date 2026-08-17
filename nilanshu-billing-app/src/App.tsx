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



function App() {
  const { fetchProducts, fetchParties, fetchSettings, fetchBills, fetchTransporters, token } = useStore();

  // Activate live sync — polls the DB every 5s so all instances stay in sync
  useLiveSync();



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
    let isUpdateInProgress = false;

    const runUpdateCheck = async (isStartup: boolean) => {
      if (isUpdateInProgress) return; // Prevent duplicate checks
      try {
        const update = await check();
        if (update) {
          useStore.getState().showDialog({
            title: isStartup ? 'Mandatory Update Available!' : 'Update Available!',
            message: `Version ${update.version} is available. ${isStartup ? 'You must install this update to continue using the software.' : 'Do you want to download and install it now?'}`,
            type: 'confirm',
            hideCancel: isStartup,
            confirmText: 'Update Now',
            cancelText: 'Do it later',
            onConfirm: async () => {
              isUpdateInProgress = true;
              let downloaded = 0;
              let contentLength = 0;

              // Show progress dialog IMMEDIATELY with no buttons
              useStore.getState().showDialog({
                title: 'Downloading Update...',
                message: 'Connecting to server... Please wait.',
                type: 'alert',
                hideAllButtons: true
              });

              try {
                await update.downloadAndInstall((event) => {
                  switch (event.event) {
                    case 'Started':
                      contentLength = event.data.contentLength || 0;
                      useStore.getState().showDialog({
                        title: 'Downloading Update...',
                        message: `Download started (0%)... Please do not close the app.`,
                        type: 'alert',
                        hideAllButtons: true
                      });
                      break;
                    case 'Progress':
                      downloaded += event.data.chunkLength;
                      if (contentLength > 0) {
                        const percent = Math.round((downloaded / contentLength) * 100);
                        useStore.getState().showDialog({
                          title: 'Downloading Update...',
                          message: `Downloading: ${percent}% — Please do not close the app.`,
                          type: 'alert',
                          hideAllButtons: true
                        });
                      }
                      break;
                    case 'Finished':
                      useStore.getState().showDialog({
                        title: 'Installing Update...',
                        message: 'Download complete! Installing now... The app will restart automatically.',
                        type: 'alert',
                        hideAllButtons: true
                      });
                      break;
                  }
                });

                // Force restart the app after install completes
                await relaunch();
              } catch (installErr) {
                console.error("Update install failed:", installErr);
                isUpdateInProgress = false;
                useStore.getState().showDialog({
                  title: 'Update Failed',
                  message: 'The update could not be installed. Please check your internet connection and try again later.',
                  type: 'alert'
                });
              }
            }
          });
        }
      } catch (err) {
        console.error("Failed to check for updates:", err);
      }
    };
    
    // Delay initial startup check slightly so app loads first
    setTimeout(() => runUpdateCheck(true), 3000);

    // Periodic check every 15 minutes (900000 ms) while the app is running
    const updateInterval = setInterval(() => runUpdateCheck(false), 900000);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(updateInterval);
    };
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
