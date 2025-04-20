import { Container, Title, Text, Button, Stack } from '@mantine/core';
import { Link } from 'react-router-dom';
import { IconArrowLeft } from '@tabler/icons-react';
import '@mantine/core/styles.css';

export default function NotFoundPage() {
  return (
    <Container size="md" py="xl">
      <Stack gap="lg" align="center">
        <Title order={1}>
          404 - Page Not Found
        </Title>
        <Text size="lg" c="dimmed" ta="center">
          The page you are looking for does not exist or has been moved.
        </Text>
        <Button
          component={Link}
          to="/"
          size="lg"
          leftSection={<IconArrowLeft size={20} />}
        >
          Back to Home
        </Button>
      </Stack>
    </Container>
  );
}