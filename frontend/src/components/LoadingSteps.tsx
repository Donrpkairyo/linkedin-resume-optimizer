import { useState, useEffect } from 'react';
import { Stack, Text, Paper, Group, ThemeIcon, Skeleton } from '@mantine/core';
import { IconCheck, IconHourglass } from '@tabler/icons-react';

const STEPS = [
  'Analyzing job requirements...',
  'Reviewing resume content...',
  'Identifying optimization opportunities...',
  'Generating tailored suggestions...'
];

const STEP_DURATION = 1500; // 1.5 seconds per normal step
const FINAL_STEP_DURATION = 2500; // 2.5 seconds for the final step with animation

interface LoadingStepProps {
  text: string;
  active: boolean;
  complete: boolean;
}

function LoadingStep({ text, active, complete }: LoadingStepProps) {
  return (
    <Group>
      <ThemeIcon 
        size="md" 
        color={complete ? 'green' : active ? 'blue' : 'gray'}
        variant={active ? 'filled' : 'light'}
      >
        {complete ? <IconCheck size={16} /> : <IconHourglass size={16} />}
      </ThemeIcon>
      <Text 
        c={complete ? 'dimmed' : active ? 'dark' : 'dimmed'} 
        fw={active ? 600 : 400}
      >
        {text}
      </Text>
    </Group>
  );
}

interface LoadingStepsProps {
  onLoadingComplete?: () => void;
}


export function LoadingSteps({ onLoadingComplete }: LoadingStepsProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (currentStep < STEPS.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, STEP_DURATION);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  return (
    <Paper p="xl" withBorder>
      <Stack gap="lg">
        <Text ta="center" fw={500} size="lg">
          Optimizing Resume
        </Text>

        <Stack gap="md">
          {STEPS.map((step, index) => (
            <LoadingStep
              key={step}
              text={step}
              active={index === currentStep}
              complete={index < currentStep}
            />
          ))}

          {/* Show skeleton loading for the final step */}
          {currentStep === STEPS.length - 1 && (
            <Stack gap="xs" mt="md">
              {Array.from({ length: 6 }).map((_, i) => (
                <Group key={i} spacing="xs" nowrap>
                  <Skeleton circle height={6} mt={5} width={6} animate={true} />
                  <Skeleton
                    height={14}
                    radius="xl"
                    width={`${75 + Math.random() * 20}%`}
                    animate={true}
                  />
                </Group>
              ))}
            </Stack>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}