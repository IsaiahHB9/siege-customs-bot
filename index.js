const fs = require('fs');
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const RESULTS_CHANNEL_ID = process.env.RESULTS_CHANNEL_ID;
const SCOREBOARD_CHANNEL_ID = process.env.SCOREBOARD_CHANNEL_ID;
const DRAFT_CHANNEL_ID = process.env.DRAFT_CHANNEL_ID;
const KILL_LEADERS_CHANNEL_ID = process.env.KILL_LEADERS_CHANNEL_ID;

const STATS_FILE = './stats.json';
const DRAFT_FILE = './drafts.json';
const MAPBAN_FILE = './mapbans.json';
const ECONOMY_FILE = './economy.json';
const INVENTORY_FILE = './inventory.json';

const CURRENCY_NAME = 'MatchCoins';

const MAP_POOL = [
  'Oregon',
  'Consulate',
  'Chalet',
  'Bank',
  'Clubhouse',
  'Kafe Dostoyevsky',
  'Lair',
  'Skyscraper',
  'Nighthaven Labs',
  'Border',
];

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

const SINGLE_GAME_KILL_ROLES = {
  10: '10 Kills',
  15: '15 Kills',
  20: '20 Kills',
  30: '30 Kills',
};

const RARITY = {
  Common: { color: 0x808080, emoji: '⚪' },
  Rare: { color: 0x22C55E, emoji: '🟢' },
  Epic: { color: 0xA855F7, emoji: '🟣' },
  Mythic: { color: 0xEF4444, emoji: '🔴' },

  Celestial: {
    color: 0x2DD4BF,
    emoji: '<:celestial:1515670072834785330>'
  },

  Contraband: {
    color: 0xB45309,
    emoji: '<:contraband:1515670136793731134>'
  },

  Unobtainable: {
    color: 0xFF00FF,
    emoji: '<:unobtainable:1515670220142809119>'
  },
};

const CHESTS = {
  common_crate: {
    id: 'common_crate',
    name: 'Common Crate',
    price: 250,
    rarity: 'Common',
    drops: 5,
    dropRates: [
      { rarity: 'Common', chance: 80 },
      { rarity: 'Rare', chance: 18 },
      { rarity: 'Epic', chance: 2 },
    ],
  },
  rare_crate: {
    id: 'rare_crate',
    name: 'Rare Crate',
    price: 750,
    rarity: 'Rare',
    drops: 5,
    dropRates: [
      { rarity: 'Rare', chance: 75 },
      { rarity: 'Epic', chance: 20 },
      { rarity: 'Mythic', chance: 5 },
    ],
  },
  epic_crate: {
    id: 'epic_crate',
    name: 'Epic Crate',
    price: 2000,
    rarity: 'Epic',
    drops: 5,
    dropRates: [
      { rarity: 'Epic', chance: 70 },
      { rarity: 'Mythic', chance: 25 },
      { rarity: 'Celestial', chance: 5 },
    ],
  },
  mythic_crate: {
    id: 'mythic_crate',
    name: 'Mythic Crate',
    price: 5000,
    rarity: 'Mythic',
    drops: 5,
    dropRates: [
      { rarity: 'Mythic', chance: 70 },
      { rarity: 'Celestial', chance: 25 },
      { rarity: 'Contraband', chance: 5 },
    ],
  },
  celestial_crate: {
    id: 'celestial_crate',
    name: 'Celestial Crate',
    price: 12500,
    rarity: 'Celestial',
    drops: 5,
    dropRates: [
      { rarity: 'Celestial', chance: 80 },
      { rarity: 'Contraband', chance: 19 },
      { rarity: 'Unobtainable', chance: 1 },
    ],
  },
  ultimate_crate: {
    id: 'ultimate_crate',
    name: 'Ultimate Crate',
    price: 30000,
    rarity: 'Unobtainable',
    drops: 5,
    dropRates: [
      { rarity: 'Mythic', chance: 55 },
      { rarity: 'Celestial', chance: 30 },
      { rarity: 'Contraband', chance: 14.5 },
      { rarity: 'Unobtainable', chance: 0.5 },
    ],
  },
};

