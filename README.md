# 🛸 Among Us VC Bot — Design City

A Discord bot that mutes and unmutes your entire voice channel during Among Us sessions. Built and maintained by **Design City**.

---

## 👥 Credits

| Role | Member |
|------|--------|
| 🎬 Director | eirlixx.ipv |
| 🎨 Creatives | arshit |
| 💻 Developing | agent.fx |

---

## ⚡ Quick Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create your Discord Bot
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** → name it anything
3. Go to **Bot** tab → Click **Add Bot**
4. Under **Privileged Gateway Intents**, enable:
   - ✅ Server Members Intent
   - ✅ Message Content Intent
   - ✅ Presence Intent
5. Copy your **Bot Token**

### 3. Set up your token
Create a `.env` file in the root folder:
```
BOT_TOKEN=your_actual_token_here
```

### 4. Invite the bot to your server
Replace `YOUR_APP_ID` with your Application ID:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_APP_ID&permissions=12582912&scope=bot
```

Permissions needed:
- **Mute Members** — to mute/unmute players
- **Read & Send Messages** — for commands

### 5. Run the bot
```bash
npm start
```

---

## 🎮 Commands

| Command | Description |
|---------|-------------|
| `!au` | Open the VC control panel |
| `!au help` | Show all commands |
| `!au credits` | Show credits |

---

## 🕹️ Control Panel Buttons

| Button | Action |
|--------|--------|
| 📡 Start Game | Mutes everyone in VC & starts timer |
| 📢 Meeting! | Unmutes everyone in VC |
| 🏁 End Game | Unmutes all & saves game to history |
| 📊 Dashboard | Shows session history & stats |
| 🔄 Reset Counter | Clears game count & history |

---

## 🔄 Game Flow

```
Lobby (everyone can talk)
   ↓  [Start Game] — mutes all
Playing (everyone muted)
   ↓  [Meeting!] — unmutes all, timer keeps running
Meeting (everyone unmuted)
   ↓  [Start Game] — mutes all again
Playing (everyone muted)
   ↓  [End Game] — unmutes all, saves to history
Lobby
```

---

## ❗ Troubleshooting

**Bot can't mute members?**
- Make sure the bot role is **higher** than player roles in Server Settings → Roles
- Bot needs **Mute Members** permission in the voice channel

**"No one in your VC" error?**
- Make sure **you** are in a voice channel when running the command

**Bot not responding?**
- Check **Message Content Intent** is enabled in the Developer Portal
- Make sure bot has **Read Messages** permission in your text channel

---

## 🏙️ Design City
