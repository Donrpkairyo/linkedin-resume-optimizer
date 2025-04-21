import { useState, useEffect } from 'react';
import {
  Paper,
  Stack,
  Title,
  Textarea,
  Button,
  Group,
  Text,
  Tabs,
  Box,
  FileButton,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconFileUpload, IconWand, IconDownload, IconArrowLeft } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resumeApi } from '../lib/api/client';
import { ResumeOptimizationRequest } from '../lib/api/types';
import { LoadingSteps } from '../components/LoadingSteps';
import '@mantine/core/styles.css';

interface OptimizeFormValues {
  resume_text: string;
  job_description: string;
  job_url: string;
}

interface TextareaChangeEvent {
  target: {
    value: string;
  };
}

export default function OptimizePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const jobUrl = searchParams.get('url');
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [editedSuggestions, setEditedSuggestions] = useState<string>('');
  const [optimizedResume, setOptimizedResume] = useState<string>('');
  const [showResults, setShowResults] = useState(false);

  const form = useForm<OptimizeFormValues>({
    initialValues: {
      resume_text: '',
      job_description: '',
      job_url: jobUrl || '',
    },
    validate: {
      resume_text: (value: string) => (!value && !currentFile ? 'Resume text or file is required' : null),
      job_description: (value: string, values: OptimizeFormValues) => {
        if (!value && !values.job_url) {
          return 'Either job description or URL is required';
        }
        return null;
      },
      job_url: (value: string, values: OptimizeFormValues) => {
        if (!value && !values.job_description) {
          return 'Either job description or URL is required';
        }
        if (value && !value.includes('linkedin.com/jobs')) {
          return 'Must be a valid LinkedIn job URL';
        }
        return null;
      },
    },
  });

  const optimizeMutation = useMutation({
    mutationFn: (data: ResumeOptimizationRequest) => resumeApi.optimize(data),
    onSuccess: (data) => {
      setOptimizedResume(data.optimized_resume);
    },
    onError: (error: unknown) => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to optimize resume',
        color: 'red',
      });
    },
  });

  const optimizeFromUrlMutation = useMutation({
    mutationFn: (data: { resume_text: string; job_url: string }) => 
      resumeApi.optimizeFromUrl(data),
    onSuccess: (data) => {
      setOptimizedResume(data.optimized_resume);
    },
    onError: (error: unknown) => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to optimize resume',
        color: 'red',
      });
    },
  });

  const optimizeFromDocxMutation = useMutation({
    mutationFn: (formData: FormData) => resumeApi.optimizeFromDocx(formData),
    onSuccess: (data) => {
      setOptimizedResume(data.optimized_resume);
    },
    onError: (error: unknown) => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to optimize resume',
        color: 'red',
      });
    },
  });

  const handleLoadingComplete = () => {
    setShowResults(true);
  };

  const handleFileUpload = (file: File | null) => {
    if (!file) return;
    setCurrentFile(file);

    if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
      form.setFieldValue('resume_text', `File selected: ${file.name}`);
    } else {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result) {
          form.setFieldValue('resume_text', e.target.result.toString());
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = form.onSubmit((values: OptimizeFormValues) => {
    setShowResults(false);
    setOptimizedResume(''); // Clear previous results

    if (currentFile && (currentFile.name.endsWith('.docx') || currentFile.name.endsWith('.doc'))) {
      const formData = new FormData();
      formData.append('resume', currentFile);
      formData.append('job_description', values.job_description || '');
      formData.append('job_url', values.job_url || '');
      optimizeFromDocxMutation.mutate(formData);
    } else if (values.job_url) {
      optimizeFromUrlMutation.mutate({
        resume_text: values.resume_text,
        job_url: values.job_url,
      });
    } else {
      optimizeMutation.mutate({
        resume_text: values.resume_text,
        job_description: values.job_description,
      });
    }
  });

  const handleBackToSearch = () => {
    navigate('/');
  };

  const isLoading = optimizeMutation.isPending || optimizeFromUrlMutation.isPending || optimizeFromDocxMutation.isPending;
  const error = optimizeMutation.error || optimizeFromUrlMutation.error || optimizeFromDocxMutation.error;

  useEffect(() => {
    if (optimizedResume) {
      setEditedSuggestions(optimizedResume);
    }
  }, [optimizedResume]);

  const defaultTab = jobUrl ? 'url' : 'description';

  return (
    <Stack gap="xl">
      <Paper p="md" withBorder>
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Title order={2}>Resume Optimizer</Title>
              <Button
                variant="light"
                leftSection={<IconArrowLeft size={16} />}
                onClick={handleBackToSearch}
              >
                Back to Search
              </Button>
            </Group>

            <Box>
              <Group mb="xs">
                <Text fw={500}>Resume</Text>
                <FileButton 
                  onChange={handleFileUpload}
                  accept=".txt,.doc,.docx"
                >
                  {(props) => (
                    <Button 
                      variant="light" 
                      size="xs" 
                      leftSection={<IconFileUpload size={16} />}
                      {...props}
                    >
                      Upload File
                    </Button>
                  )}
                </FileButton>
              </Group>
              <Textarea
                placeholder="Paste your resume text here or upload a file..."
                minRows={10}
                autosize
                {...form.getInputProps('resume_text')}
              />
            </Box>

            <Tabs defaultValue={defaultTab}>
              <Tabs.List>
                <Tabs.Tab value="description">Job Description</Tabs.Tab>
                <Tabs.Tab value="url">LinkedIn URL</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="description">
                <Textarea
                  placeholder="Paste the job description here..."
                  label="Job Description"
                  minRows={5}
                  autosize
                  mt="md"
                  {...form.getInputProps('job_description')}
                />
              </Tabs.Panel>

              <Tabs.Panel value="url">
                <Textarea
                  placeholder="Paste the LinkedIn job URL here..."
                  label="LinkedIn Job URL"
                  mt="md"
                  {...form.getInputProps('job_url')}
                />
              </Tabs.Panel>
            </Tabs>

            <Group justify="flex-end">
              <Button 
                type="submit"
                loading={isLoading}
                leftSection={<IconWand size={20} />}
              >
                Optimize Resume
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>

      {isLoading && !optimizedResume ? (
        <LoadingSteps 
          onLoadingComplete={handleLoadingComplete}
        />
      ) : error ? (
        <Text c="red" ta="center">
          {error instanceof Error ? error.message : 'Failed to optimize resume'}
        </Text>
      ) : optimizedResume ? (
        <Paper p="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Title order={2}>Suggested Updates</Title>
              <Button
                variant="light"
                leftSection={<IconDownload size={16} />}
                onClick={() => {
                  if (currentFile) {
                    const formData = new FormData();
                    formData.append('resume', currentFile);
                    formData.append('suggestions', editedSuggestions || optimizedResume);
                    resumeApi.exportResume(formData)
                      .then(() => {
                        notifications.show({
                          title: 'Success',
                          message: 'Resume updated successfully! Check your downloads folder.',
                          color: 'green',
                        });
                      })
                      .catch((error: any) => {
                        notifications.show({
                          title: 'Error',
                          message: error instanceof Error ? error.message : 'Failed to export resume',
                          color: 'red',
                        });
                      });
                  }
                }}
                disabled={!currentFile}
              >
                Export Resume
              </Button>
            </Group>
            <Textarea
              value={editedSuggestions || optimizedResume}
              onChange={(e: TextareaChangeEvent) => setEditedSuggestions(e.target.value)}
              minRows={15}
              autosize
              style={{ fontFamily: 'monospace' }}
            />
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}