const SHOP_ITEMS = {
  common_crate: {
    id: 'common_crate',
    name: 'Common Crate',
    rarity: 'Common',
    price: 250,
    description: 'Opens 5 items with a chance at Common, Rare, or Epic rewards.',
    buyable: true,
    chestOnly: false,
    giftable: true,
    type: 'crate',
    image: null,
  },
  rare_crate: {
    id: 'rare_crate',
    name: 'Rare Crate',
    rarity: 'Rare',
    price: 750,
    description: 'Opens 5 items with better odds and a chance at Mythic rewards.',
    buyable: true,
    chestOnly: false,
    giftable: true,
    type: 'crate',
    image: null,
  },
  epic_crate: {
    id: 'epic_crate',
    name: 'Epic Crate',
    rarity: 'Epic',
    price: 2000,
    description: 'Opens 5 items with a chance at Mythic and Celestial rewards.',
    buyable: true,
    chestOnly: false,
    giftable: true,
    type: 'crate',
    image: null,
  },
  mythic_crate: {
    id: 'mythic_crate',
    name: 'Mythic Crate',
    rarity: 'Mythic',
    price: 5000,
    description: 'Opens 5 high-tier items. Cannot pull Unobtainables.',
    buyable: true,
    chestOnly: false,
    giftable: true,
    type: 'crate',
    image: null,
  },
  celestial_crate: {
    id: 'celestial_crate',
    name: 'Celestial Crate',
    rarity: 'Celestial',
    price: 12500,
    description: 'Opens 5 elite items with a small chance at Unobtainable rewards.',
    buyable: true,
    chestOnly: false,
    giftable: true,
    type: 'crate',
    image: null,
  },
  ultimate_crate: {
    id: 'ultimate_crate',
    name: 'Ultimate Crate',
    rarity: 'Unobtainable',
    price: 30000,
    description: 'Opens 5 items from Mythic or higher with a 0.5% Unobtainable pull chance.',
    buyable: true,
    chestOnly: false,
    giftable: false,
    type: 'crate',
    image: null,
  },

  coin_stack: {
    id: 'coin_stack',
    name: 'MatchCoin Stack',
    rarity: 'Common',
    price: 500,
    description: 'Chest item redeemable for 300 MatchCoins.',
    buyable: false,
    chestOnly: true,
    giftable: true,
    type: 'coin',
    coinValue: 300,
    image: null,
  },
  small_boost: {
    id: 'small_boost',
    name: 'Small Reward Boost',
    rarity: 'Common',
    price: 800,
    description: 'A small reward item used for staff-approved event bonuses.',
    buyable: true,
    chestOnly: false,
    giftable: true,
    type: 'booster',
    image: null,
  },
  draft_ticket: {
    id: 'draft_ticket',
    name: 'Draft Entry Ticket',
    rarity: 'Common',
    price: 1000,
    description: 'A ticket that can be used for draft entry or event access.',
    buyable: true,
    chestOnly: false,
    giftable: true,
    type: 'ticket',
    image: null,
  },

  rare_coin_bag: {
    id: 'rare_coin_bag',
    name: 'Rare Coin Bag',
    rarity: 'Rare',
    price: 2500,
    description: 'Chest item redeemable for 1,500 MatchCoins.',
    buyable: false,
    chestOnly: true,
    giftable: true,
    type: 'coin',
    coinValue: 1500,
    image: null,
  },
  captain_priority_pass: {
    id: 'captain_priority_pass',
    name: 'Captain Priority Pass',
    rarity: 'Rare',
    price: 5000,
    description: 'Grants the Captain Priority role.',
    buyable: true,
    chestOnly: false,
    giftable: false,
    type: 'role',
    roleName: 'Captain Priority',
    image: null,
  },
  vip_voice_pass: {
    id: 'vip_voice_pass',
    name: 'VIP Voice Pass',
    rarity: 'Rare',
    price: 6500,
    description: 'Grants the VIP Voice Access role.',
    buyable: true,
    chestOnly: false,
    giftable: false,
    type: 'role',
    roleName: 'VIP Voice Access',
    image: null,
  },

  epic_coin_vault: {
    id: 'epic_coin_vault',
    name: 'Epic Coin Vault',
    rarity: 'Epic',
    price: 15000,
    description: 'Chest item redeemable for 8,000 MatchCoins.',
    buyable: false,
    chestOnly: true,
    giftable: true,
    type: 'coin',
    coinValue: 8000,
    image: null,
  },
  elite_draft_token: {
    id: 'elite_draft_token',
    name: 'Elite Draft Token',
    rarity: 'Epic',
    price: 20000,
    description: 'Grants the Elite Draft Access role.',
    buyable: true,
    chestOnly: false,
    giftable: false,
    type: 'role',
    roleName: 'Elite Draft Access',
    image: null,
  },
  premium_tournament_ticket: {
    id: 'premium_tournament_ticket',
    name: 'Premium Tournament Ticket',
    rarity: 'Epic',
    price: 25000,
    description: 'Grants the Premium Tournament Access role.',
    buyable: true,
    chestOnly: false,
    giftable: false,
    type: 'role',
    roleName: 'Premium Tournament Access',
    image: null,
  },
    mythic_reward_contract: {
    id: 'mythic_reward_contract',
    name: 'Mythic Reward Contract',
    rarity: 'Mythic',
    price: 75000,
    description: 'A high-value contract used for staff-approved event rewards.',
    buyable: true,
    chestOnly: false,
    giftable: false,
    type: 'contract',
    image: null,
  },
  matchpoint_elite_pass: {
    id: 'matchpoint_elite_pass',
    name: 'Matchpoint Elite Pass',
    rarity: 'Mythic',
    price: 100000,
    description: 'Grants the Matchpoint Elite role.',
    buyable: true,
    chestOnly: false,
    giftable: false,
    type: 'role',
    roleName: 'Matchpoint Elite',
    image: null,
  },
  mythic_coin_reserve: {
    id: 'mythic_coin_reserve',
    name: 'Mythic Coin Reserve',
    rarity: 'Mythic',
    price: 125000,
    description: 'Chest item redeemable for 50,000 MatchCoins.',
    buyable: false,
    chestOnly: true,
    giftable: true,
    type: 'coin',
    coinValue: 50000,
    image: null,
  },

  celestial_treasury: {
    id: 'celestial_treasury',
    name: 'Celestial Treasury',
    rarity: 'Celestial',
    price: 250000,
    description: 'Chest item redeemable for 100,000 MatchCoins.',
    buyable: false,
    chestOnly: true,
    giftable: true,
    type: 'coin',
    coinValue: 100000,
    image: null,
  },
  legacy_holder_pass: {
    id: 'legacy_holder_pass',
    name: 'Legacy Holder Pass',
    rarity: 'Celestial',
    price: 300000,
    description: 'Grants the Legacy Holder role.',
    buyable: true,
    chestOnly: false,
    giftable: false,
    type: 'role',
    roleName: 'Legacy Holder',
    image: null,
  },
  reigning_legend_claim: {
    id: 'reigning_legend_claim',
    name: 'Reigning Legend Claim',
    rarity: 'Celestial',
    price: 500000,
    description: 'Grants the Reigning Legend role.',
    buyable: true,
    chestOnly: false,
    giftable: false,
    type: 'role',
    roleName: 'Reigning Legend',
    image: null,
  },

  black_market_contract: {
    id: 'black_market_contract',
    name: 'Black Market Contract',
    rarity: 'Contraband',
    price: 0,
    description: 'Chest-only item. Can be redeemed with staff for any Mythic shop item.',
    buyable: false,
    chestOnly: true,
    giftable: false,
    type: 'contract',
    image: null,
  },
  forbidden_sponsor: {
    id: 'forbidden_sponsor',
    name: 'Forbidden Sponsor Contract',
    rarity: 'Contraband',
    price: 0,
    description: 'Chest-only item. Allows the holder to sponsor a special event reward.',
    buyable: false,
    chestOnly: true,
    giftable: false,
    type: 'contract',
    image: null,
  },
  matchpoint_artifact: {
    id: 'matchpoint_artifact',
    name: 'Matchpoint Artifact',
    rarity: 'Contraband',
    price: 0,
    description: 'Chest-only prestige item used for high-tier collection rewards.',
    buyable: false,
    chestOnly: true,
    giftable: true,
    type: 'collectible',
    image: null,
  },

  champions_decree: {
    id: 'champions_decree',
    name: "Champion's Decree",
    rarity: 'Unobtainable',
    price: 10000000,
    description: 'Can be redeemed for any Mythic or lower item. Extremely rare.',
    buyable: false,
    chestOnly: true,
    giftable: false,
    type: 'contract',
    image: null,
  },
  infinity_vault_key: {
    id: 'infinity_vault_key',
    name: 'Infinity Vault Key',
    rarity: 'Unobtainable',
    price: 15000000,
    description: 'A legendary key that can be redeemed with staff for multiple high-tier rewards.',
    buyable: false,
    chestOnly: true,
    giftable: false,
    type: 'contract',
    image: null,
  },
  eternal_matchpoint_relic: {
    id: 'eternal_matchpoint_relic',
    name: 'Eternal Matchpoint Relic',
    rarity: 'Unobtainable',
    price: 25000000,
    description: 'The rarest prestige item in the economy. Grants true legacy status.',
    buyable: false,
    chestOnly: true,
    giftable: false,
    type: 'collectible',
    image: null,
  },
};

