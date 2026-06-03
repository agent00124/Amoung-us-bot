/**
 * 🚀 Among Us VC Mute Bot
 *
 * SETUP:
 * 1. npm install discord.js
 * 2. Create bot at https://discord.com/developers/applications
 * 3. Enable: Server Members Intent, Message Content Intent, Presence Intent
 * 4. Bot needs: Mute Members permission
 * 5. Replace BOT_TOKEN with your token
 */

require('dotenv').config();

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const BOT_TOKEN = process.env.BOT_TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ─────────────────────────────────────────────
// STATE
// phase: 'lobby' | 'playing' | 'meeting'
// gameCount: total completed games
// gameStartTime: Date when current game started (null in lobby)
// gameHistory: array of completed game records
// ─────────────────────────────────────────────
const gameState = new Map();

function getState(guildId) {
  if (!gameState.has(guildId)) {
    gameState.set(guildId, {
      phase: 'lobby',
      gameCount: 0,
      channelId: null,
      controlMessageId: null,
      gameStartTime: null,   // when current game started
      gameHistory: [],       // completed game records
    });
  }
  return gameState.get(guildId);
}

// ─────────────────────────────────────────────
// HELPER: Format elapsed ms → "Xm Ys"
// ─────────────────────────────────────────────
function formatDuration(ms) {
  if (!ms || ms < 0) return '0s';
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

// ─────────────────────────────────────────────
// HELPER: Get all non-bot members in same VC
// ─────────────────────────────────────────────
function getVCMembers(member) {
  const vc = member.voice?.channel;
  if (!vc) return [];
  return [...vc.members.values()].filter(m => !m.user.bot);
}

// ─────────────────────────────────────────────
// HELPER: Mute/unmute all simultaneously
// ─────────────────────────────────────────────
async function setMuteAll(members, mute) {
  const results = await Promise.allSettled(
    members.map(m => m.voice.setMute(mute, mute ? 'Among Us: Game started' : 'Among Us: Unmuted'))
  );
  const success = results.filter(r => r.status === 'fulfilled').length;
  const failed  = results.filter(r => r.status === 'rejected').length;
  return { success, failed };
}

// ─────────────────────────────────────────────
// HELPER: Build control panel embed + buttons
// ─────────────────────────────────────────────
function buildControlPanel(guild, phase, members, state) {
  const { gameCount, gameStartTime, gameHistory } = state;

  const phaseConfig = {
    lobby:   { color: 0x2B2D31, title: '🛸  Lobby — waiting to start',        badge: '⬜  LOBBY'   },
    playing: { color: 0xED4245, title: '📡  Game running — all players muted', badge: '🔴  IN GAME' },
    meeting: { color: 0xFEE75C, title: '📢  Emergency Meeting — unmuted!',      badge: '🟡  MEETING' },
  };

  const cfg = phaseConfig[phase];

  // Timer display
  let timerValue;
  if (phase === 'lobby') {
    timerValue = '> *Start a game to begin timer*';
  } else {
    // Timer is running — show elapsed since gameStartTime
    const elapsed = gameStartTime ? Date.now() - gameStartTime : 0;
    timerValue = `> ⏱️  **${formatDuration(elapsed)}** elapsed`;
  }

  // Player list
  const playerValue = members.length > 0
    ? members.map(m => `> ${m.displayName}`).join('\n')
    : '> *No players in VC*';

  // Game counter
  const counterValue = gameCount === 0
    ? '> No games played yet'
    : Array.from({ length: Math.min(gameCount, 10) }, (_, i) => `> Game ${i + 1} ✅`).join('\n')
      + (gameCount > 10 ? `\n> *...and ${gameCount - 10} more*` : '');

  const embed = new EmbedBuilder()
    .setAuthor({ name: '🛸  Among Us  ·  VC Controller' })
    .setTitle(cfg.title)
    .addFields(
      {
        name: `👥  Players in VC  (${members.length})`,
        value: playerValue,
        inline: true,
      },
      {
        name: `🎮  Games Played  (${gameCount})`,
        value: counterValue,
        inline: true,
      },
      {
        name: '⏱️  Game Timer',
        value: timerValue,
        inline: false,
      },
    )
    .setColor(cfg.color)
    .setFooter({ text: `${cfg.badge} • Design City` })
    .setTimestamp();

  // Row 1: game control buttons
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('au_start')
      .setLabel('Start Game')
      .setEmoji('📡')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(phase === 'playing'),

    new ButtonBuilder()
      .setCustomId('au_meeting')
      .setLabel('Meeting!')
      .setEmoji('📢')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(phase !== 'playing'),

    new ButtonBuilder()
      .setCustomId('au_end')
      .setLabel('End Game')
      .setEmoji('🏁')
      .setStyle(ButtonStyle.Success)
      .setDisabled(phase === 'lobby'),
  );

  // Row 2: utility buttons
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('au_dashboard')
      .setLabel('Dashboard')
      .setEmoji('📊')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId('au_reset')
      .setLabel('Reset Counter')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [row1, row2] };
}

