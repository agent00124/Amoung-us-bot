# 🚀 Among Us VC Mute Bot

A Discord bot that lets you **mute/unmute your entire voice channel** with one click — perfect for Among Us sessions.

---

## ⚡ Quick Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create your Discord Bot
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** → name it "Among Us Bot"
3. Go to **Bot** tab → Click **Add Bot**
4. Under **Privileged Gateway Intents**, enable:
   - ✅ **Server Members Intent**
   - ✅ **Message Content Intent**
5. Copy your **Bot Token**

### 3. Set your token
Open `bot.js` and replace:
```js
const BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE';
```
with your actual token.

### 4. Invite the bot to your server
Use this URL (replace `YOUR_APP_ID` with your Application ID):
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_APP_ID&permissions=12582912&scope=bot
```

The bot needs these permissions:
- **Mute Members** — to mute/unmute players
- **Read Messages / Send Messages** — for commands

### 5. Run the bot
```bash
npm start
```

---

## 🎮 How to Use

1. **Join a voice channel** with your Among Us friends
2. In any text channel, type:

| Command | What it does |
|---------|-------------|
| `!au` or `!au panel` | Spawns the interactive control panel with buttons |
| `!au mute` | Instantly mutes everyone in your VC |
| `!au unmute` | Instantly unmutes everyone in your VC |
| `!au help` | Shows all commands |

### Control Panel Buttons

| Button | Phase | Action |
|--------|-------|--------|
| ▶ Start Game | Lobby → Playing | Mutes everyone |
| 📢 Meeting! | Playing → Meeting | Unmutes everyone |
| 🏁 End Game | Meeting/Playing → Lobby | Unmutes everyone |
| 🔄 Refresh | Any | Updates the player list |

---

## 🔄 Typical Game Flow

```
Lobby (everyone can talk)
   ↓  [Start Game]
Playing (everyone muted)
   ↓  [Meeting!]
Meeting (everyone unmuted)
   ↓  [Start Game again]
Playing (everyone muted)
   ↓  [End Game]
Lobby (everyone unmuted)
```

---

## ❗ Troubleshooting

**Bot can't mute members?**
- Make sure the bot role is **higher** than the players' roles in Server Settings → Roles
- The bot needs **Mute Members** permission in the voice channel

**"No one in your VC" error?**
- Make sure YOU are in the voice channel when you run the command

**Bot not responding?**
- Ensure **Message Content Intent** is enabled in the Developer Portal
- Check that the bot has **Read Messages** permission in your text channel
