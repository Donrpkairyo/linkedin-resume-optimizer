import { useState, useCallback } from 'react';
import { 
  TextInput, 
  Button, 
  Stack, 
  Paper, 
  Title, 
  Group, 
  Text, 
  Badge,
  Alert,
  Box,
  Container,
  Select
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IconBriefcase,
  IconMapPin,
  IconSearch,
  IconInfoCircle,
  IconX
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  JobDescription, 
  JobSearchRequest,
  DATE_POSTED_OPTIONS,
  JOB_TYPE_OPTIONS,
  EXPERIENCE_LEVEL_OPTIONS,
  REMOTE_FILTER_OPTIONS
} from '../lib/api/types';
import { jobsApi } from '../lib/api/client';
import { JobCard } from '../components/JobCard';

export default function JobSearchPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<JobSearchRequest>({
    initialValues: {
      keywords: searchParams.get('keywords') || '',
      location: searchParams.get('location') || '',
      date_posted: searchParams.get('date_posted') || '',
      job_type: searchParams.get('job_type') || '',
      remote_filter: searchParams.get('remote_filter') || '',
      experience_level: searchParams.get('experience_level') || '',
      sort_by: 'recent',
      page: currentPage
    },
    validate: {
      keywords: (value) => value.trim().length === 0 ? 'Keywords are required' : null,
    },
  });

  const { isLoading, isFetching } = useQuery({
    queryKey: ['jobs', { ...form.values, page: currentPage }],
    queryFn: async () => {
      try {
        const response = await jobsApi.search({
          ...form.values,
          page: currentPage
        });
        
        if (currentPage === 0) {
          setJobs(response.jobs);
        } else {
          setJobs(prev => [...prev, ...response.jobs]);
        }
        
        setHasMore(response.has_more);
        setError(null);
        return response;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to search jobs';
        setError(message);
        notifications.show({
          title: 'Search Error',
          message,
          color: 'red'
        });
        throw err;
      }
    },
    enabled: searchParams.has('keywords'),
    staleTime: 30000,
    gcTime: 3600000,
    retry: 1
  });

  const handleSearch = async (values: JobSearchRequest) => {
    try {
      setCurrentPage(0);
      setJobs([]);
      setError(null);
      
      // Update URL with search params
      const params = new URLSearchParams();
      Object.entries(values)
        .filter(([_, value]) => value !== null && value !== '')
        .forEach(([key, value]) => params.set(key, value.toString()));
      navigate(`?${params.toString()}`);
      
      // Show loading notification
      notifications.show({
        id: 'search-jobs',
        title: 'Searching LinkedIn',
        message: 'Finding matching positions...',
        color: 'blue',
        loading: true,
        autoClose: false
      });

      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
      
      notifications.update({
        id: 'search-jobs',
        title: 'Search Complete',
        message: 'Scroll down to see results',
        color: 'green',
        loading: false,
        autoClose: 2000
      });
    } catch (err) {
      console.error('Search error:', err);
      notifications.update({
        id: 'search-jobs',
        title: 'Search Error',
        message: err instanceof Error ? err.message : 'Failed to search jobs',
        color: 'red',
        loading: false,
        autoClose: 5000
      });
    }
  };

  const loadMore = useCallback(async () => {
    try {
      setIsLoadingMore(true);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Add delay
      setCurrentPage(prev => prev + 1);
    } catch (err) {
      setError('Error loading more jobs. Please try again.');
    } finally {
      setIsLoadingMore(false);
    }
  }, []);

  const handleSubmit = form.onSubmit((values) => handleSearch(values));

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Paper p="md" withBorder>
          <form onSubmit={handleSubmit}>
            <Stack gap="lg">
              <Title order={2}>Search LinkedIn Jobs</Title>
              
              <Alert icon={<IconInfoCircle />} color="blue">
                Results are loaded in batches of 10. Use the "Load More" button to see additional positions.
              </Alert>

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

              <Group grow>
                <Select
                  label="Date Posted"
                  placeholder="Select date range"
                  data={DATE_POSTED_OPTIONS}
                  clearable
                  {...form.getInputProps('date_posted')}
                />
                <Select
                  label="Job Type"
                  placeholder="Select job type"
                  data={JOB_TYPE_OPTIONS}
                  clearable
                  {...form.getInputProps('job_type')}
                />
                <Select
                  label="Experience Level"
                  placeholder="Select experience"
                  data={EXPERIENCE_LEVEL_OPTIONS}
                  clearable
                  {...form.getInputProps('experience_level')}
                />
              </Group>

              <Group gap="sm">
                <Select
                  label="Work Type"
                  placeholder="Select work type"
                  data={REMOTE_FILTER_OPTIONS}
                  clearable
                  {...form.getInputProps('remote_filter')}
                />
              </Group>

              <Group justify="flex-end">
                <Button 
                  type="submit"
                  leftSection={<IconSearch size={20} />}
                  loading={isLoading || isFetching}
                  disabled={isLoadingMore}
                >
                  Search Jobs
                </Button>
              </Group>
            </Stack>
          </form>
        </Paper>

        {error ? (
          <Paper withBorder p="xl" ta="center">
            <Stack gap="md" align="center">
              <IconX size={48} color="var(--mantine-color-red-6)" />
              <Title order={3} c="red">Search Error</Title>
              <Text c="red">{error}</Text>
            </Stack>
          </Paper>
        ) : isLoading ? (
          <Paper withBorder p="xl">
            <Stack gap="md">
              {Array.from({ length: 3 }).map((_, i) => (
                <JobCard key={i} loading />
              ))}
            </Stack>
          </Paper>
        ) : jobs.length > 0 ? (
          <Stack gap="lg">
            <Group justify="space-between" align="center">
              <Title order={2}>Search Results</Title>
              <Badge variant="light" color="blue" size="lg">
                Found {jobs.length} positions
              </Badge>
            </Group>

            <Stack gap="md">
              {jobs.map((job) => (
                <Box key={job.job_id}>
                  <JobCard 
                    job={job}
                    onOptimize={() => navigate(`/optimize?url=${encodeURIComponent(job.url)}`)}
                  />
                </Box>
              ))}

              {hasMore && (
                <Group justify="center" mt="xl">
                  <Button
                    variant="light"
                    onClick={loadMore}
                    loading={isLoadingMore}
                    disabled={isLoading || isFetching}
                  >
                    {isLoadingMore ? 'Loading More...' : 'Load More Jobs'}
                  </Button>
                </Group>
              )}
            </Stack>
          </Stack>
        ) : searchParams.has('keywords') ? (
          <Paper withBorder p="xl" ta="center">
            <Stack gap="md" align="center">
              <IconBriefcase size={48} color="var(--mantine-color-gray-5)" />
              <Title order={3}>No jobs found</Title>
              <Text c="dimmed">Try adjusting your search terms or filters</Text>
            </Stack>
          </Paper>
        ) : null}
      </Stack>
    </Container>
  );
}
