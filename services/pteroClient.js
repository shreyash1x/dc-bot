import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const pteroUrl = process.env.PTERO_URL?.replace(/\/$/, '');
const apiKey = process.env.PTERO_API_KEY;
const serverId = process.env.SERVER_ID;

if (!pteroUrl || !apiKey || !serverId) {
  console.error('[PteroClient] Missing required Pterodactyl configuration in environment variables.');
}

// Create configured axios instance
const apiClient = axios.create({
  baseURL: `${pteroUrl}/api/client`,
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

/**
 * Pterodactyl Client API Service
 */
export class PteroClient {
  /**
   * Fetch server resource usage stats (CPU, RAM, state, uptime, disk)
   * Endpoint: GET /api/client/servers/{serverId}/resources
   */
  static async getServerResources() {
    try {
      const response = await apiClient.get(`/servers/${serverId}/resources`);
      return response.data;
    } catch (error) {
      console.error('[PteroClient] Error fetching server resources:', error.message);
      throw new Error(error.response?.data?.errors?.[0]?.detail || error.message);
    }
  }

  /**
   * Send a command to the server console
   * Endpoint: POST /api/client/servers/{serverId}/command
   */
  static async sendCommand(command) {
    try {
      const response = await apiClient.post(`/servers/${serverId}/command`, { command });
      return response.data;
    } catch (error) {
      console.error(`[PteroClient] Error sending command "${command}":`, error.message);
      throw new Error(error.response?.data?.errors?.[0]?.detail || error.message);
    }
  }

  /**
   * Request a WebSocket authentication token and endpoint URL
   * Endpoint: GET /api/client/servers/{serverId}/websocket
   */
  static async getWebSocketCredentials() {
    try {
      const response = await apiClient.get(`/servers/${serverId}/websocket`);
      return response.data.data;
    } catch (error) {
      console.error('[PteroClient] Error fetching websocket credentials:', error.message);
      throw new Error(error.response?.data?.errors?.[0]?.detail || error.message);
    }
  }

  /**
   * Change server power state (start, stop, restart, kill)
   * Endpoint: POST /api/client/servers/{serverId}/power
   */
  static async setPowerState(signal) {
    try {
      const response = await apiClient.post(`/servers/${serverId}/power`, { signal });
      return response.data;
    } catch (error) {
      console.error(`[PteroClient] Error sending power signal "${signal}":`, error.message);
      throw new Error(error.response?.data?.errors?.[0]?.detail || error.message);
    }
  }

  /**
   * Fetch active server backups
   * Endpoint: GET /api/client/servers/{serverId}/backups
   */
  static async getBackups() {
    try {
      const response = await apiClient.get(`/servers/${serverId}/backups`);
      return response.data;
    } catch (error) {
      console.error('[PteroClient] Error fetching backups:', error.message);
      throw new Error(error.response?.data?.errors?.[0]?.detail || error.message);
    }
  }

  /**
   * Create a new server backup
   * Endpoint: POST /api/client/servers/{serverId}/backups
   */
  static async createBackup(name) {
    try {
      const response = await apiClient.post(`/servers/${serverId}/backups`, { name });
      return response.data;
    } catch (error) {
      console.error('[PteroClient] Error creating backup:', error.message);
      throw new Error(error.response?.data?.errors?.[0]?.detail || error.message);
    }
  }
}
