/**
 * Custom UI Helpers for Discord Bot Messages
 */

/**
 * Creates a premium progress bar using modern characters
 * @param {number} percentage - Percentage value (0 - 100)
 * @param {number} length - Number of bars (default: 10)
 * @returns {string} Styled progress bar string
 */
export function createProgressBar(percentage, length = 10) {
  let val = percentage;
  if (val === undefined || val === null || isNaN(val)) {
    val = 0;
  }
  const percent = Math.min(Math.max(val, 0), 100);
  const filledLength = Math.round((percent / 100) * length);
  const emptyLength = length - filledLength;

  const filledChar = '▰'; // Bold modern filled block
  const emptyChar = '▱';  // Bold modern empty block

  const bar = filledChar.repeat(filledLength) + emptyChar.repeat(emptyLength);
  return `\`[${bar}]\` **${percent.toFixed(1)}%**`;
}

/**
 * Format bytes to human-readable format (MB, GB, etc.)
 * @param {number} bytes - Number of bytes
 * @param {number} decimals - Precision decimal count
 * @returns {string} Human-readable file size string
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0 || isNaN(bytes)) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Custom modern status badge generator
 * @param {string} status - Server power state (running, starting, stopping, offline)
 * @returns {string} Emojified status indicator text
 */
export function getStatusBadge(status) {
  switch (status?.toLowerCase()) {
    case 'running':
      return '🟢 **ONLINE**';
    case 'starting':
      return '🟡 **STARTING**';
    case 'stopping':
      return '🟠 **STOPPING**';
    case 'offline':
    default:
      return '🔴 **OFFLINE**';
  }
}

/**
 * Formats seconds into human-readable duration (Xh Ym Zs)
 * @param {number} seconds - Number of seconds
 * @returns {string} Formatted duration
 */
export function formatUptime(seconds) {
  if (!seconds || isNaN(seconds)) return 'Offline';
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  
  return parts.join(' ');
}

/**
 * Creates visual separators for message sections
 */
export const separator = '─'.repeat(30);
export const thickSeparator = '═'.repeat(30);
