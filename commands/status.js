import { 
  SlashCommandBuilder, 
  TextDisplayBuilder, 
  SeparatorBuilder, 
  SeparatorSpacingSize, 
  ThumbnailBuilder, 
  SectionBuilder, 
  ContainerBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  MessageFlags 
} from 'discord.js';
import { PteroClient } from '../services/pteroClient.js';
import { pteroWebsocket } from '../services/pteroWebsocket.js';
import { createProgressBar, getStatusBadge, formatBytes } from '../utils/helpers.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('View the live CPU, memory, storage, state resources, and TPS of the Minecraft server.'),
  async execute(interaction) {
    await interaction.deferReply();

    try {
      const res = await PteroClient.getServerResources();
      const stats = res.attributes;

      const status = stats.current_state; // running, starting, stopping, offline
      const cpu = stats.resources.cpu_absolute;
      const ramBytes = stats.resources.memory_bytes;
      const maxRamBytes = stats.resources.memory_limit_bytes || 4294967296; // Fallback 4GB
      const diskBytes = stats.resources.disk_bytes;
      const maxDiskBytes = stats.resources.disk_limit_bytes || 10737418240; // Fallback 10GB
      
      const ramPercent = Math.min((ramBytes / maxRamBytes) * 100, 100);
      const diskPercent = Math.min((diskBytes / maxDiskBytes) * 100, 100);
      const rawUptime = stats.resources.uptime; // in milliseconds

      let uptimeText = 'Server is offline';
      if (status === 'running' && rawUptime > 0) {
        const bootTimestamp = Math.floor((Date.now() - rawUptime) / 1000);
        uptimeText = `Running since <t:${bootTimestamp}:F> (<t:${bootTimestamp}:R>)`;
      }

      // Query TPS dynamically if the server is active
      let tpsText = 'Offline';
      if (status === 'running' && pteroWebsocket.isConnected) {
        try {
          const listOutputRegex = /TPS from last 1m, 5m, 15m/i;
          const rawLog = await pteroWebsocket.executeAndCapture('tps', listOutputRegex, 2500);
          const match = rawLog.match(/TPS from last 1m, 5m, 15m:\s*\*?([\d\.]+),\s*\*?([\d\.]+),\s*\*?([\d\.]+)/i);
          if (match) {
            tpsText = `⚡ **${match[1]}**, **${match[2]}**, **${match[3]}**`;
          } else {
            const simpleMatch = rawLog.match(/TPS.*?\*?([\d\.]+),\s*\*?([\d\.]+),\s*\*?([\d\.]+)/i);
            if (simpleMatch) {
              tpsText = `⚡ **${simpleMatch[1]}**, **${simpleMatch[2]}**, **${simpleMatch[3]}**`;
            } else {
              tpsText = '⚠️ *Could not parse TPS response*';
            }
          }
        } catch {
          tpsText = '⚠️ *Uptime/TPS query timeout*';
        }
      }

      // Build V2 Component structures using official Builders
      const statusTitle = new TextDisplayBuilder().setContent('🖥️ **Minecraft SMP Live Status**');
      const powerText = new TextDisplayBuilder().setContent(
        `📡 **State:** ${getStatusBadge(status)}\n⏱️ **Uptime:** ${uptimeText}\n📈 **TPS (1m, 5m, 15m):** ${tpsText}`
      );

      const cpuText = new TextDisplayBuilder().setContent(`🔷 **CPU Usage:**\n${createProgressBar(cpu, 12)}`);
      const ramText = new TextDisplayBuilder().setContent(
        `🛑 **Memory (RAM):**\n${createProgressBar(ramPercent, 12)} \`[${formatBytes(ramBytes)} / ${formatBytes(maxRamBytes)}]\``
      );
      
      const updateTime = new Date().toISOString().replace('T', ' ').substring(11, 19) + ' UTC';
      const diskText = new TextDisplayBuilder().setContent(
        `💾 **Disk Storage:**\n${createProgressBar(diskPercent, 12)} \`[${formatBytes(diskBytes)} / ${formatBytes(maxDiskBytes)}]\`\n\n*Last Updated: ${updateTime}*`
      );

      // Interactive button
      const refreshButton = new ButtonBuilder()
        .setCustomId('refresh_status')
        .setLabel('Refresh Status')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔄');

      // Compose Sections
      const topSection = new SectionBuilder()
        .addTextDisplayComponents(statusTitle, powerText)
        .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://i.imgur.com/8QzXz3F.png' } }));

      const statsSection = new SectionBuilder()
        .addTextDisplayComponents(cpuText, ramText, diskText)
        .setButtonAccessory(refreshButton);

      // Pure Black Accent Color (0x000001) as requested by the user
      const container = new ContainerBuilder()
        .setAccentColor(0x000001)
        .addSectionComponents(topSection)
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addSectionComponents(statsSection);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });

    } catch (error) {
      console.error('[Status Command] Error:', error.stack);
      
      const errorTitle = new TextDisplayBuilder().setContent('❌ **System Error**');
      const errorDesc = new TextDisplayBuilder().setContent(`Failed to retrieve server status: \`${error.message}\``);

      const errorSection = new SectionBuilder()
        .addTextDisplayComponents(errorTitle, errorDesc)
        .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://i.imgur.com/8QzXz3F.png' } }));

      // Pure Black Accent Color (0x000001)
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
