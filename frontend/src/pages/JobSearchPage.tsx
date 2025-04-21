import { 
  TextInput, 
  Button, 
  Stack, 
  Paper, 
  Title, 
  Group, 
  Card, 
  Text, 
  Badge,
  Loader,
  Box
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { IconBriefcase, IconMapPin, IconSearch } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useIntersection } from '@mantine/hooks';
import { useEffect } from 'react';
import { jobsApi } from '../lib/api/client';
import { JobDescription, JobSearchRequest } from '../lib/api/types';
import '@mantine/core/styles.css';

export default function JobSearchPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { ref, entry } = useIntersection({
    root: null,
    threshold: 1,
  });

  const form = useForm<JobSearchRequest>({
    initialValues: {
      keywords: searchParams.get('keywords') || '',
      location: searchParams.get('location') || '',
      job_type: '',
      limit: 10,
    },
    validate: {
      keywords: (value) => (!value ? 'Keywords are required' : null),
    },
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch
  } = useInfiniteQuery({
    queryKey: ['jobs', form.values],
    queryFn: async ({ pageParam = 0 }) => {
      try {
        const response = await jobsApi.search({
          ...form.values,
          offset: pageParam,
          limit: 10 // Fixed page size
        });
        return response;
      } catch (error) {
        if (error instanceof Error && error.message.includes('ERR_CONNECTION_REFUSED')) {
          notifications.show({
            title: 'Connection Error',
            message: 'Unable to connect to the server. Please make sure the backend is running.',
            color: 'red',
          });
        }
        throw error;
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      // Only return next page if we got a full page of results
      return lastPage.length === 10 ? allPages.length * 10 : undefined;
    },
    enabled: false,
    initialPageParam: 0,
  });

  const handleSubmit = form.onSubmit((values) => {
    // Update URL with search parameters
    const params = new URLSearchParams();
    if (values.keywords) params.set('keywords', values.keywords);
    if (values.location) params.set('location', values.location);
    navigate(`?${params.toString()}`);
    
    // Trigger the search
    refetch();
  });

  useEffect(() => {
    if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [entry?.isIntersecting, fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleOptimizeResume = (job: JobDescription) => {
    queryClient.setQueryData(['currentJob'], job);
    navigate(`/optimize?url=${encodeURIComponent(job.url || '')}`);
  };

  const allJobs = data?.pages.flatMap(page => page) || [];
  const totalJobs = allJobs.length;

  return (
    <Stack gap="xl">
      <Paper p="md" withBorder>
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Title order={2}>Search LinkedIn Jobs</Title>
            <Group grow>
              <TextInput
                label="Keywords"
                placeholder="e.g., Software Engineer"
                leftSection={<IconSearch size={20} />}
                {...form.getInputProps('keywords')}
              />
              <TextInput
                label="Location"
                placeholder="e.g., Sydney"
                leftSection={<IconMapPin size={20} />}
                {...form.getInputProps('location')}
              />
            </Group>
            <Group justify="flex-end">
              <Button 
                type="submit" 
                loading={isLoading}
                leftSection={<IconBriefcase size={20} />}
              >
                Search Jobs
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>

      {isLoading ? (
        <Box ta="center" py="xl">
          <Loader size="lg" />
        </Box>
      ) : error ? (
        <Text c="red" ta="center">
          {error instanceof Error ? error.message : 'An error occurred while fetching jobs'}
        </Text>
      ) : data ? (
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Title order={2}>Search Results</Title>
            <Text size="sm" c="dimmed">Found {totalJobs} positions</Text>
          </Group>
          {allJobs.map((job: JobDescription, index: number) => (
            <div
              key={job.job_id || index}
              ref={index === allJobs.length - 1 ? ref : undefined}
            >
              <JobCard 
                job={job} 
                onOptimize={() => handleOptimizeResume(job)} 
              />
            </div>
          ))}
          {isFetchingNextPage && (
            <Box ta="center" py="md">
              <Loader size="sm" />
            </Box>
          )}
        </Stack>
      ) : null}
    </Stack>
  );
}

function JobCard({ job, onOptimize }: { job: JobDescription; onOptimize: () => void }) {
  return (
    <Card withBorder>
      <Stack gap="md">
        <Group justify="space-between" wrap="nowrap">
          <Box>
            <Title order={3} size="h4">
              {job.title}
            </Title>
            <Text size="sm" c="dimmed">
              {job.company}
            </Text>
          </Box>
          <Button
            onClick={onOptimize}
            variant="light"
          >
            Optimize Resume
          </Button>
        </Group>
        <Group>
          <Badge leftSection={<IconMapPin size={14} />}>
            {job.location}
          </Badge>
        </Group>
        <Text lineClamp={3}>
          {job.description}
        </Text>
        {job.url && (
          <Button
            component="a"
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            variant="outline"
          >
            View on LinkedIn
          </Button>
        )}
      </Stack>
    </Card>
  );
}