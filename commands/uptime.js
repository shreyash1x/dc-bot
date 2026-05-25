import { 
  SlashCommandBuilder, 
  TextDisplayBuilder, 
  ThumbnailBuilder, 
  SectionBuilder, 
  ContainerBuilder, 
  MessageFlags 
} from 'discord.js';
import { PteroClient } from '../services/pteroClient.js';
import { getStatusBadge } from '../utils/helpers.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('Display the current continuous uptime of the Minecraft server.'),
  async execute(interaction) {
    await interaction.deferReply();

    try {
      const res = await PteroClient.getServerResources();
      const stats = res.attributes;
      const state = stats.current_state; // running, starting, offline
      const rawUptimeMs = stats.resources.uptime; // In milliseconds

      if (state !== 'running' || !rawUptimeMs || rawUptimeMs <= 0) {
        const errorTitle = new TextDisplayBuilder().setContent('⏱️ **Server Uptime Tracker**');
        const errorDesc = new TextDisplayBuilder().setContent(
          `The server is currently offline or loading.\n\n📡 **State:** ${getStatusBadge(state)}`
        );

        const errorSection = new SectionBuilder()
          .addTextDisplayComponents(errorTitle, errorDesc)
          .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://i.imgur.com/8QzXz3F.png' } }));

        const container = new ContainerBuilder()
          .setAccentColor(0xE74C3C) // Red
          .addSectionComponents(errorSection);

        return interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        });
      }

      const seconds = Math.floor(rawUptimeMs / 1000);
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      const uptimeStr = `${h}h ${m}m ${s}s`;

      const bootTime = new Date(Date.now() - rawUptimeMs);
      const bootStr = bootTime.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

      const titleText = new TextDisplayBuilder().setContent('⏱️ **Server Uptime Tracker**');
      const descText = new TextDisplayBuilder().setContent([
        `📡 **Server State:** ${getStatusBadge(state)}`,
        `⏰ **Boot Time:** ${bootStr}`,
        `⏳ **Continuous Uptime:** **${uptimeStr}**`,
        ` `,
        `*Uptime resets during restarts or system maintenance.*`
      ].join('\n'));

      const mainSection = new SectionBuilder()
        .addTextDisplayComponents(titleText, descText)
        .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://i.imgur.com/8QzXz3F.png' } }));

      const container = new ContainerBuilder()
        .setAccentColor(0x000001) // Pure Black
        .addSectionComponents(mainSection);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });

    } catch (error) {
      console.error('[Uptime Command] Error:', error.message);
      
      const errorTitle = new TextDisplayBuilder().setContent('❌ **System Error**');
      const errorDesc = new TextDisplayBuilder().setContent(`Failed to retrieve server uptime: \`${error.message}\``);

      const errorSection = new SectionBuilder()
        .addTextDisplayComponents(errorTitle, errorDesc)
        .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://i.imgur.com/8QzXz3F.png' } }));

      const container = new ContainerBuilder()
        .setAccentColor(0x000001) // Pure Black
        .addSectionComponents(errorSection);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    }
  },
};
