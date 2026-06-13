const fs = require('fs');
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const RESULTS_CHANNEL_ID = process.env.RESULTS_CHANNEL_ID;
const SCOREBOARD_CHANNEL_ID = process.env.SCOREBOARD_CHANNEL_ID;

const STATS_FILE = './stats.json';

const WIN_ROLES = {
  5: '5x Draft Winner',
  10: '10x Draft Winner',
  15: '15x Draft Winner',
  20: '20x Draft Winner',
};

const MVP_ROLES = {
  5: '5x Draft MVP',
  10: '10x Draft MVP',
  15: '15x Draft MVP',
  20: '20x Draft MVP',
};

function loadStats() {
  if (!fs.existsSync(STATS_FILE)) return {};
  return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
}

function saveStats(stats) {
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

function buildScoreboard(stats) {
  const rows = Object.entries(stats)
    .filter(([id, data]) => data.wins > 0 || data.mvps > 0)
    .sort((a, b) => b[1].wins - a[1].wins || b[1].mvps - a[1].mvps)
    .slice(0, 20);

  if (rows.length === 0) return 'No stats recorded yet.';

  return rows
    .map(([id, data], index) => `**#${index + 1}** <@${id}> — 🏆 ${data.wins} wins | ⭐ ${data.mvps} MVPs`)
    .join('\n');
}

async function updateScoreboard(guild, stats) {
  const channel = guild.channels.cache.get(SCOREBOARD_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0xF97316)
    .setTitle('🏆 Draft Scoreboard')
    .setDescription(buildScoreboard(stats))
    .setFooter({ text: 'Updates automatically after every declared match' })
    .setTimestamp();

  if (stats.scoreboardMessageId) {
    const oldMessage = await channel.messages.fetch(stats.scoreboardMessageId).catch(() => null);
    if (oldMessage) {
      await oldMessage.edit({ embeds: [embed] });
      return;
    }
  }

  const newMessage = await channel.send({ embeds: [embed] });
  stats.scoreboardMessageId = newMessage.id;
  saveStats(stats);
}

async function updateStatRoles(member, stats) {
  const winCount = stats[member.id].wins;
  const mvpCount = stats[member.id].mvps;

  for (const amount in WIN_ROLES) {
    if (winCount >= Number(amount)) {
      const role = member.guild.roles.cache.find(r => r.name === WIN_ROLES[amount]);
      if (role) await member.roles.add(role).catch(console.error);
    }
  }

  for (const amount in MVP_ROLES) {
    if (mvpCount >= Number(amount)) {
      const role = member.guild.roles.cache.find(r => r.name === MVP_ROLES[amount]);
      if (role) await member.roles.add(role).catch(console.error);
    }
  }
}

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

    const stats = loadStats();

    for (const u of winnerUsers) {
      if (!stats[u.id]) stats[u.id] = { wins: 0, mvps: 0 };
      stats[u.id].wins += 1;

      const member = await interaction.guild.members.fetch(u.id).catch(() => null);
      if (member) await updateStatRoles(member, stats);
    }

    if (!stats[mvpUser.id]) stats[mvpUser.id] = { wins: 0, mvps: 0 };
    stats[mvpUser.id].mvps += 1;

    const mvpMember = await interaction.guild.members.fetch(mvpUser.id).catch(() => null);
    if (mvpMember) await updateStatRoles(mvpMember, stats);

    saveStats(stats);
    await updateScoreboard(interaction.guild, stats);

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