function readJson(file) {
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getEconomy() {
  return readJson(ECONOMY_FILE);
}

function saveEconomy(data) {
  writeJson(ECONOMY_FILE, data);
}

function getInventory() {
  return readJson(INVENTORY_FILE);
}

function saveInventory(data) {
  writeJson(INVENTORY_FILE, data);
}

function ensureUserEconomy(economy, userId) {
  if (!economy[userId]) {
    economy[userId] = {
      balance: 0,
      lastDaily: 0,
      cratesOpened: 0,
    };
  }

  if (economy[userId].balance === undefined) economy[userId].balance = 0;
  if (economy[userId].lastDaily === undefined) economy[userId].lastDaily = 0;
  if (economy[userId].cratesOpened === undefined) economy[userId].cratesOpened = 0;
}

function ensureUserInventory(inventory, userId) {
  if (!inventory[userId]) inventory[userId] = {};
}

function addItem(inventory, userId, itemId, amount = 1) {
  ensureUserInventory(inventory, userId);
  if (!inventory[userId][itemId]) inventory[userId][itemId] = 0;
  inventory[userId][itemId] += amount;
}

function removeItem(inventory, userId, itemId, amount = 1) {
  ensureUserInventory(inventory, userId);

  if (!inventory[userId][itemId]) return false;
  if (inventory[userId][itemId] < amount) return false;

  inventory[userId][itemId] -= amount;

  if (inventory[userId][itemId] <= 0) {
    delete inventory[userId][itemId];
  }

  return true;
}

function formatCoins(amount) {
  return `${amount.toLocaleString()} ${CURRENCY_NAME}`;
}

function getRarityData(rarity) {
  return RARITY[rarity] ?? RARITY.Common;
}

function getBuyableItems() {
  return Object.values(SHOP_ITEMS).filter(item => item.buyable);
}

function getChestDropItems(rarity) {
  return Object.values(SHOP_ITEMS).filter(item => item.rarity === rarity && item.chestOnly);
}

function rollRarity(dropRates) {
  const total = dropRates.reduce((sum, drop) => sum + drop.chance, 0);
  let roll = Math.random() * total;

  for (const drop of dropRates) {
    if (roll < drop.chance) return drop.rarity;
    roll -= drop.chance;
  }

  return dropRates[0].rarity;
}

function rollItemFromChest(chest) {
  const rarity = rollRarity(chest.dropRates);
  const possibleItems = getChestDropItems(rarity);

  if (possibleItems.length > 0) {
    return possibleItems[Math.floor(Math.random() * possibleItems.length)];
  }

  const fallback = Object.values(SHOP_ITEMS).filter(item => item.rarity === rarity);

  if (fallback.length === 0) return null;

  return fallback[Math.floor(Math.random() * fallback.length)];
}

async function applyItemReward(member, item) {
  if (!member || !item) return;

  if (item.type === 'role' && item.roleName) {
    const role = member.guild.roles.cache.find(r => r.name === item.roleName);
    if (role) await member.roles.add(role).catch(console.error);
  }
}
function buildShopEmbed() {
  const embed = new EmbedBuilder()
    .setColor(0xF97316)
    .setTitle('🛒 Matchpoint Shop')
    .setDescription(`Use \`/buy item_id\` to purchase items with ${CURRENCY_NAME}.`)
    .setTimestamp();

  const rarityOrder = [
    'Common',
    'Rare',
    'Epic',
    'Mythic',
    'Celestial',
    'Contraband',
    'Unobtainable'
  ];

  for (const rarity of rarityOrder) {
    const items = Object.values(SHOP_ITEMS)
      .filter(item => item.buyable && item.rarity === rarity);

    if (!items.length) continue;

    const rarityData = getRarityData(rarity);

    embed.addFields({
      name: `${rarityData.emoji} ${rarity}`,
      value: items.map(item =>
        `**${item.name}** (\`${item.id}\`)\n${formatCoins(item.price)}\n${item.description}`
      ).join('\n\n'),
      inline: false
    });
  }

  return embed;
}

function buildInventoryEmbed(user, inventory) {
  ensureUserInventory(inventory, user.id);

  const embed = new EmbedBuilder()
    .setColor(0xF97316)
    .setTitle(`🎒 ${user.username}'s Inventory`)
    .setTimestamp();

  const items = Object.entries(inventory[user.id]);

  if (!items.length) {
    embed.setDescription('No items owned.');
    return embed;
  }

  const rarityOrder = [
    'Common',
    'Rare',
    'Epic',
    'Mythic',
    'Celestial',
    'Contraband',
    'Unobtainable'
  ];

  for (const rarity of rarityOrder) {
    const owned = items
      .map(([id, amount]) => ({
        item: SHOP_ITEMS[id],
        amount
      }))
      .filter(entry => entry.item && entry.item.rarity === rarity);

    if (!owned.length) continue;

    const rarityData = getRarityData(rarity);

    embed.addFields({
      name: `${rarityData.emoji} ${rarity}`,
      value: owned.map(entry =>
        `**${entry.item.name}** x${entry.amount}`
      ).join('\n'),
      inline: false
    });
  }

  return embed;
}

function buildHelpEmbed() {
  return new EmbedBuilder()
    .setColor(0xF97316)
    .setTitle('📘 Matchpoint Commands')
    .setDescription('Commands available to all members.')
    .addFields(
      {
        name: '/balance',
        value: 'View MatchCoins balance.',
        inline: false
      },
      {
        name: '/profile',
        value: 'View your Matchpoint profile.',
        inline: false
      },
      {
        name: '/show-shop',
        value: 'View every item available in the shop.',
        inline: false
      },
      {
        name: '/inventory',
        value: 'View your inventory.',
        inline: false
      },
      {
        name: '/buy',
        value: 'Purchase an item.',
        inline: false
      },
      {
        name: '/gift',
        value: 'Gift eligible items to another user.',
        inline: false
      },
      {
        name: '/open-crate',
        value: 'Open a crate and receive 5 rewards.',
        inline: false
      },
      {
        name: '/daily',
        value: 'Claim daily MatchCoins.',
        inline: false
      },
      {
        name: '/rewards',
        value: 'View reward values and crate odds.',
        inline: false
      }
    )
    .setTimestamp();
}

function buildRewardsEmbed() {
  const embed = new EmbedBuilder()
    .setColor(0xF97316)
    .setTitle('🏆 Matchpoint Rewards')
    .setDescription('Draft rewards, tournament rewards, and crate odds.')
    .setTimestamp();

  embed.addFields(
    {
      name: '🎮 Draft Rewards',
      value:
        '1v1 Win — 500\n' +
        '2v2 Win — 750\n' +
        '3v3 Win — 1000\n' +
        '5v5 Win — 2000\n' +
        'MVP Bonus — 500-1000',
      inline: false
    },
    {
      name: '👑 Tournament Rewards',
      value:
        'Small Tournament — 5000\n' +
        '8 Team Tournament — 15,000\n' +
        '16 Team Tournament — 30,000',
      inline: false
    }
  );

  for (const chest of Object.values(CHESTS)) {
    embed.addFields({
      name: `📦 ${chest.name}`,
      value:
        `Price: ${formatCoins(chest.price)}\n` +
        chest.dropRates
          .map(drop => `${drop.rarity}: ${drop.chance}%`)
          .join('\n'),
      inline: true
    });
  }

  return embed;
}

function buildProfileEmbed(user, economy, inventory, stats) {
  ensureUserEconomy(economy, user.id);
  ensureUserInventory(inventory, user.id);

  const statData = stats[user.id] || {
    wins: 0,
    mvps: 0,
    kills: 0
  };

  const itemCount = Object.values(inventory[user.id])
    .reduce((a, b) => a + b, 0);

  return new EmbedBuilder()
    .setColor(0xF97316)
    .setTitle(`👤 ${user.username}`)
    .addFields(
      {
        name: `💰 ${CURRENCY_NAME}`,
        value: formatCoins(economy[user.id].balance),
        inline: true
      },
      {
        name: '🏆 Wins',
        value: `${statData.wins}`,
        inline: true
      },
      {
        name: '⭐ MVPs',
        value: `${statData.mvps}`,
        inline: true
      },
      {
        name: '🔫 Kills',
        value: `${statData.kills}`,
        inline: true
      },
      {
        name: '🎒 Inventory Items',
        value: `${itemCount}`,
        inline: true
      },
      {
        name: '📦 Crates Opened',
        value: `${economy[user.id].cratesOpened}`,
        inline: true
      }
    )
    .setTimestamp();
}
function buildScoreboard(stats) {
  const rows = Object.entries(stats)
    .filter(([id, data]) =>
      id !== 'scoreboardMessageId' &&
      id !== 'killLeadersMessageId' &&
      (data.wins > 0 || data.mvps > 0)
    )
    .sort((a, b) =>
      (b[1].wins ?? 0) - (a[1].wins ?? 0) ||
      (b[1].mvps ?? 0) - (a[1].mvps ?? 0)
    )
    .slice(0, 20);

  if (!rows.length) return 'No stats recorded yet.';

  return rows
    .map(([id, data], index) =>
      `**#${index + 1}** <@${id}> — 🏆 ${data.wins ?? 0} wins | ⭐ ${data.mvps ?? 0} MVPs`
    )
    .join('\n');
}

function buildKillLeaders(stats) {
  const rows = Object.entries(stats)
    .filter(([id, data]) =>
      id !== 'scoreboardMessageId' &&
      id !== 'killLeadersMessageId' &&
      (data.kills ?? 0) > 0
    )
    .sort((a, b) => (b[1].kills ?? 0) - (a[1].kills ?? 0))
    .slice(0, 20);

  if (!rows.length) return 'No kills recorded yet.';

  return rows
    .map(([id, data], index) =>
      `**#${index + 1}** <@${id}> — 🔫 ${data.kills ?? 0} kills`
    )
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
    const oldMessage = await channel.messages
      .fetch(stats.scoreboardMessageId)
      .catch(() => null);

    if (oldMessage) {
      await oldMessage.edit({ embeds: [embed] });
      return;
    }
  }

  const newMessage = await channel.send({ embeds: [embed] });
  stats.scoreboardMessageId = newMessage.id;
  writeJson(STATS_FILE, stats);
}

