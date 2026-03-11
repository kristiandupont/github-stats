// Helper function to calculate duration in seconds

export function calculateDurationInSeconds(
  createdAt: string,
  updatedAt: string,
): number {
  const start = new Date(createdAt);
  const end = new Date(updatedAt);
  return Math.round((end.getTime() - start.getTime()) / 1000);
}
