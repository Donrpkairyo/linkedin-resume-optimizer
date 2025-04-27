import { useState, useEffect, useRef } from 'react';
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
  Container,
  Alert,
  Skeleton
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconFileUpload, IconWand, IconDownload, IconArrowLeft, IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resumeApi } from '../lib/api/client';
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
  const jobUrl = searchParams.get('url');
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [editedSuggestions, setEditedSuggestions] = useState<string>('');
  const [optimizedResume, setOptimizedResume] = useState<string>('');
  const loadingRef = useRef<HTMLDivElement>(null);

  const form = useForm<OptimizeFormValues>({
    initialValues: {
      resume_text: '',
      job_description: '',
      job_url: jobUrl || '',
    },
    validate: {
      resume_text: (value) => (!value && !currentFile ? 'Resume text or file is required' : null),
      job_description: (value, values) => {
        if (!value && !values.job_url) {
          return 'Either job description or URL is required';
        }
        return null;
      },
      job_url: (value, values) => {
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
    mutationFn: (data: OptimizeFormValues) => resumeApi.optimize({
      resume_text: data.resume_text,
      job_description: data.job_description
    }),
    onSuccess: (data) => {
      setOptimizedResume(data.optimized_resume);
      loadingRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const handleFileUpload = (file: File | null) => {
    if (!file) return;

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      notifications.show({
        title: 'Error',
        message: 'File size must be less than 5MB',
        color: 'red'
      });
      return;
    }

    // Validate file type
    const fileType = file.name.toLowerCase();
    if (!fileType.endsWith('.docx') && !fileType.endsWith('.doc') && !fileType.endsWith('.txt')) {
      notifications.show({
        title: 'Error',
        message: 'Only .doc, .docx and .txt files are supported',
        color: 'red'
      });
      return;
    }

    setCurrentFile(file);

    if (fileType.endsWith('.docx') || fileType.endsWith('.doc')) {
      form.setFieldValue('resume_text', `File selected: ${file.name}`);
      notifications.show({
        title: 'File Uploaded',
        message: `${file.name} selected for optimization`,
        color: 'green'
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const content = e.target.result.toString();
          if (content.trim().length === 0) {
            notifications.show({
              title: 'Error',
              message: 'The file appears to be empty',
              color: 'red'
            });
            return;
          }
          form.setFieldValue('resume_text', content);
          notifications.show({
            title: 'File Uploaded',
            message: `${file.name} content loaded successfully`,
            color: 'green'
          });
        }
      };
      reader.onerror = () => {
        notifications.show({
          title: 'Error',
          message: 'Failed to read file content',
          color: 'red'
        });
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = form.onSubmit((values) => {
    setOptimizedResume(''); // Clear previous results
    
    notifications.show({
      id: 'optimize-progress',
      title: 'Processing',
      message: 'Starting resume optimization...',
      color: 'blue',
      loading: true,
      autoClose: false
    });

    try {
      if (currentFile && (currentFile.name.endsWith('.docx') || currentFile.name.endsWith('.doc'))) {
        const formData = new FormData();
        formData.append('resume', currentFile);
        formData.append('job_description', values.job_description || '');
        formData.append('job_url', values.job_url || '');

        notifications.update({
          id: 'optimize-progress',
          message: 'Processing document and analyzing job requirements...'
        });

        optimizeFromDocxMutation.mutate(formData, {
          onSuccess: () => {
            notifications.update({
              id: 'optimize-progress',
              title: 'Success',
              message: 'Resume optimization completed',
              color: 'green',
              loading: false,
              autoClose: 2000
            });
          }
        });
      } else if (values.job_url) {
        notifications.update({
          id: 'optimize-progress',
          message: 'Fetching job details from LinkedIn...'
        });

        optimizeFromUrlMutation.mutate({
          resume_text: values.resume_text,
          job_url: values.job_url,
        }, {
          onSuccess: () => {
            notifications.update({
              id: 'optimize-progress',
              title: 'Success',
              message: 'Resume optimization completed',
              color: 'green',
              loading: false,
              autoClose: 2000
            });
          }
        });
      } else {
        notifications.update({
          id: 'optimize-progress',
          message: 'Analyzing resume and job requirements...'
        });

        optimizeMutation.mutate(values, {
          onSuccess: () => {
            notifications.update({
              id: 'optimize-progress',
              title: 'Success',
              message: 'Resume optimization completed',
              color: 'green',
              loading: false,
              autoClose: 2000
            });
          }
        });
      }
    } catch (error) {
      notifications.update({
        id: 'optimize-progress',
        title: 'Error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        color: 'red',
        loading: false,
        autoClose: 5000
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
    <Container size="md" py="xl">
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

        {isLoading ? (
          <div ref={loadingRef}>
            <LoadingSteps />
          </div>
        ) : error ? (
          <Alert color="red" icon={<IconAlertCircle />}>
            {error instanceof Error ? error.message : 'Failed to optimize resume'}
          </Alert>
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
    </Container>
  );
}