import { 
  SlashCommandBuilder, 
  TextDisplayBuilder, 
  ThumbnailBuilder, 
  SectionBuilder, 
  ContainerBuilder, 
  MessageFlags 
} from 'discord.js';
import { PteroClient } from '../services/pteroClient.js';
import dotenv from 'dotenv';

dotenv.config();

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('power')
    .setDescription('Control the server power state (Start, Stop, Restart). [Admin Only]')
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Power action to execute')
        .setRequired(true)
        .addChoices(
          { name: 'Start', value: 'start' },
          { name: 'Stop', value: 'stop' },
          { name: 'Restart', value: 'restart' }
        )
    ),
  async execute(interaction) {
    await interaction.deferReply();

    // 1. Admin Verification
    const adminId = process.env.ADMIN_USER_ID;
    if (!adminId || interaction.user.id !== adminId) {
      const accessTitle = new TextDisplayBuilder().setContent('🛡️ **Access Denied**');
      const accessDesc = new TextDisplayBuilder().setContent(
        'You do not have permission to execute power state operations. This command is restricted to the bot Administrator.'
      );

      const accessSection = new SectionBuilder()
        .addTextDisplayComponents(accessTitle, accessDesc)
        .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://i.imgur.com/8QzXz3F.png' } }));

      const container = new ContainerBuilder()
        .setAccentColor(0x000001) // Pure Black
        .addSectionComponents(accessSection);

      return interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    }

    const action = interaction.options.getString('action');

    try {
      // 2. Dispatch power command to Pterodactyl Client
      await PteroClient.setPowerState(action);

      let actionBadge = '🟢';
      if (action === 'stop') actionBadge = '🔴';
      if (action === 'restart') actionBadge = '🟠';

      const successTitle = new TextDisplayBuilder().setContent('⚡ **Power Instruction Sent**');
      const successDesc = new TextDisplayBuilder().setContent(
        `Instruction to **${action.toUpperCase()}** the server has been dispatched successfully.\n\n${actionBadge} **Status Transitioning...**`
      );

      const successSection = new SectionBuilder()
        .addTextDisplayComponents(successTitle, successDesc)
        .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://i.imgur.com/8QzXz3F.png' } }));

      const container = new ContainerBuilder()
        .setAccentColor(0x000001) // Pure Black
        .addSectionComponents(successSection);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });

    } catch (error) {
      console.error(`[Power Command] Error sending signal "${action}":`, error.message);

      const errorTitle = new TextDisplayBuilder().setContent('❌ **Operation Failed**');
      const errorDesc = new TextDisplayBuilder().setContent(`Failed to dispatch power command: \`${error.message}\``);

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
