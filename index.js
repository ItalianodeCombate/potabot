const Discord = require('discord.js');
const client = new Discord.Client({ intents: ["Guilds", "GuildMessages", "MessageContent"] });

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

client.login(DISCORD_TOKEN);