async function updateKillLeaders(guild, stats) {
  const channel = guild.channels.cache.get(KILL_LEADERS_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0xF97316)
    .setTitle('🔫 Kill Leaders')
    .setDescription(buildKillLeaders(stats))
    .setFooter({ text: 'Updates automatically after every declared match' })
    .setTimestamp();

  if (stats.killLeadersMessageId) {
    const oldMessage = await channel.messages
      .fetch(stats.killLeadersMessageId)
      .catch(() => null);

    if (oldMessage) {
      await oldMessage.edit({ embeds: [embed] });
      return;
    }
  }

  const newMessage = await channel.send({ embeds: [embed] });
  stats.killLeadersMessageId = newMessage.id;
  writeJson(STATS_FILE, stats);
}

async function updateKillerOfChampionsRole(guild, stats) {
  const role = guild.roles.cache.find(r => r.name === 'Killer of Champions');
  if (!role) return;

  const entries = Object.entries(stats)
    .filter(([id, data]) =>
      id !== 'scoreboardMessageId' &&
      id !== 'killLeadersMessageId' &&
      (data.kills ?? 0) > 0
    )
    .sort((a, b) => (b[1].kills ?? 0) - (a[1].kills ?? 0));

  if (!entries.length) return;

  const topId = entries[0][0];

  await guild.members.fetch().catch(() => null);

  const holders = guild.members.cache.filter(member =>
    member.roles.cache.has(role.id)
  );

  for (const [, member] of holders) {
    if (member.id !== topId) {
      await member.roles.remove(role).catch(console.error);
    }
  }

  const topMember = await guild.members.fetch(topId).catch(() => null);
  if (topMember) await topMember.roles.add(role).catch(console.error);
}

