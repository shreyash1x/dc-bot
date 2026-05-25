import { 
  Collection, 
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
import { createProgressBar, getStatusBadge, formatBytes } from '../utils/helpers.js';

// Cooldown collection: commandName -> Collection(userId -> expirationTime)
const cooldowns = new Collection();

export default {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // 1. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      // Handle Command Cooldown Protection
      if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
      }

      const now = Date.now();
      const timestamps = cooldowns.get(command.data.name);
      const defaultCooldownDuration = 3;
      const cooldownAmount = (command.cooldown || defaultCooldownDuration) * 1000;

      if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

        if (now < expirationTime) {
          const timeLeft = (expirationTime - now) / 1000;
          return interaction.reply({
            content: `⏳ **Slow down!** Please wait **${timeLeft.toFixed(1)}** more second(s) before using the \`/${command.data.name}\` command again.`,
            ephemeral: true,
          });
        }
      }

      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

      // Execute Slash Command
      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(`[Interaction] Error running command /${interaction.commandName}:`, error);
        
        const errorMessage = `❌ **Error:** ${error.message || 'An unexpected error occurred.'}`;
        
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
          await interaction.reply({ content: errorMessage, ephemeral: true });
        }
      }
    }

    // 2. Handle Button Interactions (Components V2)
    if (interaction.isButton()) {
      if (interaction.customId === 'refresh_status') {
        try {
          // Defer the update so Discord knows we received it
          await interaction.deferUpdate();

          // Fetch fresh stats from Pterodactyl Client
          const res = await PteroClient.getServerResources();
          const stats = res.attributes;

          // Process state variables
          const status = stats.current_state; // running, starting, offline
          const cpu = stats.resources.cpu_absolute;
          const ramBytes = stats.resources.memory_bytes;
          const maxRamBytes = stats.resources.memory_limit_bytes || 4294967296; // Fallback 4GB
          const diskBytes = stats.resources.disk_bytes;
          const maxDiskBytes = stats.resources.disk_limit_bytes || 10737418240; // Fallback 10GB
          
          const ramPercent = Math.min((ramBytes / maxRamBytes) * 100, 100);
          const diskPercent = Math.min((diskBytes / maxDiskBytes) * 100, 100);
          const rawUptime = stats.resources.uptime;

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

          const updateTime = new Date().toISOString().replace('T', ' ').substring(11, 19) + ' UTC';

          const cpuText = new TextDisplayBuilder().setContent(`🔷 **CPU Usage:**\n${createProgressBar(cpu, 12)}`);
          const ramText = new TextDisplayBuilder().setContent(
            `🛑 **Memory (RAM):**\n${createProgressBar(ramPercent, 12)} \`[${formatBytes(ramBytes)} / ${formatBytes(maxRamBytes)}]\``
          );
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

          // Pure Black Accent Color (0x000001)
          const container = new ContainerBuilder()
            .setAccentColor(0x000001)
            .addSectionComponents(topSection)
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addSectionComponents(statsSection);

          // Update the original message and clear any old text/embed content
          await interaction.editReply({
            content: '',
            embeds: [],
            flags: MessageFlags.IsComponentsV2,
            components: [container]
          });
        } catch (error) {
          console.error('[Interaction] Error refreshing status button:', error.stack);
          
          await interaction.followUp({
            content: `❌ **Failed to refresh status:** ${error.message}`,
            ephemeral: true
          });
        }
      }

      // Handle the "create_backup" button from /backups command
      if (interaction.customId === 'create_backup') {
        try {
          // 1. Admin Verification
          const adminId = process.env.ADMIN_USER_ID;
          if (!adminId || interaction.user.id !== adminId) {
            return interaction.reply({
              content: '🛡️ **Access Denied:** Only the bot Administrator can trigger remote backup snapshots.',
              ephemeral: true
            });
          }

          // Defer update so Discord is notified
          await interaction.deferReply({ ephemeral: true });

          // 2. Dispatch backup request to Pterodactyl client API
          const timeLabel = new Date().toISOString().substring(0, 10);
          await PteroClient.createBackup(`Discord Triggered Backup (${timeLabel})`);

          await interaction.editReply({
            content: '📁 **Backup creation dispatched successfully!** It will compile in the background on your server panel.'
          });

        } catch (error) {
          console.error('[Interaction] Error creating backup button:', error.message);
          if (interaction.deferred || interaction.replied) {
            await interaction.editReply({
              content: `❌ **Failed to trigger backup:** ${error.message}`
            });
          } else {
            await interaction.reply({
              content: `❌ **Failed to trigger backup:** ${error.message}`,
              ephemeral: true
            });
          }
        }
      }
    }
  },
};
