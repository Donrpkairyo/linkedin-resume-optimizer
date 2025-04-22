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
import { useEffect, useState } from 'react';
import { Loader, Text, Center, AppShell } from '@mantine/core';

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <MantineProvider>
      <Notifications />
      {loading ? (
        <AppShell>
          <Center mih="100vh">
            <Text size="xl" fw={500}>
              Application loading, please wait... (first search may take up to 50 seconds)
            </Text>
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