async function updateStatRoles(member, stats) {
  const winCount = stats[member.id]?.wins ?? 0;
  const mvpCount = stats[member.id]?.mvps ?? 0;

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

async function updateSingleGameKillRoles(member, kills) {
  for (const amount in SINGLE_GAME_KILL_ROLES) {
    if (kills >= Number(amount)) {
      const role = member.guild.roles.cache.find(r => r.name === SINGLE_GAME_KILL_ROLES[amount]);
      if (role) await member.roles.add(role).catch(console.error);
    }
  }
}

function buildDraftEmbed(draft) {
  const embed = new EmbedBuilder()
    .setColor(0xF97316)
    .setTitle(`📋 ${draft.name}`)
    .setDescription(
      `**Format:** ${draft.format.toUpperCase()} | **Teams:** ${draft.teamCount} | **Max Players Per Team:** ${draft.maxPlayers}`
    )
    .setFooter({ text: 'Updates automatically as picks are added' })
    .setTimestamp();

  for (const team of draft.teams) {
    const players = team.players
      .map((id, index) => {
        if (index === 0) return `👑 <@${id}>`;
        return `• <@${id}>`;
      })
      .join('\n');

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
    const oldMessage = await channel.messages
      .fetch(draft.messageId)
      .catch(() => null);

    if (oldMessage) {
      await oldMessage.edit({ embeds: [embed] });
      return oldMessage.id;
    }
  }

  const newMessage = await channel.send({ embeds: [embed] });
  return newMessage.id;
}

function buildMapBanEmbed(mapban) {
  const bannedMaps = [...mapban.team1.bans, ...mapban.team2.bans];
  const availableMaps = MAP_POOL.filter(map => !bannedMaps.includes(map));

  return new EmbedBuilder()
    .setColor(0xF97316)
    .setTitle(`🗺️ Map Bans — ${mapban.name}`)
    .setDescription('Each captain may ban up to **3 maps**.')
    .addFields(
      { name: 'Team 1 Captain', value: `<@${mapban.team1.captain}>`, inline: true },
      { name: 'Team 2 Captain', value: `<@${mapban.team2.captain}>`, inline: true },
      {
        name: 'Team 1 Bans',
        value: mapban.team1.bans.length
          ? mapban.team1.bans.map(map => `• ${map}`).join('\n')
          : 'No bans yet',
        inline: true,
      },
      {
        name: 'Team 2 Bans',
        value: mapban.team2.bans.length
          ? mapban.team2.bans.map(map => `• ${map}`).join('\n')
          : 'No bans yet',
        inline: true,
      },
      {
        name: 'Available Maps',
        value: availableMaps.length
          ? availableMaps.map(map => `• ${map}`).join('\n')
          : 'No maps available',
        inline: false,
      }
    )
    .setFooter({ text: 'Updates automatically as maps are banned' })
    .setTimestamp();
}

async function updateMapBanMessage(guild, mapban) {
  const channel = guild.channels.cache.get(DRAFT_CHANNEL_ID);
  if (!channel) return null;

  const embed = buildMapBanEmbed(mapban);

  if (mapban.messageId) {
    const oldMessage = await channel.messages
      .fetch(mapban.messageId)
      .catch(() => null);

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
    .addStringOption(o => o.setName('host').setDescription('Host name').setRequired(true))
    .addStringOption(o => o.setName('format').setDescription('Match format').setRequired(true)
      .addChoices(
        { name: '1v1 Tournament', value: '1v1_tournament' },
        { name: '2v2 Best of One', value: '2v2_bo1' },
        { name: '3v3 Best of One', value: '3v3_bo1' },
        { name: '4v4 Best of One', value: '4v4_bo1' },
        { name: '5v5 Best of One', value: '5v5_bo1' },
        { name: '5v5 Tournament', value: '5v5_tournament' }
      ))
    .addUserOption(o => o.setName('mvp').setDescription('MVP of the match').setRequired(true))
    .addUserOption(o => o.setName('winner1').setDescription('Winner #1').setRequired(true))
    .addUserOption(o => o.setName('winner2').setDescription('Winner #2'))
    .addUserOption(o => o.setName('winner3').setDescription('Winner #3'))
    .addUserOption(o => o.setName('winner4').setDescription('Winner #4'))
    .addUserOption(o => o.setName('winner5').setDescription('Winner #5'))
    .addRoleOption(o => o.setName('champion_role').setDescription('Tournament champion role'))
    .addIntegerOption(o => o.setName('currency').setDescription('MatchCoins to award each winner').setMinValue(0))
    .addStringOption(o => o.setName('notes').setDescription('Optional match notes')),

  new SlashCommandBuilder()
    .setName('record-kills')
    .setDescription('Record kills for players')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption(o => o.setName('player1').setDescription('Player').setRequired(true))
    .addIntegerOption(o => o.setName('kills1').setDescription('Kills').setRequired(true))
    .addUserOption(o => o.setName('player2').setDescription('Player'))
    .addIntegerOption(o => o.setName('kills2').setDescription('Kills'))
    .addUserOption(o => o.setName('player3').setDescription('Player'))
    .addIntegerOption(o => o.setName('kills3').setDescription('Kills'))
    .addUserOption(o => o.setName('player4').setDescription('Player'))
    .addIntegerOption(o => o.setName('kills4').setDescription('Kills'))
    .addUserOption(o => o.setName('player5').setDescription('Player'))
    .addIntegerOption(o => o.setName('kills5').setDescription('Kills'))
    .addUserOption(o => o.setName('player6').setDescription('Player'))
    .addIntegerOption(o => o.setName('kills6').setDescription('Kills'))
    .addUserOption(o => o.setName('player7').setDescription('Player'))
    .addIntegerOption(o => o.setName('kills7').setDescription('Kills'))
    .addUserOption(o => o.setName('player8').setDescription('Player'))
    .addIntegerOption(o => o.setName('kills8').setDescription('Kills'))
    .addUserOption(o => o.setName('player9').setDescription('Player'))
    .addIntegerOption(o => o.setName('kills9').setDescription('Kills'))
    .addUserOption(o => o.setName('player10').setDescription('Player'))
    .addIntegerOption(o => o.setName('kills10').setDescription('Kills')),

  new SlashCommandBuilder()
    .setName('remove-stats')
    .setDescription('Remove wins, MVPs, or kills from a user')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption(o => o.setName('user').setDescription('User to edit').setRequired(true))
    .addStringOption(o => o.setName('stat').setDescription('Stat to remove').setRequired(true)
      .addChoices(
        { name: 'Wins', value: 'wins' },
        { name: 'MVPs', value: 'mvps' },
        { name: 'Kills', value: 'kills' }
      ))
    .addIntegerOption(o => o.setName('amount').setDescription('Amount to remove').setRequired(true).setMinValue(1)),

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
        { name: '5v5', value: '5v5' }
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
    .setName('mapban-create')
    .setDescription('Create a map ban board')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addStringOption(o => o.setName('name').setDescription('Match or tournament name').setRequired(true))
    .addUserOption(o => o.setName('team1_captain').setDescription('Team 1 captain').setRequired(true))
    .addUserOption(o => o.setName('team2_captain').setDescription('Team 2 captain').setRequired(true)),

  new SlashCommandBuilder()
    .setName('mapban-ban')
    .setDescription('Ban a map for a team')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addIntegerOption(o => o.setName('team').setDescription('Team banning the map').setRequired(true).setMinValue(1).setMaxValue(2))
    .addStringOption(o => o.setName('map').setDescription('Map to ban').setRequired(true)
      .addChoices(...MAP_POOL.map(map => ({ name: map, value: map })))),

  new SlashCommandBuilder()
    .setName('mapban-show')
    .setDescription('Show the current map ban board'),

  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the leaderboard'),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show public Matchpoint commands'),

  new SlashCommandBuilder()
    .setName('balance')
    .setDescription('View MatchCoins balance')
    .addUserOption(o => o.setName('user').setDescription('User to check')),

  new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View a Matchpoint profile')
    .addUserOption(o => o.setName('user').setDescription('User to check')),

  new SlashCommandBuilder()
    .setName('show-shop')
    .setDescription('Show the MatchCoins shop'),

  new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('View inventory')
    .addUserOption(o => o.setName('user').setDescription('User to check')),

  new SlashCommandBuilder()
    .setName('rewards')
    .setDescription('Show rewards and chest odds'),

  new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim daily MatchCoins'),

  new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy an item')
    .addStringOption(o => o.setName('item_id').setDescription('Item ID').setRequired(true)),

  new SlashCommandBuilder()
    .setName('gift')
    .setDescription('Gift an item to another user')
    .addUserOption(o => o.setName('user').setDescription('User receiving the item').setRequired(true))
    .addStringOption(o => o.setName('item_id').setDescription('Item ID').setRequired(true)),

  new SlashCommandBuilder()
    .setName('open-crate')
    .setDescription('Open a crate from your inventory')
    .addStringOption(o => o.setName('crate_id').setDescription('Crate ID').setRequired(true)),

  new SlashCommandBuilder()
    .setName('add-money')
    .setDescription('Add MatchCoins to a user')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption(o => o.setName('user').setDescription('User to pay').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true).setMinValue(1)),

  new SlashCommandBuilder()
    .setName('remove-money')
    .setDescription('Remove MatchCoins from a user')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption(o => o.setName('user').setDescription('User to edit').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true).setMinValue(1)),

  new SlashCommandBuilder()
    .setName('set-money')
    .setDescription('Set a user MatchCoins balance')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption(o => o.setName('user').setDescription('User to edit').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true).setMinValue(0)),

  new SlashCommandBuilder()
    .setName('give-item')
    .setDescription('Give an item to a user')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption(o => o.setName('user').setDescription('User receiving item').setRequired(true))
    .addStringOption(o => o.setName('item_id').setDescription('Item ID').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Amount').setMinValue(1)),

  new SlashCommandBuilder()
    .setName('remove-item')
    .setDescription('Remove an item from a user')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption(o => o.setName('user').setDescription('User losing item').setRequired(true))
    .addStringOption(o => o.setName('item_id').setDescription('Item ID').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Amount').setMinValue(1)),
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
  console.log(`Command used: ${interaction.commandName}`);

  if (interaction.commandName === 'help') {
    await interaction.reply({ embeds: [buildHelpEmbed()] });
    return;
  }

  if (interaction.commandName === 'balance') {
    const target = interaction.options.getUser('user') ?? interaction.user;
    const economy = getEconomy();

    ensureUserEconomy(economy, target.id);
    saveEconomy(economy);

    const embed = new EmbedBuilder()
      .setColor(0xF97316)
      .setTitle(`💰 ${target.username}'s Balance`)
      .setDescription(`**${formatCoins(economy[target.id].balance)}**`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    return;
  }

  if (interaction.commandName === 'profile') {
    const target = interaction.options.getUser('user') ?? interaction.user;
    const economy = getEconomy();
    const inventory = getInventory();
    const stats = readJson(STATS_FILE);

    const embed = buildProfileEmbed(target, economy, inventory, stats);

    saveEconomy(economy);
    saveInventory(inventory);

    await interaction.reply({ embeds: [embed] });
    return;
  }

  if (interaction.commandName === 'show-shop') {
    await interaction.reply({ embeds: [buildShopEmbed()] });
    return;
  }

  if (interaction.commandName === 'inventory') {
    const target = interaction.options.getUser('user') ?? interaction.user;
    const inventory = getInventory();

    ensureUserInventory(inventory, target.id);
    saveInventory(inventory);

    await interaction.reply({ embeds: [buildInventoryEmbed(target, inventory)] });
    return;
  }

  if (interaction.commandName === 'rewards') {
    await interaction.reply({ embeds: [buildRewardsEmbed()] });
    return;
  }

  if (interaction.commandName === 'daily') {
    const economy = getEconomy();
    const userId = interaction.user.id;
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;
    const dailyAmount = 750;

    ensureUserEconomy(economy, userId);

    if (now - economy[userId].lastDaily < cooldown) {
      const timeLeft = cooldown - (now - economy[userId].lastDaily);
      const hours = Math.ceil(timeLeft / 1000 / 60 / 60);

      await interaction.reply(`⏳ You already claimed your daily. Try again in about **${hours} hour(s)**.`);
      return;
    }

    economy[userId].balance += dailyAmount;
    economy[userId].lastDaily = now;

    saveEconomy(economy);

    await interaction.reply(`✅ You claimed **${formatCoins(dailyAmount)}**.`);
    return;
  }

  if (interaction.commandName === 'buy') {
    const itemId = interaction.options.getString('item_id');
    const item = SHOP_ITEMS[itemId];

    if (!item) {
      await interaction.reply('❌ Item not found. Use `/show-shop` to see item IDs.');
      return;
    }

    if (!item.buyable) {
      await interaction.reply(`❌ **${item.name}** cannot be bought from the shop.`);
      return;
    }

    const economy = getEconomy();
    const inventory = getInventory();
    const userId = interaction.user.id;

    ensureUserEconomy(economy, userId);
    ensureUserInventory(inventory, userId);

    if (economy[userId].balance < item.price) {
      await interaction.reply(`❌ You need **${formatCoins(item.price)}**, but you only have **${formatCoins(economy[userId].balance)}**.`);
      return;
    }

    economy[userId].balance -= item.price;
    addItem(inventory, userId, itemId, 1);

    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    if (member) await applyItemReward(member, item);

    saveEconomy(economy);
    saveInventory(inventory);

    const rarityData = getRarityData(item.rarity);

    const embed = new EmbedBuilder()
      .setColor(rarityData.color)
      .setTitle(`✅ Purchased ${item.name}`)
      .setDescription(`${rarityData.emoji} **${item.rarity}**\n${item.description}`)
      .addFields(
        { name: 'Price', value: formatCoins(item.price), inline: true },
        { name: 'New Balance', value: formatCoins(economy[userId].balance), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    return;
  }

  if (interaction.commandName === 'gift') {
    const target = interaction.options.getUser('user');
    const itemId = interaction.options.getString('item_id');
    const item = SHOP_ITEMS[itemId];

    if (!item) {
      await interaction.reply('❌ Item not found.');
      return;
    }

    if (!item.giftable) {
      await interaction.reply(`❌ **${item.name}** is not giftable.`);
      return;
    }

    if (target.bot) {
      await interaction.reply('❌ You cannot gift items to bots.');
      return;
    }

    if (target.id === interaction.user.id) {
      await interaction.reply('❌ You cannot gift an item to yourself.');
      return;
    }

    const inventory = getInventory();

    ensureUserInventory(inventory, interaction.user.id);
    ensureUserInventory(inventory, target.id);

    const removed = removeItem(inventory, interaction.user.id, itemId, 1);

    if (!removed) {
      await interaction.reply(`❌ You do not own **${item.name}**.`);
      return;
    }

    addItem(inventory, target.id, itemId, 1);
    saveInventory(inventory);

    await interaction.reply(`🎁 ${interaction.user} gifted **${item.name}** to ${target}.`);
    return;
  }

  if (interaction.commandName === 'open-crate') {
    const crateId = interaction.options.getString('crate_id');
    const chest = CHESTS[crateId];

    if (!chest) {
      await interaction.reply('❌ Crate not found. Use `/rewards` to see crate IDs.');
      return;
    }

    const economy = getEconomy();
    const inventory = getInventory();
    const userId = interaction.user.id;

    ensureUserEconomy(economy, userId);
    ensureUserInventory(inventory, userId);

    const removed = removeItem(inventory, userId, crateId, 1);

    if (!removed) {
      await interaction.reply(`❌ You do not own a **${chest.name}**.`);
      return;
    }

    const pulled = [];

    for (let i = 0; i < chest.drops; i++) {
      const item = rollItemFromChest(chest);

      if (item) {
        addItem(inventory, userId, item.id, 1);
        pulled.push(item);
      }
    }

    economy[userId].cratesOpened += 1;

    saveEconomy(economy);
    saveInventory(inventory);

    const lines = pulled.map(item => {
      const rarityData = getRarityData(item.rarity);
      return `${rarityData.emoji} **${item.name}** — ${item.rarity}`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xF97316)
      .setTitle(`📦 ${interaction.user.username} opened a ${chest.name}!`)
      .setDescription(lines || 'No items pulled.')
      .setFooter({ text: '5 items pulled from this crate' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    return;
  }
  if (interaction.commandName === 'redeem') {
  const itemId = interaction.options.getString('item_id');
  const item = SHOP_ITEMS[itemId];

  if (!item) {
    await interaction.reply('❌ Item not found.');
    return;
  }

  if (item.type !== 'coin') {
    await interaction.reply('❌ Only coin items can be redeemed.');
    return;
  }

  const inventory = getInventory();
  const economy = getEconomy();

  ensureUserInventory(inventory, interaction.user.id);
  ensureUserEconomy(economy, interaction.user.id);

  const success = removeItem(
    inventory,
    interaction.user.id,
    itemId,
    1
  );

  if (!success) {
    await interaction.reply(`❌ You do not own **${item.name}**.`);
    return;
  }

  economy[interaction.user.id].balance += item.coinValue;

  saveInventory(inventory);
  saveEconomy(economy);

  await interaction.reply(
    `💰 Redeemed **${item.name}** for **${formatCoins(item.coinValue)}**.`
  );

  return;
}
    if (interaction.commandName === 'add-money') {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    const economy = getEconomy();

    ensureUserEconomy(economy, target.id);
    economy[target.id].balance += amount;

    saveEconomy(economy);

    await interaction.reply(
      `✅ Added **${formatCoins(amount)}** to ${target}.`
    );
    return;
  }

  if (interaction.commandName === 'remove-money') {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    const economy = getEconomy();

    ensureUserEconomy(economy, target.id);

    economy[target.id].balance = Math.max(
      0,
      economy[target.id].balance - amount
    );

    saveEconomy(economy);

    await interaction.reply(
      `✅ Removed **${formatCoins(amount)}** from ${target}.`
    );
    return;
  }

  if (interaction.commandName === 'set-money') {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    const economy = getEconomy();

    ensureUserEconomy(economy, target.id);
    economy[target.id].balance = amount;

    saveEconomy(economy);

    await interaction.reply(
      `✅ Set ${target}'s balance to **${formatCoins(amount)}**.`
    );
    return;
  }

  if (interaction.commandName === 'give-item') {
    const target = interaction.options.getUser('user');
    const itemId = interaction.options.getString('item_id');
    const amount = interaction.options.getInteger('amount') ?? 1;

    const item = SHOP_ITEMS[itemId];

    if (!item) {
      await interaction.reply('❌ Item not found.');
      return;
    }

    const inventory = getInventory();

    ensureUserInventory(inventory, target.id);
    addItem(inventory, target.id, itemId, amount);

    saveInventory(inventory);

    const member = await interaction.guild.members
      .fetch(target.id)
      .catch(() => null);

    if (member && item.type === 'role') {
      await applyItemReward(member, item);
    }

    await interaction.reply(
      `✅ Gave **${item.name} x${amount}** to ${target}.`
    );
    return;
  }

  if (interaction.commandName === 'remove-item') {
    const target = interaction.options.getUser('user');
    const itemId = interaction.options.getString('item_id');
    const amount = interaction.options.getInteger('amount') ?? 1;

    const item = SHOP_ITEMS[itemId];

    if (!item) {
      await interaction.reply('❌ Item not found.');
      return;
    }

    const inventory = getInventory();

    ensureUserInventory(inventory, target.id);

    const success = removeItem(
      inventory,
      target.id,
      itemId,
      amount
    );

    if (!success) {
      await interaction.reply(
        `❌ ${target.username} does not have enough of that item.`
      );
      return;
    }

    saveInventory(inventory);

    await interaction.reply(
      `✅ Removed **${item.name} x${amount}** from ${target}.`
    );
    return;
  }

  /*
    KEEP ALL OF YOUR EXISTING COMMANDS BELOW THIS SECTION:

    - declare-winner
    - draft-create
    - draft-pick
    - draft-show
    - mapban-create
    - mapban-ban
    - mapban-show
    - leaderboard
    - remove-stats
    - record-kills

    Paste your current interaction handlers here.
  */
   if (interaction.commandName === 'remove-stats') {
    await interaction.deferReply({ ephemeral: true });

    const user = interaction.options.getUser('user');
    const stat = interaction.options.getString('stat');
    const amount = interaction.options.getInteger('amount');

    const stats = readJson(STATS_FILE);

    if (!stats[user.id]) stats[user.id] = { wins: 0, mvps: 0, kills: 0 };
    if (stats[user.id][stat] === undefined) stats[user.id][stat] = 0;

    stats[user.id][stat] = Math.max(0, stats[user.id][stat] - amount);

    writeJson(STATS_FILE, stats);

    await updateScoreboard(interaction.guild, stats);
    await updateKillLeaders(interaction.guild, stats);
    await updateKillerOfChampionsRole(interaction.guild, stats);

    await interaction.editReply(`✅ Removed **${amount} ${stat}** from **${user.username}**.`);
    return;
  }

  if (interaction.commandName === 'record-kills') {
    await interaction.deferReply({ ephemeral: true });

    const stats = readJson(STATS_FILE);

    for (let i = 1; i <= 10; i++) {
      const user = interaction.options.getUser(`player${i}`);
      const kills = interaction.options.getInteger(`kills${i}`);

      if (!user || kills === null) continue;

      if (!stats[user.id]) stats[user.id] = { wins: 0, mvps: 0, kills: 0 };
      if (stats[user.id].kills === undefined) stats[user.id].kills = 0;

      stats[user.id].kills += kills;

      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (member) await updateSingleGameKillRoles(member, kills);
    }

    writeJson(STATS_FILE, stats);

    await updateKillLeaders(interaction.guild, stats);
    await updateKillerOfChampionsRole(interaction.guild, stats);

    await interaction.editReply('✅ Kills recorded.');
    return;
  }

  if (interaction.commandName === 'leaderboard') {
    const stats = readJson(STATS_FILE);

    const embed = new EmbedBuilder()
      .setColor(0xF97316)
      .setTitle('📊 Matchpoint Leaderboard')
      .addFields(
        { name: '🏆 Draft Scoreboard', value: buildScoreboard(stats), inline: false },
        { name: '🔫 Kill Leaders', value: buildKillLeaders(stats), inline: false }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    return;
  }

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

  if (interaction.commandName === 'mapban-create') {
    await interaction.deferReply({ ephemeral: true });

    const name = interaction.options.getString('name');
    const team1Captain = interaction.options.getUser('team1_captain');
    const team2Captain = interaction.options.getUser('team2_captain');

    const mapbans = readJson(MAPBAN_FILE);

    const mapban = {
      name,
      messageId: null,
      team1: { captain: team1Captain.id, bans: [] },
      team2: { captain: team2Captain.id, bans: [] },
    };

    const messageId = await updateMapBanMessage(interaction.guild, mapban);
    mapban.messageId = messageId;

    mapbans[interaction.guild.id] = mapban;
    writeJson(MAPBAN_FILE, mapbans);

    await interaction.editReply('✅ Map ban board created.');
    return;
  }

  if (interaction.commandName === 'mapban-ban') {
    await interaction.deferReply({ ephemeral: true });

    const teamNumber = interaction.options.getInteger('team');
    const map = interaction.options.getString('map');

    const mapbans = readJson(MAPBAN_FILE);
    const mapban = mapbans[interaction.guild.id];

    if (!mapban) {
      await interaction.editReply('❌ No active map ban board found. Use `/mapban-create` first.');
      return;
    }

    const allBans = [...mapban.team1.bans, ...mapban.team2.bans];

    if (allBans.includes(map)) {
      await interaction.editReply('❌ That map has already been banned.');
      return;
    }

    const teamKey = teamNumber === 1 ? 'team1' : 'team2';

    if (mapban[teamKey].bans.length >= 3) {
      await interaction.editReply(`❌ Team ${teamNumber} already has 3 bans.`);
      return;
    }

    mapban[teamKey].bans.push(map);

    const messageId = await updateMapBanMessage(interaction.guild, mapban);
    mapban.messageId = messageId;

    mapbans[interaction.guild.id] = mapban;
    writeJson(MAPBAN_FILE, mapbans);

    await interaction.editReply(`✅ Team ${teamNumber} banned **${map}**.`);
    return;
  }

  if (interaction.commandName === 'mapban-show') {
    const mapbans = readJson(MAPBAN_FILE);
    const mapban = mapbans[interaction.guild.id];

    if (!mapban) {
      await interaction.reply({ content: '❌ No active map ban board found.', ephemeral: true });
      return;
    }

    await interaction.reply({ embeds: [buildMapBanEmbed(mapban)] });
    return;
  }
   if (interaction.commandName === 'declare-winner') {
    await interaction.deferReply({ ephemeral: true });

    const hostName = interaction.options.getString('host');
    const format = interaction.options.getString('format');
    const matchName = `${hostName}'s ${format.replace(/_/g, ' ').toUpperCase()}`;
    const currency = interaction.options.getInteger('currency') ?? 0;
    const notes = interaction.options.getString('notes') ?? '';
    const championRole = interaction.options.getRole('champion_role');
    const mvpUser = interaction.options.getUser('mvp');
    const isTournament = format.includes('tournament');
    const trophyRole = interaction.guild.roles.cache.find(r => r.name === 'Draft Winner');

    const winnerEntries = [1, 2, 3, 4, 5]
      .map(n => {
        const user = interaction.options.getUser(`winner${n}`);
        if (!user) return null;
        return { user };
      })
      .filter(Boolean);

    const stats = readJson(STATS_FILE);
    const economy = getEconomy();

    for (const entry of winnerEntries) {
      const user = entry.user;

      if (!stats[user.id]) stats[user.id] = { wins: 0, mvps: 0, kills: 0 };
      if (stats[user.id].wins === undefined) stats[user.id].wins = 0;
      if (stats[user.id].mvps === undefined) stats[user.id].mvps = 0;
      if (stats[user.id].kills === undefined) stats[user.id].kills = 0;

      stats[user.id].wins += 1;

      ensureUserEconomy(economy, user.id);
      economy[user.id].balance += currency;

      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      if (member) {
        if (trophyRole) await member.roles.add(trophyRole).catch(console.error);
        await updateStatRoles(member, stats);
      }
    }

    if (!stats[mvpUser.id]) stats[mvpUser.id] = { wins: 0, mvps: 0, kills: 0 };
    if (stats[mvpUser.id].wins === undefined) stats[mvpUser.id].wins = 0;
    if (stats[mvpUser.id].mvps === undefined) stats[mvpUser.id].mvps = 0;
    if (stats[mvpUser.id].kills === undefined) stats[mvpUser.id].kills = 0;

    stats[mvpUser.id].mvps += 1;

    const mvpMember = await interaction.guild.members.fetch(mvpUser.id).catch(() => null);
    if (mvpMember) await updateStatRoles(mvpMember, stats);

    writeJson(STATS_FILE, stats);
    saveEconomy(economy);

    await updateScoreboard(interaction.guild, stats);
    await updateKillLeaders(interaction.guild, stats);
    await updateKillerOfChampionsRole(interaction.guild, stats);

    if (championRole && isTournament) {
      await interaction.guild.members.fetch().catch(() => null);

      const membersWithRole = interaction.guild.members.cache.filter(m =>
        m.roles.cache.has(championRole.id)
      );

      for (const [, member] of membersWithRole) {
        await member.roles.remove(championRole).catch(console.error);
      }

      for (const entry of winnerEntries) {
        const member = await interaction.guild.members.fetch(entry.user.id).catch(() => null);
        if (member) await member.roles.add(championRole).catch(console.error);
      }
    }

    const resultsChannel = interaction.guild.channels.cache.get(RESULTS_CHANNEL_ID);

    if (resultsChannel) {
      const embed = new EmbedBuilder()
        .setColor(0xF97316)
        .setTitle(`🏆 ${matchName} — Winner${winnerEntries.length > 1 ? 's' : ''} Declared!`)
        .setDescription(winnerEntries.map(entry => `<@${entry.user.id}>`).join(' · '))
        .addFields(
          [
            { name: '⭐ MVP', value: `<@${mvpUser.id}>`, inline: true },
            { name: '💰 MatchCoins Awarded', value: `${formatCoins(currency)} each`, inline: true },
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

    await interaction.editReply(
      `✅ **Match recorded!**\n` +
      `🏆 Match: **${matchName}**\n` +
      `⭐ MVP: **${mvpUser.username}**\n` +
      `💰 Winners received **${formatCoins(currency)}** each.`
    );

    return;
  }
});

process.on('unhandledRejection', error => {
  console.error('UNHANDLED REJECTION:', error);
});

process.on('uncaughtException', error => {
  console.error('UNCAUGHT EXCEPTION:', error);
});
console.log('Trying to login...');
client.login(TOKEN).catch(console.error);