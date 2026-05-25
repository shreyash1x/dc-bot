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
import dotenv from 'dotenv';

dotenv.config();

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('ip')
    .setDescription('Get the connection IP, port, and live map link for the Minecraft SMP.'),
  async execute(interaction) {
    const rawUrl = process.env.PTERO_URL;
    
    // Read custom IP and Port from environment variables, or fall back to extracting from PTERO_URL
    let serverHost = process.env.SERVER_IP;
    let serverPort = process.env.SERVER_PORT || '25565';
    
    if (!serverHost && rawUrl) {
      try {
        const urlObj = new URL(rawUrl);
        serverHost = urlObj.hostname;
      } catch {}
    }
    
    // Defaults if nothing is found
    if (!serverHost) {
      serverHost = 'play.example.com';
    }

    const version = 'Java Edition 1.20.4+';
    const mapUrl = process.env.MAP_URL;

    // 1. Define Text displays for Section V2 components
    const serverTitleText = new TextDisplayBuilder().setContent('🌍 **Server Connection Details**');
    const serverDescText = new TextDisplayBuilder().setContent('Use the connection details below to join our Minecraft SMP server!');
    const versionText = new TextDisplayBuilder().setContent(
      `📍 **Address (IP):** \`${serverHost}\` \n🔌 **Port:** \`${serverPort}\` \n⚙️ **Game Version:** \`${version}\``
    );
    
    const howToTitle = new TextDisplayBuilder().setContent('🕹️ **How to Connect**');
    const howToSteps = new TextDisplayBuilder().setContent([
      '1. Open Minecraft and select **Multiplayer**.',
      '2. Click **Add Server** or **Direct Connection**.',
      `3. Enter \`${serverHost}${serverPort === '25565' ? '' : `:${serverPort}`}\` in the Server Address field and click **Done**!`
    ].join('\n'));

    // 2. Build Buttons
    const wikiButton = new ButtonBuilder()
      .setLabel('SMP Wiki')
      .setStyle(ButtonStyle.Link)
      .setURL(rawUrl && rawUrl.startsWith('http') ? rawUrl : 'https://google.com')
      .setEmoji('📖');

    const mapButton = mapUrl && mapUrl.startsWith('http') ? new ButtonBuilder()
      .setLabel('Live Server Map')
      .setStyle(ButtonStyle.Link)
      .setURL(mapUrl)
      .setEmoji('🗺️') : null;

    // 3. Compose Sections with their accessories
    const mainSection = new SectionBuilder()
      .addTextDisplayComponents(serverTitleText, serverDescText, versionText)
      .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://i.imgur.com/8QzXz3F.png' } }));

    const stepsSection = new SectionBuilder()
      .addTextDisplayComponents(howToTitle, howToSteps);

    // Apply button accessories
    if (mapButton) {
      stepsSection.setButtonAccessory(mapButton);
      mainSection.setButtonAccessory(wikiButton);
    } else {
      stepsSection.setButtonAccessory(wikiButton);
    }

    // 4. Wrap inside a premium V2 Container component (Pure Black 0x000001)
    const container = new ContainerBuilder()
      .setAccentColor(0x000001) // Pure Black
      .addSectionComponents(mainSection)
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
      .addSectionComponents(stepsSection);

    // 5. Respond utilizing the V2 Components activation flag
    await interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container]
    });
  },
};
