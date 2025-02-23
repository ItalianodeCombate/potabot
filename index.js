const Discord = require('discord.js');
const client = new Discord.Client({ intents: ["Guilds", "GuildMembers", "GuildMessages", "MessageContent"] });

const token = process.env.DISCORD_TOKEN;

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
    } else if (message.content === 'ping') {
        message.reply('pong!');
    } else if (message.content.startsWith('/ban')) {
        handleBan(message);
    } else if (message.content.startsWith('/kick')) {
        handleKick(message);
    } else if (message.content.startsWith('/mute')) {
        handleMute(message);
    }
});

async function handleBan(message) {
    if (!message.member.permissions.has('BAN_MEMBERS')) return message.reply('No tienes permisos para banear.');
    const member = message.mentions.members.first();
    if (!member) return message.reply('Debes mencionar a un usuario para banear.');
    try {
        await member.ban();
        message.channel.send(`${member.user.tag} ha sido baneado.`);
    } catch (error) {
        console.error('Error al banear:', error);
        message.reply('No pude banear a ese usuario.');
    }
}

async function handleKick(message) {
    if (!message.member.permissions.has('KICK_MEMBERS')) return message.reply('No tienes permisos para expulsar.');
    const member = message.mentions.members.first();
    if (!member) return message.reply('Debes mencionar a un usuario para expulsar.');
    try {
        await member.kick();
        message.channel.send(`${member.user.tag} ha sido expulsado.`);
    } catch (error) {
        console.error('Error al expulsar:', error);
        message.reply('No pude expulsar a ese usuario.');
    }
}

async function handleMute(message) {
    if (!message.member.permissions.has('MUTE_MEMBERS')) return message.reply('No tienes permisos para silenciar.');
    const member = message.mentions.members.first();
    if (!member) return message.reply('Debes mencionar a un usuario para silenciar.');
    try {
        await member.timeout(600_000); // 10 minutos de silencio
        message.channel.send(`${member.user.tag} ha sido silenciado.`);
    } catch (error) {
        console.error('Error al silenciar:', error);
        message.reply('No pude silenciar a ese usuario.');
    }
}

client.login(token);
