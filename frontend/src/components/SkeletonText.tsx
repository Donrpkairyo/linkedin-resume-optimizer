import { Skeleton } from '@mantine/core';

interface SkeletonTextProps {
  width?: string | number;
}

export function SkeletonText({ width = '100%' }: SkeletonTextProps) {
  return <Skeleton height={12} width={width} radius="xl" />;
}