// ─────────────────────────────────────────────
// HELPER: Build dashboard embed
// ─────────────────────────────────────────────
function buildDashboard(guild, state) {
  const { gameCount, gameHistory, phase, gameStartTime } = state;

  const embed = new EmbedBuilder()
    .setAuthor({ name: '🛸  Among Us  ·  Game Dashboard' })
    .setTitle('📊  Session History')
    .setColor(0x5865F2)
    .setTimestamp();

  if (gameHistory.length === 0 && phase === 'lobby') {
    embed.setDescription('> *No games played yet this session. Start your first game!*');
  } else {
    // Show currently running game if active
    if (phase !== 'lobby' && gameStartTime) {
      const elapsed = Date.now() - gameStartTime;
      embed.addFields({
        name: `🔴  Game ${gameCount + 1}  —  IN PROGRESS`,
        value: [
          `> **Started:** <t:${Math.floor(gameStartTime / 1000)}:t>`,
          `> **Elapsed:** ${formatDuration(elapsed)}`,
          `> **Phase:** ${phase === 'playing' ? '📡 Playing' : '📢 Meeting'}`,
        ].join('\n'),
        inline: false,
      });
    }

    // Show completed games (most recent first)
    const reversed = [...gameHistory].reverse();
    for (const game of reversed.slice(0, 10)) {
      embed.addFields({
        name: `✅  Game ${game.number}`,
        value: [
          `> **Started:** <t:${Math.floor(game.startTime / 1000)}:t>`,
          `> **Ended:** <t:${Math.floor(game.endTime / 1000)}:t>`,
          `> **Duration:** ${formatDuration(game.duration)}`,
          `> **Players:** ${game.players.length > 0 ? game.players.join(', ') : '*unknown*'}`,
          `> **Meetings called:** ${game.meetings}`,
        ].join('\n'),
        inline: false,
      });
    }

    if (gameHistory.length > 10) {
      embed.setFooter({ text: `Showing last 10 of ${gameHistory.length} completed games` });
    } else {
      embed.setFooter({ text: `${gameHistory.length} completed game${gameHistory.length !== 1 ? 's' : ''} this session  ·  Design City` });
    }
  }

  // Summary stats
  if (gameHistory.length > 0) {
    const totalMs = gameHistory.reduce((acc, g) => acc + g.duration, 0);
    const avgMs   = Math.floor(totalMs / gameHistory.length);
    const longest = gameHistory.reduce((a, b) => a.duration > b.duration ? a : b);
    const shortest = gameHistory.reduce((a, b) => a.duration < b.duration ? a : b);

    embed.addFields({
      name: '📈  Session Stats',
      value: [
        `> **Total play time:** ${formatDuration(totalMs)}`,
        `> **Avg game length:** ${formatDuration(avgMs)}`,
        `> **Longest game:** Game ${longest.number} (${formatDuration(longest.duration)})`,
        `> **Shortest game:** Game ${shortest.number} (${formatDuration(shortest.duration)})`,
      ].join('\n'),
      inline: false,
    });
  }

  return { embeds: [embed], ephemeral: true };
}

// ─────────────────────────────────────────────
// COMMANDS
// ─────────────────────────────────────────────
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.toLowerCase().startsWith('!au')) return;

  const args = message.content.slice(3).trim().split(/\s+/);
  const cmd  = args[0]?.toLowerCase() || '';

  if (!cmd || cmd === 'panel') {
    const member = message.member;
    if (!member.voice?.channel) {
      return message.reply('> ❌  You must be in a voice channel first.');
    }

    const members  = getVCMembers(member);
    const guildId  = message.guild.id;
    const state    = getState(guildId);
    state.channelId = message.channel.id;

    const panel = await message.channel.send(
      buildControlPanel(message.guild, state.phase, members, state)
    );
    state.controlMessageId = panel.id;
    message.delete().catch(() => {});
    return;
  }

  if (cmd === 'help') {
    const embed = new EmbedBuilder()
      .setAuthor({ name: '🛸  Among Us Bot — Help' })
      .setColor(0xD41E1E)
      .addFields(
        { name: '`!au`',          value: 'Open the control panel' },
        { name: '`!au help`',     value: 'Show this message' },
        { name: '`!au credits`',  value: 'Show credits' },
        { name: '▶  Start Game',      value: 'Mutes all players in VC' },
        { name: '📢  Meeting!',       value: 'Unmutes all players in VC' },
        { name: '🏁  End Game',       value: 'Unmutes all & saves game to history' },
        { name: '📊  Dashboard',      value: 'Shows session history & stats' },
        { name: '🔄  Reset Counter',  value: 'Clears game count & history' },
      )
      .setFooter({ text: 'Bot needs Mute Members permission' });
    return message.reply({ embeds: [embed] });
  }

  if (cmd === 'credits') {
    const embed = new EmbedBuilder()
      .setAuthor({ name: '🛸  Among Us Bot — Credits' })
      .setColor(0xD41E1E)
      .addFields(
        { name: '🎬  Director',   value: '> eirlixx.ipv' },
        { name: '🎨  Creatives',  value: '> arshit' },
        { name: '💻  Developing', value: '> agent.fx' },
      )
      .setFooter({ text: 'Design City • Among Us Bot' });
    return message.reply({ embeds: [embed] });
  }
});

