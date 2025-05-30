import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RootLayout from './layouts/RootLayout';
import JobSearchPage from './pages/JobSearchPage';
import OptimizePage from './pages/OptimizePage';
import NotFoundPage from './pages/NotFoundPage';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './styles.css';
import { useEffect, useState } from 'react';
import { Center, AppShell, Loader } from '@mantine/core';
import axios from 'axios';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      refetchOnMount: false, // Don't refetch on component mount
      refetchOnReconnect: false, // Don't refetch on reconnect
    },
  },
});

export default function App() {
  const [loading, setLoading] = useState(true);

  const pingServer = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      await axios.get(`${baseUrl}/api/ping`);
      console.log('Server pinged successfully');
    } catch (error) {
      console.error('Error pinging server:', error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    pingServer(); // Ping immediately on component mount
    const intervalId = setInterval(pingServer, 5 * 60 * 1000); // Ping every 5 minutes

    return () => {
      clearTimeout(timer);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <MantineProvider>
      <Notifications />
      {loading ? (
        <AppShell>
          <Center mih="100vh">
            <Loader size="lg" type="dots" />
          </Center>
        </AppShell>
      ) : (
        <QueryClientProvider client={queryClient}>
          <Router>
            <Routes>
              <Route path="/" element={<RootLayout />}>
                <Route index element={<JobSearchPage />} />
                <Route path="optimize" element={<OptimizePage />} />
                <Route path="404" element={<NotFoundPage />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Route>
            </Routes>
          </Router>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      )}
    </MantineProvider>
  );
}
