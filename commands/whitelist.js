import { 
  SlashCommandBuilder, 
  TextDisplayBuilder, 
  ThumbnailBuilder, 
  SectionBuilder, 
  ContainerBuilder, 
  MessageFlags 
} from 'discord.js';
import { pteroWebsocket } from '../services/pteroWebsocket.js';
import dotenv from 'dotenv';

dotenv.config();

export default {
  cooldown: 8,
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Manage the server whitelist (Add or Remove players). [Admin Only]')
    .addSubcommand(subcommand =>
      subcommand.setName('add')
        .setDescription('Add a player to the server whitelist')
        .addStringOption(option => option.setName('username').setDescription('Minecraft username').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand.setName('remove')
        .setDescription('Remove a player from the server whitelist')
        .addStringOption(option => option.setName('username').setDescription('Minecraft username').setRequired(true))
    ),
  async execute(interaction) {
    await interaction.deferReply();

    // 1. Admin Verification
    const adminId = process.env.ADMIN_USER_ID;
    if (!adminId || interaction.user.id !== adminId) {
      const accessTitle = new TextDisplayBuilder().setContent('🛡️ **Access Denied**');
      const accessDesc = new TextDisplayBuilder().setContent(
        'You do not have permission to execute whitelist operations. This command is restricted to the bot Administrator.'
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

    // 2. Pre-check if server is active and running
    if (pteroWebsocket.serverStatus !== 'running') {
      const errorTitle = new TextDisplayBuilder().setContent('❌ **Command Error**');
      const errorDesc = new TextDisplayBuilder().setContent(
        `The Minecraft server is currently **${pteroWebsocket.serverStatus.toUpperCase()}**. Please wait for the server to be fully running to manage the whitelist.`
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

    if (!pteroWebsocket.isConnected) {
      const errorTitle = new TextDisplayBuilder().setContent('❌ **Command Error**');
      const errorDesc = new TextDisplayBuilder().setContent(
        'Bot is temporarily disconnected from the console stream. Please try again in a few moments.'
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

    const subcommand = interaction.options.getSubcommand();
    const username = interaction.options.getString('username');
    const command = `whitelist ${subcommand} ${username}`;

    try {
      // Define precise capture regex matching Spigot/Paper whitelist logs
      const whitelistRegex = /(?:Added|Removed) (\S+) (?:to|from) the whitelist|Player is (?:already|not) whitelisted/i;

      // Send command and capture console response
      const rawLog = await pteroWebsocket.executeAndCapture(command, whitelistRegex, 6000);

      // Construct dynamic success/state description
      const successTitle = new TextDisplayBuilder().setContent('📝 **Whitelist Instruction Executed**');
      const successDesc = new TextDisplayBuilder().setContent([
        `🛰️ **Instruction:** \` ${command} \``,
        ` `,
        `💬 **Console Output:**`,
        `> **${rawLog}**`
      ].join('\n'));

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
      console.error('[Whitelist Command] Error running command:', error.message);

      const errorTitle = new TextDisplayBuilder().setContent('❌ **Whitelist Failed**');
      const errorDesc = new TextDisplayBuilder().setContent(`Failed to execute whitelist operation: \`${error.message}\``);

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
