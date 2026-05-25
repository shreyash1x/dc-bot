import { Client, GatewayIntentBits, Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { pteroWebsocket } from './services/pteroWebsocket.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('❌ DISCORD_TOKEN is missing in environment. Please provide a valid bot token.');
  process.exit(1);
}

// 1. Initialize Discord client with minimum intents required for Slash Commands
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Create collection for commands
client.commands = new Collection();

// 2. Load Commands dynamically (ESM compatible)
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const fileUrl = new URL(`file://${filePath}`).href;
  const { default: command } = await import(fileUrl);
  
  if (command && command.data && command.execute) {
    client.commands.set(command.data.name, command);
    console.log(`[Init] Loaded Slash Command: /${command.data.name}`);
  } else {
    console.warn(`[Init] Command file at ${file} is missing "data" or "execute" properties.`);
  }
}

// 3. Load Events dynamically (ESM compatible)
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const fileUrl = new URL(`file://${filePath}`).href;
  const { default: event } = await import(fileUrl);
  
  if (event && event.name && event.execute) {
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
    console.log(`[Init] Registered Gateway Event: "${event.name}"`);
  } else {
    console.warn(`[Init] Event file at ${file} is missing "name" or "execute" properties.`);
  }
}

// 4. Handle process termination and cleanup Pterodactyl websockets gracefully
const gracefulShutdown = (signal) => {
  console.log(`\n[System] Received ${signal}. Commencing graceful shutdown...`);
  
  // Close active Pterodactyl WebSocket connection
  try {
    pteroWebsocket.disconnect();
  } catch (err) {
    console.error('Error during websocket disconnect:', err.message);
  }

  // Destroy Discord Gateway Session
  try {
    client.destroy();
    console.log('[System] Discord client destroyed.');
  } catch (err) {
    console.error('Error during client destruction:', err.message);
  }

  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// 5. Connect and Login
client.login(token).catch((err) => {
  console.error('❌ Failed to login to Discord Gateway:', err.message);
  process.exit(1);
});
