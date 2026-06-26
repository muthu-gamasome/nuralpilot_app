export function formatTimeAgo(date: Date): string {
  try {
    const now = new Date();
    const totalSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (totalSeconds < 0) return '0s';
    const totalMinutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h ago`;
    if (hours > 0) return `${hours}h ${totalMinutes % 60}m ago`;
    if (totalMinutes > 0) return `${totalMinutes}m ago`;
    return `${totalSeconds}s ago`;
  } catch {
    return 'Unknown';
  }
}

export function formatUptime(uptime?: number): string {
  if (!uptime || uptime <= 0) return '0 Mins';
  const totalSeconds = Math.floor(uptime);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${totalMinutes % 60}m`;
  if (totalMinutes > 0) return `${totalMinutes}m ${totalSeconds % 60}s`;
  return `${totalSeconds}s`;
}