// ─────────────────────────────────────────────
// BUTTON INTERACTIONS
// ─────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const { customId, guild, member } = interaction;
  if (!customId.startsWith('au_')) return;

  const guildId   = guild.id;
  const state     = getState(guildId);
  const vcMembers = getVCMembers(member);

  // ── DASHBOARD (ephemeral, no deferUpdate needed on panel) ──
  if (customId === 'au_dashboard') {
    await interaction.deferReply({ ephemeral: true });
    return interaction.editReply(buildDashboard(guild, state));
  }

  await interaction.deferUpdate();

  // ── START GAME: mute all, start timer ──
  if (customId === 'au_start') {
    if (!vcMembers.length) {
      return interaction.followUp({ content: '> ❌  No one in your VC!', ephemeral: true });
    }

    // If resuming from meeting, keep the original start time; otherwise fresh start
    if (state.phase !== 'meeting') {
      state.gameStartTime = Date.now();
      state.currentMeetings = 0;
    }

    const { success, failed } = await setMuteAll(vcMembers, true);
    state.phase = 'playing';
    await interaction.editReply(buildControlPanel(guild, 'playing', vcMembers, state));
    interaction.followUp({
      content: `> 🔴  Game started! Muted **${success}** player${success !== 1 ? 's' : ''}${failed ? ` (${failed} failed)` : ''}.`,
      ephemeral: true,
    });
  }

  // ── MEETING: unmute all, timer keeps running ──
  else if (customId === 'au_meeting') {
    state.currentMeetings = (state.currentMeetings || 0) + 1;
    const { success, failed } = await setMuteAll(vcMembers, false);
    state.phase = 'meeting';
    await interaction.editReply(buildControlPanel(guild, 'meeting', vcMembers, state));
    interaction.followUp({
      content: `> 📢  Meeting #${state.currentMeetings}! Unmuted **${success}** player${success !== 1 ? 's' : ''}${failed ? ` (${failed} failed)` : ''}. Timer keeps running!`,
      ephemeral: true,
    });
  }

  // ── END GAME: unmute all, stop timer, save history ──
  else if (customId === 'au_end') {
    const endTime  = Date.now();
    const duration = state.gameStartTime ? endTime - state.gameStartTime : 0;

    // Save to history
    state.gameCount += 1;
    state.gameHistory.push({
      number:    state.gameCount,
      startTime: state.gameStartTime || endTime,
      endTime:   endTime,
      duration:  duration,
      players:   vcMembers.map(m => m.displayName),
      meetings:  state.currentMeetings || 0,
    });

    // Reset active game tracking
    state.gameStartTime   = null;
    state.currentMeetings = 0;
    state.phase           = 'lobby';

    const { success, failed } = await setMuteAll(vcMembers, false);
    await interaction.editReply(buildControlPanel(guild, 'lobby', vcMembers, state));
    interaction.followUp({
      content: `> 🏁  Game **${state.gameCount}** finished in **${formatDuration(duration)}**! Unmuted **${success}** player${success !== 1 ? 's' : ''}${failed ? ` (${failed} failed)` : ''}. Use 📊 Dashboard to see history.`,
      ephemeral: true,
    });
  }

  // ── RESET COUNTER ──
  else if (customId === 'au_reset') {
    const oldCount = state.gameCount;
    state.gameCount    = 0;
    state.gameHistory  = [];
    state.gameStartTime = null;
    state.currentMeetings = 0;

    // If a game is running, also reset phase to lobby
    if (state.phase !== 'lobby') {
      await setMuteAll(vcMembers, false).catch(() => {});
      state.phase = 'lobby';
    }

    await interaction.editReply(buildControlPanel(guild, state.phase, vcMembers, state));
    interaction.followUp({
      content: `> 🔄  Reset! Cleared **${oldCount}** game${oldCount !== 1 ? 's' : ''} from history.`,
      ephemeral: true,
    });
  }
});

// ─────────────────────────────────────────────
// READY
// ─────────────────────────────────────────────
client.once('ready', () => {
  console.log(`\n  🛸  Among Us Bot online — ${client.user.tag}`);
  console.log(`  📡  Serving ${client.guilds.cache.size} server(s)\n`);
  client.user.setActivity('!au  |  Among Us', { type: 0 });
});

client.login(BOT_TOKEN);
