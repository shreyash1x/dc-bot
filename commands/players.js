import { 
  SlashCommandBuilder, 
  TextDisplayBuilder, 
  SeparatorBuilder, 
  SeparatorSpacingSize, 
  ThumbnailBuilder, 
  SectionBuilder, 
  ContainerBuilder, 
  MessageFlags 
} from 'discord.js';
import { PteroClient } from '../services/pteroClient.js';
import { pteroWebsocket } from '../services/pteroWebsocket.js';
import { createProgressBar } from '../utils/helpers.js';

export default {
  cooldown: 8,
  data: new SlashCommandBuilder()
    .setName('players')
    .setDescription('List all online players currently playing on the Minecraft SMP.'),
  async execute(interaction) {
    await interaction.deferReply();

    // 1. Pre-check if server is active and running
    let serverStatus = 'offline';
    try {
      const res = await PteroClient.getServerResources();
      serverStatus = res.attributes.current_state;
    } catch (error) {
      console.error('[Players Command] Error fetching server status:', error.message);
    }

    if (serverStatus !== 'running') {
      const errorTitle = new TextDisplayBuilder().setContent('❌ **Command Error**');
      const errorDesc = new TextDisplayBuilder().setContent(
        `The Minecraft server is currently **${serverStatus.toUpperCase()}**. Please wait for the server to be fully running.`
      );

      const errorSection = new SectionBuilder()
        .addTextDisplayComponents(errorTitle, errorDesc)
        .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://i.imgur.com/8QzXz3F.png' } }));
      const container = new ContainerBuilder().setAccentColor(0xE74C3C).addSectionComponents(errorSection);

      return interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    }

    if (!pteroWebsocket.isConnected) {
      const errorTitle = new TextDisplayBuilder().setContent('❌ **Command Unavailable**');
      const errorDesc = new TextDisplayBuilder().setContent(
        'The bot is currently disconnected from the console stream. This feature requires a live WebSocket connection to the Minecraft server.\n\n' +
        'Try again in a few moments, or contact your server administrator if this persists.'
      );

      const errorSection = new SectionBuilder()
        .addTextDisplayComponents(errorTitle, errorDesc)
        .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://i.imgur.com/8QzXz3F.png' } }));
      const container = new ContainerBuilder().setAccentColor(0xE74C3C).addSectionComponents(errorSection);

      return interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    }

    try {
      const listOutputRegex = /There are (\d+) of a max of (\d+) players/i;

      // Send command and capture output via WebSocket listener
      const rawLog = await pteroWebsocket.executeAndCapture('list', listOutputRegex, 7000);

      // Parse console response
      const match = rawLog.match(/There are (\d+) of a max of (\d+) players online:(.*)/i);

      if (!match) {
        // Fallback match
        const simpleMatch = rawLog.match(/There are (\d+) of a max of (\d+) players/i);
        if (simpleMatch) {
          const onlineCount = parseInt(simpleMatch[1]);
          const maxLimit = parseInt(simpleMatch[2]);
          const percentFilled = maxLimit > 0 ? (onlineCount / maxLimit) * 100 : 0;
          
          const headerText = new TextDisplayBuilder().setContent('👥 **Active Players Online**');
          const capText = new TextDisplayBuilder().setContent(
            `🟢 **Capacity:** \`${onlineCount} / ${maxLimit}\` players\n${createProgressBar(percentFilled, 12)}`
          );
          const rosterTitle = new TextDisplayBuilder().setContent('👤 **Online Roster**');
          const rosterText = new TextDisplayBuilder().setContent(
            '⚠️ *Could not parse individual player names, but retrieved active counts.*'
          );

          const mainSection = new SectionBuilder()
            .addTextDisplayComponents(headerText, capText)
            .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://res.cloudinary.com/dvsah4ego/image/upload/v1779762823/IMG_20260526_075723_rk0xkc.jpg' } }));

          const rosterSection = new SectionBuilder()
            .addTextDisplayComponents(rosterTitle, rosterText)
            .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://res.cloudinary.com/dvsah4ego/image/upload/v1779762823/IMG_20260526_075723_rk0xkc.jpg' } }));

          const container = new ContainerBuilder()
            .setAccentColor(0x000001) // Pure Black
            .addSectionComponents(mainSection)
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addSectionComponents(rosterSection);

          return interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [container]
          });
        }

        throw new Error('Retrieved console output did not match standard player list patterns.');
      }

      const onlineCount = parseInt(match[1]);
      const maxLimit = parseInt(match[2]);
      const playerListString = match[3]?.trim();

      const players = playerListString
        ? playerListString.split(',').map((name) => name.trim()).filter((name) => name.length > 0)
        : [];

      const percentFilled = maxLimit > 0 ? (onlineCount / maxLimit) * 100 : 0;

      const headerText = new TextDisplayBuilder().setContent('👥 **Active Players Online**');
      const capText = new TextDisplayBuilder().setContent(
        `🟢 **Capacity:** \`${onlineCount} / ${maxLimit}\` players\n${createProgressBar(percentFilled, 12)}`
      );

      const rosterTitle = new TextDisplayBuilder().setContent('👤 **Online Roster**');
      
      let rosterTextStr = '';
      if (onlineCount > 0 && players.length > 0) {
        rosterTextStr = players.map((player) => `- 🟢 **${player}**`).join('\n');
      } else if (onlineCount > 0 && players.length === 0) {
        rosterTextStr = `- 👤 *${onlineCount} anonymous player(s) online*`;
      } else {
        rosterTextStr = `*No players are currently online. Be the first to join!*`;
      }
      const rosterText = new TextDisplayBuilder().setContent(rosterTextStr);

      const mainSection = new SectionBuilder()
        .addTextDisplayComponents(headerText, capText)
        .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://i.imgur.com/8QzXz3F.png' } }));

      const rosterSection = new SectionBuilder()
        .addTextDisplayComponents(rosterTitle, rosterText)
        .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://i.imgur.com/8QzXz3F.png' } }));

      const container = new ContainerBuilder()
        .setAccentColor(0x000001) // Pure Black
        .addSectionComponents(mainSection)
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addSectionComponents(rosterSection);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });

    } catch (error) {
      console.error('[Players Command] Error querying list:', error.message);
      
      const errorTitle = new TextDisplayBuilder().setContent('❌ **Query Failed**');
      const errorDesc = new TextDisplayBuilder().setContent(`Failed to retrieve player list: \`${error.message}\``);

      const errorSection = new SectionBuilder()
        .addTextDisplayComponents(errorTitle, errorDesc)
        .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://i.imgur.com/8QzXz3F.png' } }));
      const container = new ContainerBuilder().setAccentColor(0x000001).addSectionComponents(errorSection);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    }
  },
};
