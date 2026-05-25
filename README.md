# 🎮 Premium Minecraft SMP Pterodactyl Discord Bot

A state-of-the-art Discord bot integrated with the **Pterodactyl Client API and WebSocket** console stream. Built with **discord.js v14.26+** and **Node.js**, featuring **true native Discord Components V2** (no embeds!) in pure stealthy black design.

---

## ✨ Features

* **🖥️ Live Resources Status Card (`/status`)**: View real-time server power state, uptime, dynamic CPU progress bars, RAM percentage usage, Disk space allocations, and live TPS metrics with an interactive Refresh Button that updates the card in-place.
* **👥 Active Players List (`/players`)**: Sends `/list` to the console behind the scenes, captures the output, and formats active player capacities and user rosters.
* **🌍 Connection Details (`/ip`)**: Gets connection IP addresses, ports, game versions, and supports link buttons for live Dynmap/BlueMap maps and Wikis.
* **⏱️ Continuous Uptime Tracker (`/uptime`)**: Inspects server boot-ups and relative run durations.
* **📊 Server TPS (`/tps`)**: Displays tick-rates (1m, 5m, 15m) and rates server performance (Healthy 🟢, Minor Lag 🟡, Major Lag 🔴).
* **⚡ Power Control (`/power`)**: *[Admin Only]* Remotely trigger start, stop, and restart power signals securely from Discord.
* **📁 Backups Snapshot (`/backups`)**: List active server backups, sizes, creation dates, and features a one-click button to trigger new snapshots.
* **📝 Whitelist Manager (`/whitelist`)**: *[Admin Only]* Add or remove whitelisted players directly from Discord and parse console feedback in real-time.
* **💻 Remote Command Console (`/exec`)**: *[Admin Only]* Run arbitrary console commands on the Minecraft server and capture feedback outputs within 2 seconds.

---

## 🚀 Getting Started & Configuration

Please refer to the configuration file details and deployment options inside your environment:
1. Copy `.env.example` to `.env` and fill in your values (securely git-ignored!).
2. Install dependencies: `npm install`
3. Deploy the application commands: `npm run deploy`
4. Start the bot: `npm start`
