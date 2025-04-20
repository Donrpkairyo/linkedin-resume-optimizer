import { AppShell, Container, Group, Title, Button } from '@mantine/core';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { IconBriefcase, IconFileText } from '@tabler/icons-react';
import '@mantine/core/styles.css';

export default function RootLayout() {
  const location = useLocation();

  return (
    <AppShell
      header={{ height: 60 }}
      padding="md"
    >
      <AppShell.Header>
        <Container size="lg" h="100%">
          <Group justify="space-between" h="100%">
            <Title order={1} size="h3">
              LinkedIn Resume Optimizer
            </Title>
            <Group>
              <Button
                component={Link}
                to="/"
                variant={location.pathname === '/' ? 'filled' : 'light'}
                leftSection={<IconBriefcase size={20} />}
              >
                Job Search
              </Button>
              <Button
                component={Link}
                to="/optimize"
                variant={location.pathname === '/optimize' ? 'filled' : 'light'}
                leftSection={<IconFileText size={20} />}
              >
                Resume Optimizer
              </Button>
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="lg" py="xl">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}