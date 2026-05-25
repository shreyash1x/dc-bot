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
import { formatBytes } from '../utils/helpers.js';

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName('backups')
    .setDescription('List all server backup snapshots and trigger new creations.'),
  async execute(interaction) {
    await interaction.deferReply();

    try {
      // 1. Fetch active backups from Pterodactyl REST client
      const res = await PteroClient.getBackups();
      const backups = res.data; // List of backup objects

      const titleText = new TextDisplayBuilder().setContent('📁 **SMP Backup Snapshots**');
      
      let backupLines = [];
      if (!backups || backups.length === 0) {
        backupLines.push('*No backup snapshots exist on the panel.*');
      } else {
        // Grab top 5 most recent backups
        const recentBackups = backups.slice(0, 5);
        recentBackups.forEach((b, index) => {
          const attr = b.attributes;
          const status = attr.is_successful ? '✅' : '⏳';
          const size = formatBytes(attr.bytes);
          const date = new Date(attr.created_at);
          const timeStr = date.toISOString().replace('T', ' ').substring(0, 16);
          backupLines.push(
            `**${index + 1}.** ${status} \`${attr.name || 'Automatic Backup'}\``,
            `   💾 Size: \` ${size} \` | 📅 Created: \` ${timeStr} \``,
            ` `
          );
        });
      }

      const backupsList = new TextDisplayBuilder().setContent(backupLines.join('\n'));

      // Create primary button trigger to create a new backup
      const createBtn = new ButtonBuilder()
        .setCustomId('create_backup')
        .setLabel('Create Backup 📁')
        .setStyle(ButtonStyle.Success);

      const mainSection = new SectionBuilder()
        .addTextDisplayComponents(titleText, backupsList)
        .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://i.imgur.com/8QzXz3F.png' } }));

      // Attach button
      mainSection.setButtonAccessory(createBtn);

      const container = new ContainerBuilder()
        .setAccentColor(0x000001) // Pure Black
        .addSectionComponents(mainSection);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });

    } catch (error) {
      console.error('[Backups Command] Error fetching backups:', error.message);

      const errorTitle = new TextDisplayBuilder().setContent('❌ **Failed to load Backups**');
      const errorDesc = new TextDisplayBuilder().setContent(`Could not load snapshot details: \`${error.message}\``);

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
