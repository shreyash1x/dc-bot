import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { PteroClient } from './pteroClient.js';

class PteroWebsocketService extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.token = null;
    this.socketUrl = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectTimeout = null;
    this.reconnectDelay = 2000; // Start with 2s
    this.maxReconnectDelay = 60000; // Max 60s
    this.serverStatus = 'offline';
  }

  /**
   * Initialize and establish connection
   */
  async connect() {
    if (this.isConnecting || this.isConnected) return;

    this.isConnecting = true;
    console.log('[PteroWebsocket] Attempting to connect to Pterodactyl WebSocket...');

    try {
      // 1. Fetch credentials from Pterodactyl client API
      const credentials = await PteroClient.getWebSocketCredentials();
      this.token = credentials.token;
      this.socketUrl = credentials.socket;

      // 2. Create WebSocket connection
      // We pass Origin and User-Agent headers because Wings validates connection origins to prevent unauthorized WS hijacking
      const origin = process.env.PTERO_URL?.replace(/\/$/, '');
      this.ws = new WebSocket(this.socketUrl, {
        handshakeTimeout: 10000,
        headers: {
          'Origin': origin || '',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      this.registerEvents();
    } catch (error) {
      console.error('[PteroWebsocket] Connection setup failed:', error.message);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Register WebSocket event listeners
   */
  registerEvents() {
    if (!this.ws) return;

    this.ws.on('open', () => {
      console.log('[PteroWebsocket] Socket connection opened. Authenticating...');
      this.authenticate();
    });

    this.ws.on('message', (rawData) => {
      try {
        const data = JSON.parse(rawData.toString());
        this.handleMessage(data);
      } catch (err) {
        console.error('[PteroWebsocket] Failed to parse message:', err.message);
      }
    });

    this.ws.on('close', (code, reason) => {
      console.warn(`[PteroWebsocket] Connection closed (Code: ${code}, Reason: ${reason.toString() || 'None'})`);
      this.handleDisconnect();
    });

    this.ws.on('error', (error) => {
      console.error('[PteroWebsocket] Socket error:', error.message);
      // close event will follow error event, handling disconnect there
    });
  }

  /**
   * Send authentication event to the Pterodactyl panel daemon (Wings)
   */
  authenticate(tokenOverride = null) {
    const activeToken = tokenOverride || this.token;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(JSON.stringify({
      event: 'auth',
      args: [activeToken],
    }));
  }

  /**
   * Processes incoming websocket payloads from Wings
   */
  handleMessage(payload) {
    const { event, args } = payload;
    const arg = args ? args[0] : null;

    switch (event) {
      case 'auth success':
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectDelay = 2000; // Reset reconnect delay on success
        console.log('[PteroWebsocket] Successfully authenticated with Pterodactyl console WebSocket.');
        this.emit('authenticated');
        break;

      case 'token expiring':
        console.log('[PteroWebsocket] Token expiring. Fetching refresh credentials...');
        this.refreshToken();
        break;

      case 'token expired':
        console.warn('[PteroWebsocket] Token expired. Reconnecting...');
        this.ws.close();
        break;

      case 'status':
        this.serverStatus = arg;
        console.log(`[PteroWebsocket] Server power status changed to: ${arg}`);
        this.emit('status', arg);
        break;

      case 'console output':
        if (arg) {
          // Strip ANSI color escape codes from log output for clean parsing
          let cleanLine = arg.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
          // Strip Minecraft internal section symbol (§) color codes
          cleanLine = cleanLine.replace(/§[0-9a-fk-or]/gi, '');
          this.emit('console', cleanLine);
        }
        break;

      case 'stats':
        if (arg) {
          try {
            const stats = JSON.parse(arg);
            this.emit('stats', stats);
          } catch {
            this.emit('stats', arg);
          }
        }
        break;

      default:
        // Other events can be dispatched if needed
        break;
    }
  }

  /**
   * Refreshes the token and updates authorization dynamically
   */
  async refreshToken() {
    try {
      const credentials = await PteroClient.getWebSocketCredentials();
      this.token = credentials.token;
      this.authenticate(credentials.token);
      console.log('[PteroWebsocket] Auth token refreshed successfully.');
    } catch (err) {
      console.error('[PteroWebsocket] Failed to refresh auth token:', err.message);
    }
  }

  /**
   * Command sender utility over WebSocket instead of HTTP if preferred (optional)
   */
  sendCommand(command) {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected. Cannot send command.');
    }
    this.ws.send(JSON.stringify({
      event: 'send command',
      args: [command],
    }));
  }

  /**
   * Handles unexpected disconnects
   */
  handleDisconnect() {
    this.isConnected = false;
    this.isConnecting = false;
    this.scheduleReconnect();
  }

  /**
   * Schedules reconnection with exponential backoff
   */
  scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

    console.log(`[PteroWebsocket] Reconnecting in ${this.reconnectDelay / 1000}s...`);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      this.connect();
    }, this.reconnectDelay);
  }

  /**
   * Close the WebSocket connection gracefully
   */
  disconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.isConnected = false;
    this.isConnecting = false;
    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
    console.log('[PteroWebsocket] Disconnected from Pterodactyl console WebSocket.');
  }

  /**
   * Execute a command and capture specific output from console within a timeout period
   * Useful for interactive commands like '/list'
   * 
   * @param {string} command - Command to run
   * @param {RegExp} searchRegex - Regex pattern to scan logs for
   * @param {number} timeoutMs - Timeout in milliseconds (default: 6000)
   * @returns {Promise<string>} Matched log line
   */
  async executeAndCapture(command, searchRegex, timeoutMs = 6000) {
    return new Promise(async (resolve, reject) => {
      let logListener;
      
      const timer = setTimeout(() => {
        if (logListener) this.off('console', logListener);
        reject(new Error('Timed out waiting for server command response.'));
      }, timeoutMs);

      logListener = (line) => {
        if (searchRegex.test(line)) {
          clearTimeout(timer);
          this.off('console', logListener);
          resolve(line);
        }
      };

      // 1. Subscribe to console stream
      this.on('console', logListener);

      // 2. Dispatch command
      try {
        // We use HTTP command dispatching to ensure delivery, but falls back to ws if HTTP fails
        await PteroClient.sendCommand(command);
      } catch (err) {
        clearTimeout(timer);
        this.off('console', logListener);
        reject(new Error(`Failed to send command: ${err.message}`));
      }
    });
  }
}

// Export singleton instance so all slash commands share the same active socket connection
export const pteroWebsocket = new PteroWebsocketService();
