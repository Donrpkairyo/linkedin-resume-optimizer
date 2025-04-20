import { Box } from '@mantine/core';
import { keyframes } from '@emotion/react';

const shimmer = keyframes`
  0% {
    background-position: -500px 0;
  }
  100% {
    background-position: 500px 0;
  }
`;

const pulse = keyframes`
  0% {
    opacity: 0.5;
  }
  50% {
    opacity: 1.0;
  }
  100% {
    opacity: 0.5;
  }
`;

interface SkeletonTextProps {
  width?: string;
  height?: string;
}

export function SkeletonText({ width = '100%', height = '1em' }: SkeletonTextProps) {
  return (
    <Box
      style={{
        width,
        height,
        backgroundColor: '#f0f0f0',
        backgroundImage: 'linear-gradient(90deg, #f0f0f0 0px, #f7f7f7 50%, #f0f0f0 100%)',
        backgroundSize: '1000px 100%',
        animation: `${shimmer} 2s infinite linear, ${pulse} 1.5s infinite ease-in-out`,
        borderRadius: '4px',
      }}
    />
  );
}
