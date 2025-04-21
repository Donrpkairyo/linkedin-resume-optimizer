import { useState, useEffect, useRef } from 'react';
import { Stack, Text, Paper } from '@mantine/core';
import { SkeletonText } from './SkeletonText';

interface LoadingStepsProps {
  onLoadingComplete?: () => void;
  result?: string;
}

export function LoadingSteps({ onLoadingComplete, result }: LoadingStepsProps) {
  const [showFinalSkeleton, setShowFinalSkeleton] = useState(false);
  const skeletonTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Show skeleton after a short delay
    const timeout = window.setTimeout(() => {
      setShowFinalSkeleton(true);
      if (onLoadingComplete) {
        onLoadingComplete();
      }
    }, 1500); // Show skeleton after 1.5 seconds

    return () => {
      if (skeletonTimeoutRef.current) window.clearTimeout(skeletonTimeoutRef.current);
      clearTimeout(timeout);
    };
  }, [result, onLoadingComplete]);

  return (
    <Stack gap="xl">
      <Text ta="center" fw="bold" fz="lg">
        Generating Results...
      </Text>
      <Paper p="md" withBorder>
        <Stack gap="md">
          {showFinalSkeleton && (
            <>
              {/* Create paragraphs of skeleton lines */}
              {Array.from({ length: 5 }).map((_, paragraphIndex) => (
                <Stack key={paragraphIndex} gap="sm">
                  {/* Each paragraph has 3-5 lines */}
                  {Array.from({ length: Math.floor(Math.random() * 3) + 3 }).map((_, lineIndex) => (
                    <SkeletonText 
                      key={`${paragraphIndex}-${lineIndex}`}
                      width={`${Math.random() * 40 + 60}%`}
                    />
                  ))}
                </Stack>
              ))}
            </>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}