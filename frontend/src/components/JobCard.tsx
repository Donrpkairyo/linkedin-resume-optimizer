import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Stack,
  Title,
  Group,
  Text,
  Badge,
  Button,
  Box,
  Skeleton,
  Collapse
} from '@mantine/core';
import {
  IconMapPin,
  IconBriefcase,
  IconFileAnalytics,
  IconChevronDown,
  IconChevronUp,
  IconExternalLink
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { JobDescription } from '../lib/api/types';
import { jobsApi } from '../lib/api/client';
import { useQuery } from '@tanstack/react-query';

interface JobCardProps {
  job?: JobDescription;
  onOptimize?: () => void;
  loading?: boolean;
}

export function JobCard({ job, onOptimize, loading = false }: JobCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Use React Query for description fetching and caching
  const {
    data: description,
    isLoading: isDescriptionLoading,
    error: descriptionError
  } = useQuery({
    queryKey: ['jobDescription', job?.job_id],
    queryFn: () => jobsApi.getDescription(job!.job_id),
    enabled: !!job?.job_id && isExpanded,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  const handleExpandClick = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  const handleOptimizeClick = useCallback(() => {
    onOptimize?.();
  }, [onOptimize]);

  useEffect(() => {
    if (descriptionError) {
      notifications.show({
        title: 'Error',
        message: descriptionError instanceof Error ? descriptionError.message : 'Failed to load job description',
        color: 'red'
      });
    }
  }, [descriptionError]);

  if (loading) {
    return (
      <Card withBorder shadow="sm">
        <Stack gap="md">
          <Group justify="space-between" wrap="nowrap" align="flex-start">
            <Box style={{ flex: 1 }}>
              <Skeleton height={24} mb={8} width="70%" />
              <Stack gap={6}>
                <Skeleton height={16} width="50%" />
                <Skeleton height={16} width="30%" />
              </Stack>
            </Box>
            <Skeleton height={36} width={140} />
          </Group>
          <Stack gap={8}>
            <Skeleton height={12} width="90%" />
            <Skeleton height={12} width="85%" />
            <Skeleton height={12} width="88%" />
          </Stack>
        </Stack>
      </Card>
    );
  }

  if (!job) return null;

  const formattedDate = job.created_at ? new Date(job.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  }) : '';

  return (
    <Card withBorder shadow="sm">
      <Stack gap="md">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Box style={{ flex: 1 }}>
            <Title order={3} size="h4" style={{ lineHeight: 1.3 }} mb={6}>
              {job.title}
            </Title>
            <Stack gap={6}>
              <Group gap="xs">
                <IconBriefcase size={16} style={{ flexShrink: 0 }} />
                <Text fw={600} size="sm">
                  {job.company}
                </Text>
                <Text c="dimmed" size="sm">•</Text>
                <Badge leftSection={<IconMapPin size={12} />} variant="light" size="sm">
                  {job.location}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                Posted {job.ago_time || formattedDate}
              </Text>
            </Stack>
          </Box>
          <Group gap="sm">
            <Button
              onClick={handleOptimizeClick}
              variant="light"
              color="blue"
              title="Optimize Resume"
              leftSection={<IconFileAnalytics size={16} />}
            >
              Optimize Resume
            </Button>
          </Group>
        </Group>

        <Stack gap="sm">
          <Collapse in={isExpanded}>
            {isDescriptionLoading ? (
              <Stack gap={8}>
                <Skeleton height={12} width="90%" />
                <Skeleton height={12} width="85%" />
                <Skeleton height={12} width="88%" />
              </Stack>
            ) : (
              <Text
                size="sm"
                c="dimmed"
                style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}
              >
                {(description || 'No description available') as string}
              </Text>
            )}
          </Collapse>

          <Group gap="md">
            <Button
              variant="subtle"
              size="xs"
              onClick={handleExpandClick}
              leftSection={isExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
            >
              {isExpanded ? 'Show Less' : 'Show More'}
            </Button>

            {job.url && (
              <Button
                component="a"
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                variant="subtle"
                size="xs"
                color="gray"
                leftSection={<IconExternalLink size={14} />}
              >
                View on LinkedIn
              </Button>
            )}
          </Group>
        </Stack>
      </Stack>
    </Card>
  );
}