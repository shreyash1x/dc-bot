import { ActivityType } from 'discord.js';
import { pteroWebsocket } from '../services/pteroWebsocket.js';

export default {
  name: 'clientReady',
  once: true,
  async execute(client) {
    console.log(`[Discord] Logged in as ${client.user.tag}! Initializing services...`);

    // 1. Start Pterodactyl WebSocket connection in background (non-blocking)
    // Don't await this so bot starts even if WebSocket fails
    pteroWebsocket.connect().catch((err) => {
      console.error('[Discord] Failed to start Pterodactyl websocket connection:', err.message);
    });

    // 2. Setup Dynamic Presence matching Pterodactyl Server State
    client.user.setPresence({
      activities: [{ name: 'SMP Server Status', type: ActivityType.Watching }],
      status: 'online',
    });

    // Listen to WebSocket status changes to update presence dynamically
    pteroWebsocket.on('status', (status) => {
      const stateSymbol = status === 'running' ? '🟢 ONLINE' : status === 'starting' ? '🟡 STARTING' : status === 'stopping' ? '🟠 STOPPING' : '🔴 OFFLINE';
      client.user.setPresence({
        activities: [{ name: `SMP: ${stateSymbol}`, type: ActivityType.Watching }],
        status: status === 'running' ? 'online' : 'dnd',
      });
    });

    // Listen to statistics event to show active player counts if available
    pteroWebsocket.on('stats', (stats) => {
      // Pterodactyl resource usage contains resource properties.
      // Dynamic updates for players requires query, but some Minecraft eggs push custom console statistics.
      // We keep a general fallback presence.
    });

    console.log('[Discord] Bot is ready and listening to Discord gateway events!');
  },
};
