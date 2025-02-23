const Discord = require('discord.js');
const client = new Discord.Client({ intents: ["Guilds", "GuildMessages", "MessageContent"] });

const token = process.env.DISCORD_TOKEN;
const ipMessage = '<:pepe_happy:1232008882935693322> **armaklandia.hidenmc.com**\n1.8 - 1.21.4'; // Mensaje con emoji e IP

client.on('ready', () => {
    console.log(`Bot logged in as ${client.user.tag}!`);
    client.user.setActivity('Próximamente...', { type: 'PLAYING' });
});

client.on('messageCreate', (message) => {
    if (message.content.startsWith('/say')) {
        const text = message.content.slice(5).trim();
        if (text) {
            message.channel.send(text);
        } else {
            message.reply('Debes proporcionar un texto después de /say.');
        }
    } else if (message.content === '!ip') {
        message.channel.send(ipMessage);
    }
});

client.login(token);
