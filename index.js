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
    // ... (código existente)
}

async function handleKick(message) {
    // ... (código existente)
}

async function handleMute(message) {
    if (!message.member.permissions.has('MUTE_MEMBERS')) return message.reply('No tienes permisos para silenciar.');
    const args = message.content.split(' ');
    const member = message.mentions.members.first();
    if (!member) return message.reply('Debes mencionar a un usuario para silenciar.');
    if (args.length < 3) return message.reply('Debes especificar la duración del silencio (en minutos).');
    const durationMinutes = parseInt(args[2]);
    if (isNaN(durationMinutes) || durationMinutes <= 0) return message.reply('La duración debe ser un número positivo.');
    const durationMs = durationMinutes * 60000; // Convertir minutos a milisegundos
    try {
        await member.timeout(durationMs);
        message.channel.send(`${member.user.tag} ha sido silenciado durante ${durationMinutes} minutos.`);
    } catch (error) {
        console.error('Error al silenciar:', error);
        message.reply('No pude silenciar a ese usuario.');
    }
}

client.login(token);
