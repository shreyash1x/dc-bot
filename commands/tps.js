import { 
  SlashCommandBuilder, 
  TextDisplayBuilder, 
  ThumbnailBuilder, 
  SectionBuilder, 
  ContainerBuilder, 
  MessageFlags 
} from 'discord.js';
import { PteroClient } from '../services/pteroClient.js';
import { pteroWebsocket } from '../services/pteroWebsocket.js';
import { getStatusBadge } from '../utils/helpers.js';

export default {
  cooldown: 8,
  data: new SlashCommandBuilder()
    .setName('tps')
    .setDescription('Check the real-time Tick Rate (TPS) performance of the Minecraft SMP.'),
  async execute(interaction) {
    await interaction.deferReply();

    // 1. Pre-check if server is active and running
    let serverStatus = 'offline';
    try {
      const res = await PteroClient.getServerResources();
      serverStatus = res.attributes.current_state;
    } catch (error) {
      console.error('[TPS Command] Error fetching server status:', error.message);
    }

    if (serverStatus !== 'running') {
      const errorTitle = new TextDisplayBuilder().setContent('❌ **Command Error**');
      const errorDesc = new TextDisplayBuilder().setContent(
        `The Minecraft server is currently **${serverStatus.toUpperCase()}**. Please wait for the server to be fully running to check TPS.`
      );

      const errorSection = new SectionBuilder()
        .addTextDisplayComponents(errorTitle, errorDesc)
        .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://i.imgur.com/8QzXz3F.png' } }));

      const container = new ContainerBuilder()
        .setAccentColor(0x000001) // Pure Black
        .addSectionComponents(errorSection);

      return interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    }

    if (!pteroWebsocket.isConnected) {
      const errorTitle = new TextDisplayBuilder().setContent('❌ **Command Unavailable**');
      const errorDesc = new TextDisplayBuilder().setContent(
        'The bot is currently disconnected from the console stream. This feature requires a live WebSocket connection to query TPS in real-time.\n\n' +
        'Try again in a few moments, or contact your server administrator if this persists.'
      );

      const errorSection = new SectionBuilder()
        .addTextDisplayComponents(errorTitle, errorDesc)
        .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://i.imgur.com/8QzXz3F.png' } }));

      const container = new ContainerBuilder()
        .setAccentColor(0x000001)
        .addSectionComponents(errorSection);

      return interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    }

    try {
      const listOutputRegex = /TPS from last 1m, 5m, 15m/i;

      // Send command and capture output via WebSocket listener
      const rawLog = await pteroWebsocket.executeAndCapture('tps', listOutputRegex, 5000);

      // Parse console response
      // E.g. "TPS from last 1m, 5m, 15m: 20.0, 19.98, 19.95"
      const match = rawLog.match(/TPS from last 1m, 5m, 15m:\s*\*?([\d\.]+),\s*\*?([\d\.]+),\s*\*?([\d\.]+)/i);

      let tps1 = 'N/A';
      let tps5 = 'N/A';
      let tps15 = 'N/A';

      if (match) {
        tps1 = match[1];
        tps5 = match[2];
        tps15 = match[3];
      } else {
        const simpleMatch = rawLog.match(/TPS.*?\*?([\d\.]+),\s*\*?([\d\.]+),\s*\*?([\d\.]+)/i);
        if (simpleMatch) {
          tps1 = simpleMatch[1];
          tps5 = simpleMatch[2];
          tps15 = simpleMatch[3];
        } else {
          throw new Error('Retrieved console output did not match standard TPS patterns.');
        }
      }

      // Determine Server Performance rating based on 1m TPS
      const tpsVal = parseFloat(tps1);
      let performanceRating = '🟢 **HEALTHY**';
      if (tpsVal < 15) {
        performanceRating = '🔴 **MAJOR LAG**';
      } else if (tpsVal < 18.5) {
        performanceRating = '🟡 **MINOR LAG**';
      }

      const headerText = new TextDisplayBuilder().setContent('📊 **Server Performance Monitor**');
      const descText = new TextDisplayBuilder().setContent([
        `📡 **Server State:** ${getStatusBadge(serverStatus)}`,
        `⚙️ **Performance Status:** ${performanceRating}`,
        ` `,
        `**Tick-Rate Details (TPS):**`,
        `- ⏱️ **Last 1 minute:** \` ${tps1} / 20.0 \``,
        `- ⏱️ **Last 5 minutes:** \` ${tps5} / 20.0 \``,
        `- ⏱️ **Last 15 minutes:** \` ${tps15} / 20.0 \``,
        ` `,
        `*TPS stands for Ticks Per Second. A perfect rate is 20.0.*`
      ].join('\n'));

      const mainSection = new SectionBuilder()
        .addTextDisplayComponents(headerText, descText)
        .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://i.imgur.com/8QzXz3F.png' } }));

      const container = new ContainerBuilder()
        .setAccentColor(0x000001) // Pure Black
        .addSectionComponents(mainSection);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });

    } catch (error) {
      console.error('[TPS Command] Error querying tick-rate:', error.message);
      
      const errorTitle = new TextDisplayBuilder().setContent('❌ **Query Failed**');
      const errorDesc = new TextDisplayBuilder().setContent(`Failed to retrieve performance tick-rate: \`${error.message}\``);

      const errorSection = new SectionBuilder()
        .addTextDisplayComponents(errorTitle, errorDesc)
        .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://i.imgur.com/8QzXz3F.png' } }));

      const container = new ContainerBuilder()
        .setAccentColor(0x000001)
        .addSectionComponents(errorSection);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    }
  },
};
