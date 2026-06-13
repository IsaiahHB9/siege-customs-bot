const fs = require('fs');
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const RESULTS_CHANNEL_ID = process.env.RESULTS_CHANNEL_ID;
const SCOREBOARD_CHANNEL_ID = process.env.SCOREBOARD_CHANNEL_ID;
const DRAFT_CHANNEL_ID = process.env.DRAFT_CHANNEL_ID;

const STATS_FILE = './stats.json';
const DRAFT_FILE = './drafts.json';

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

function readJson(file) {
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function buildScoreboard(stats) {
  const rows = Object.entries(stats)
    .filter(([id, data]) => id !== 'scoreboardMessageId' && (data.wins > 0 || data.mvps > 0))
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
  writeJson(STATS_FILE, stats);
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

function buildDraftEmbed(draft) {
  const embed = new EmbedBuilder()
    .setColor(0xF97316)
    .setTitle(`📋 ${draft.name}`)
    .setDescription(`**Format:** ${draft.format.toUpperCase()} | **Teams:** ${draft.teamCount} | **Max Players Per Team:** ${draft.maxPlayers}`)
    .setFooter({ text: 'Updates automatically as picks are added' })
    .setTimestamp();

  for (const team of draft.teams) {
    const players = team.players.map((id, i) => {
      if (i === 0) return `👑 <@${id}>`;
      return `• <@${id}>`;
    }).join('\n');

    embed.addFields({
      name: `Team ${team.number}`,
      value: players || 'No players yet',
      inline: true,
    });
  }

  return embed;
}

async function updateDraftMessage(guild, draft) {
  const channel = guild.channels.cache.get(DRAFT_CHANNEL_ID);
  if (!channel) return null;

  const embed = buildDraftEmbed(draft);

  if (draft.messageId) {
    const oldMessage = await channel.messages.fetch(draft.messageId).catch(() => null);
    if (oldMessage) {
      await oldMessage.edit({ embeds: [embed] });
      return oldMessage.id;
    }
  }

  const newMessage = await channel.send({ embeds: [embed] });
  return newMessage.id;
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
    .addUserOption(o => o.setName('mvp').setDescription('MVP of the match').setRequired(true))
    .addUserOption(o => o.setName('winner1').setDescription('Winner #1').setRequired(true))
    .addUserOption(o => o.setName('winner2').setDescription('Winner #2'))
    .addUserOption(o => o.setName('winner3').setDescription('Winner #3'))
    .addUserOption(o => o.setName('winner4').setDescription('Winner #4'))
    .addUserOption(o => o.setName('winner5').setDescription('Winner #5'))
    .addRoleOption(o => o.setName('champion_role').setDescription('Tournament champion role'))
    .addIntegerOption(o => o.setName('currency').setDescription('Noctaly coins to award each winner').setMinValue(0))
    .addStringOption(o => o.setName('notes').setDescription('Optional match notes')),

  new SlashCommandBuilder()
    .setName('draft-create')
    .setDescription('Create a draft with captains')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addStringOption(o => o.setName('name').setDescription('Draft or tournament name').setRequired(true))
    .addStringOption(o => o.setName('format').setDescription('Draft format').setRequired(true)
      .addChoices(
        { name: '1v1', value: '1v1' },
        { name: '2v2', value: '2v2' },
        { name: '3v3', value: '3v3' },
        { name: '4v4', value: '4v4' },
        { name: '5v5', value: '5v5' },
      ))
    .addIntegerOption(o => o.setName('teams').setDescription('Number of teams').setRequired(true).setMinValue(2).setMaxValue(8))
    .addUserOption(o => o.setName('captain1').setDescription('Captain 1').setRequired(true))
    .addUserOption(o => o.setName('captain2').setDescription('Captain 2').setRequired(true))
    .addUserOption(o => o.setName('captain3').setDescription('Captain 3'))
    .addUserOption(o => o.setName('captain4').setDescription('Captain 4'))
    .addUserOption(o => o.setName('captain5').setDescription('Captain 5'))
    .addUserOption(o => o.setName('captain6').setDescription('Captain 6'))
    .addUserOption(o => o.setName('captain7').setDescription('Captain 7'))
    .addUserOption(o => o.setName('captain8').setDescription('Captain 8')),

  new SlashCommandBuilder()
    .setName('draft-pick')
    .setDescription('Add a player pick to a draft team')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addIntegerOption(o => o.setName('team').setDescription('Team number').setRequired(true).setMinValue(1).setMaxValue(8))
    .addUserOption(o => o.setName('player').setDescription('Player being picked').setRequired(true)),

  new SlashCommandBuilder()
    .setName('draft-show')
    .setDescription('Show the current draft teams'),

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

  if (interaction.commandName === 'draft-create') {
    await interaction.deferReply({ ephemeral: true });

    const name = interaction.options.getString('name');
    const format = interaction.options.getString('format');
    const teamCount = interaction.options.getInteger('teams');
    const maxPlayers = Number(format[0]);

    const captainUsers = [];
    for (let i = 1; i <= 8; i++) {
      const captain = interaction.options.getUser(`captain${i}`);
      if (captain) captainUsers.push(captain);
    }

    if (captainUsers.length < teamCount) {
      await interaction.editReply(`❌ You selected ${teamCount} teams but only gave ${captainUsers.length} captains.`);
      return;
    }

    const draft = {
      name,
      format,
      teamCount,
      maxPlayers,
      messageId: null,
      teams: captainUsers.slice(0, teamCount).map((captain, index) => ({
        number: index + 1,
        players: [captain.id],
      })),
    };

    const drafts = readJson(DRAFT_FILE);
    drafts[interaction.guild.id] = draft;

    const messageId = await updateDraftMessage(interaction.guild, draft);
    drafts[interaction.guild.id].messageId = messageId;

    writeJson(DRAFT_FILE, drafts);

    await interaction.editReply(`✅ Draft created and posted with ${teamCount} teams.`);
    return;
  }

  if (interaction.commandName === 'draft-pick') {
    await interaction.deferReply({ ephemeral: true });

    const teamNumber = interaction.options.getInteger('team');
    const player = interaction.options.getUser('player');

    const drafts = readJson(DRAFT_FILE);
    const draft = drafts[interaction.guild.id];

    if (!draft) {
      await interaction.editReply('❌ No active draft found. Use `/draft-create` first.');
      return;
    }

    const team = draft.teams.find(t => t.number === teamNumber);

    if (!team) {
      await interaction.editReply('❌ That team does not exist in this draft.');
      return;
    }

    const alreadyPicked = draft.teams.some(t => t.players.includes(player.id));

    if (alreadyPicked) {
      await interaction.editReply('❌ That player is already on a team.');
      return;
    }

    if (team.players.length >= draft.maxPlayers) {
      await interaction.editReply(`❌ Team ${teamNumber} is already full.`);
      return;
    }

    team.players.push(player.id);

    const messageId = await updateDraftMessage(interaction.guild, draft);
    draft.messageId = messageId;

    drafts[interaction.guild.id] = draft;
    writeJson(DRAFT_FILE, drafts);

    await interaction.editReply(`✅ Added ${player.username} to Team ${teamNumber}.`);
    return;
  }

  if (interaction.commandName === 'draft-show') {
    const drafts = readJson(DRAFT_FILE);
    const draft = drafts[interaction.guild.id];

    if (!draft) {
      await interaction.reply({ content: '❌ No active draft found.', ephemeral: true });
      return;
    }

    await interaction.reply({ embeds: [buildDraftEmbed(draft)] });
    return;
  }

  if (interaction.commandName === 'declare-winner') {
    await interaction.deferReply({ ephemeral: true });

    const gameTypeName = interaction.options.getString('gametype');
    const format = interaction.options.getString('format');
    const currency = interaction.options.getInteger('currency') ?? 0;
    const notes = interaction.options.getString('notes') ?? '';
    const championRole = interaction.options.getRole('champion_role');
    const mvpUser = interaction.options.getUser('mvp');
    const isTournament = format.includes('tournament');
    const trophyRole = interaction.guild.roles.cache.find(r => r.name === 'Draft Winner');

    const winnerUsers = [1, 2, 3, 4, 5]
      .map(n => interaction.options.getUser(`winner${n}`))
      .filter(Boolean);

    const stats = readJson(STATS_FILE);

    for (const u of winnerUsers) {
      if (!stats[u.id]) stats[u.id] = { wins: 0, mvps: 0 };
      stats[u.id].wins += 1;

      const member = await interaction.guild.members.fetch(u.id).catch(() => null);

      if (member) {
        if (trophyRole) await member.roles.add(trophyRole).catch(console.error);
        await updateStatRoles(member, stats);
      }
    }

    if (!stats[mvpUser.id]) stats[mvpUser.id] = { wins: 0, mvps: 0 };
    stats[mvpUser.id].mvps += 1;

    const mvpMember = await interaction.guild.members.fetch(mvpUser.id).catch(() => null);
    if (mvpMember) await updateStatRoles(mvpMember, stats);

    writeJson(STATS_FILE, stats);
    await updateScoreboard(interaction.guild, stats);

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
            trophyRole ? { name: '🛡️ Draft Winner Role', value: trophyRole.toString(), inline: true } : null,
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
      trophyRole ? `🛡️ **Draft Winner** role assigned to all winners` : `⚠️ Draft Winner role was not found`,
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