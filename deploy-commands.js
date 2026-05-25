import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error('❌ Missing DISCORD_TOKEN or CLIENT_ID in environment variables.');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Dynamically load command data for deployment
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  // Using file URL protocol for ESM compatibility under Windows / Linux
  const fileUrl = new URL(`file://${filePath}`).href;
  const { default: command } = await import(fileUrl);
  
  if (command && command.data) {
    commands.push(command.data.toJSON());
    console.log(`[Deployer] Loaded command: /${command.data.name}`);
  } else {
    console.warn(`[Deployer] Command file at ${file} is missing required "data" or "execute" exports.`);
  }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`[Deployer] Started refreshing ${commands.length} application (/) commands...`);

    if (guildId) {
      // 1. Guild-specific Deployment (Instantly updates for development/testing)
      console.log(`[Deployer] Deploying commands to developer guild: ${guildId}`);
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands },
      );
      console.log('✅ Guild commands deployed successfully.');
    } else {
      // 2. Global Deployment (Takes up to an hour to propagate, suitable for production)
      console.log('[Deployer] Deploying commands globally to all server installations...');
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands },
      );
      console.log('✅ Global commands deployed successfully.');
    }
  } catch (error) {
    console.error('❌ Error occurred during command registration:', error);
  }
})();
