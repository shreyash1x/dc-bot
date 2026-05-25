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
import dotenv from 'dotenv';

dotenv.config();

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('exec')
    .setDescription('Execute an arbitrary console command directly on the Minecraft server. [Admin Only]')
    .addStringOption(option => 
      option.setName('command')
        .setDescription('Minecraft server command to execute')
        .setRequired(true)
    ),
  async execute(interaction) {
    await interaction.deferReply();

    // 1. Admin Verification
    const adminId = process.env.ADMIN_USER_ID;
    if (!adminId || interaction.user.id !== adminId) {
      const accessTitle = new TextDisplayBuilder().setContent('🛡️ **Access Denied**');
      const accessDesc = new TextDisplayBuilder().setContent(
        'You do not have permission to execute remote console commands. This command is restricted to the bot Administrator.'
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
        `The Minecraft server is currently **${pteroWebsocket.serverStatus.toUpperCase()}**. Please wait for the server to be fully running to execute commands.`
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

    const command = interaction.options.getString('command');

    try {
      // 3. Register log listener to capture console output stream in real-time
      const consoleLogs = [];
      const logCaptureListener = (line) => {
        // Collect clean line logs
        consoleLogs.push(line);
      };

      pteroWebsocket.on('console', logCaptureListener);

      // 4. Dispatch remote command via Pterodactyl client HTTP API
      await PteroClient.sendCommand(command);

      // 5. Wait for 2 seconds to capture console responses
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Unsubscribe listener
      pteroWebsocket.off('console', logCaptureListener);

      // Process and clean output
      let outputText = 'No console feedback returned within 2 seconds.';
      if (consoleLogs.length > 0) {
        // Limit captured logs to prevent character overflow limits
        const cleanLines = consoleLogs.slice(0, 10);
        outputText = cleanLines.join('\n');
      }

      const successTitle = new TextDisplayBuilder().setContent('💻 **Console Command Dispatched**');
      const successDesc = new TextDisplayBuilder().setContent([
        `🛰️ **Instruction:** \` ${command} \``,
        ` `,
        `💬 **Console Output Capture (Next 2s):**`,
        `\`\`\`json`,
        outputText.substring(0, 1500), // Character cap guard
        `\`\`\``
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
      console.error('[Exec Command] Error executing command:', error.message);

      const errorTitle = new TextDisplayBuilder().setContent('❌ **Command Execution Failed**');
      const errorDesc = new TextDisplayBuilder().setContent(`Failed to dispatch remote console instruction: \`${error.message}\``);

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
