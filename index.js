const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const RESULTS_CHANNEL_ID = process.env.RESULTS_CHANNEL_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const commands = [
  new SlashCommandBuilder()
    .setName('declare-winner')
    .setDescription('Declare winners of a Siege custom game')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addStringOption(o => o.setName('gametype').setDescription('Name of the game type').setRequired(true))
    .addStringOption(o => o.setName('format').setDescription('Match format').setRequired(true)
      .addChoices(
        { name: '1v1 Tournament', value: '1v1_tournament' },
        { name: '2v2 Best of One', value: '2v2_bo1' },
        { name: '3v3 Best of One', value: '3v3_bo1' },
        { name: '4v4 Best of One', value: '4v4_bo1' },
        { name: '5v5 Best of One', value: '5v5_bo1' },
        { name: '5v5 Tournament', value: '5v5_tournament' },
      ))
    .addUserOption(o => o.setName('winner1').setDescription('Winner #1').setRequired(true))
.addUserOption(o => o.setName('mvp').setDescription('MVP of the match').setRequired(true))
.addUserOption(o => o.setName('winner2').setDescription('Winner #2'))
.addUserOption(o => o.setName('winner3').setDescription('Winner #3'))
.addUserOption(o => o.setName('winner4').setDescription('Winner #4'))
.addUserOption(o => o.setName('winner5').setDescription('Winner #5'))
    .addRoleOption(o => o.setName('trophy_role').setDescription('Permanent trophy role to assign to winners'))
    .addRoleOption(o => o.setName('champion_role').setDescription('Tournament champion role'))
    .addIntegerOption(o => o.setName('currency').setDescription('Noctaly coins to award each winner').setMinValue(0))
    .addStringOption(o => o.setName('notes').setDescription('Optional match notes')),

  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the top players leaderboard'),
].map(c => c.toJSON());

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ Slash commands registered globally');
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'declare-winner') {
    await interaction.deferReply({ ephemeral: true });

    const gameTypeName = interaction.options.getString('gametype');
    const format = interaction.options.getString('format');
    const currency = interaction.options.getInteger('currency') ?? 0;
    const notes = interaction.options.getString('notes') ?? '';
    const trophyRole = interaction.options.getRole('trophy_role');
    const championRole = interaction.options.getRole('champion_role');
    const mvpUser = interaction.options.getUser('mvp');
    const isTournament = format.includes('tournament');

    const winnerUsers = [1, 2, 3, 4, 5]
      .map(n => interaction.options.getUser(`winner${n}`))
      .filter(Boolean);

    if (trophyRole) {
      for (const u of winnerUsers) {
        const member = await interaction.guild.members.fetch(u.id).catch(() => null);
        if (member) await member.roles.add(trophyRole).catch(console.error);
      }
    }

    if (championRole && isTournament) {
      const membersWithRole = interaction.guild.members.cache.filter(m => m.roles.cache.has(championRole.id));

      for (const [, m] of membersWithRole) {
        await m.roles.remove(championRole).catch(console.error);
      }

      for (const u of winnerUsers) {
        const member = await interaction.guild.members.fetch(u.id).catch(() => null);
        if (member) await member.roles.add(championRole).catch(console.error);
      }
    }

    const noctalyCmds = winnerUsers.map(u => `/eco add ${u.id} ${currency}`);
    const resultsChannel = interaction.guild.channels.cache.get(RESULTS_CHANNEL_ID);

    if (resultsChannel) {
      const embed = new EmbedBuilder()
        .setColor(0xF97316)
        .setTitle(`🏆 ${gameTypeName} — Winner${winnerUsers.length > 1 ? 's' : ''} Declared!`)
        .setDescription(winnerUsers.map(u => `<@${u.id}>`).join(' · '))
        .addFields(
          [
            { name: '⭐ MVP', value: `<@${mvpUser.id}>`, inline: true },
            { name: '💰 Currency Reward', value: `${currency} coins each`, inline: true },
            { name: '🎮 Format', value: format.replace(/_/g, ' ').toUpperCase(), inline: true },
            trophyRole ? { name: '🛡️ Trophy Role', value: trophyRole.toString(), inline: true } : null,
            championRole && isTournament ? { name: '👑 Champion Role', value: championRole.toString(), inline: true } : null,
            notes ? { name: '📝 Notes', value: notes } : null,
          ].filter(Boolean)
        )
        .setFooter({ text: `Declared by ${interaction.user.username}` })
        .setTimestamp();

      await resultsChannel.send({ embeds: [embed] });
    }

    const replyLines = [
      `✅ **Match recorded!** Winners declared for **${gameTypeName}**`,
      `⭐ MVP: ${mvpUser.username}`,
      trophyRole ? `🛡️ Trophy role **${trophyRole.name}** assigned to all winners` : '',
      championRole && isTournament ? `👑 Champion role **${championRole.name}** assigned to tournament winners` : '',
      championRole && !isTournament ? `ℹ️ Champion role ignored because this was not a tournament` : '',
      currency > 0 ? `\n**Paste these Noctaly commands to award coins:**` : '',
      ...noctalyCmds.map(c => `\`${c}\``),
    ].filter(Boolean).join('\n');

    await interaction.editReply({ content: replyLines });
    return;
  }

  if (interaction.commandName === 'leaderboard') {
    await interaction.reply({ content: '📊 View the full leaderboard at your dashboard!', ephemeral: true });
  }
});

console.log('Trying to login...');
client.login(TOKEN).catch(console.error);