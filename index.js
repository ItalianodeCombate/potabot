const Discord = require('discord.js');
const keep_alive = require('./keep_alive.js');
const { Client, GatewayIntentBits, Routes, EmbedBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildInvites] });
const token = process.env.DISCORD_TOKEN;

const commands = [
    { name: 'ping', description: 'Responde con pong!' },
    { name: 'say', description: 'Repite lo que digas', options: [{ name: 'texto', type: 3, description: 'Texto a repetir', required: true }] },
    { name: 'ban', description: 'Banea a un usuario', options: [{ name: 'usuario', type: 6, description: 'Usuario a banear', required: true }] },
    { name: 'kick', description: 'Expulsa a un usuario', options: [{ name: 'usuario', type: 6, description: 'Usuario a expulsar', required: true }] },
    { name: 'mute', description: 'Silencia a un usuario', options: [{ name: 'usuario', type: 6, description: 'Usuario a silenciar', required: true }, { name: 'duracion', type: 4, description: 'Duracion del silencio en minutos', required: true }] },
    { name: 'unban', description: 'Desbanea a un usuario', options: [{ name: 'usuario_id', type: 3, description: 'ID del usuario a desbanear', required: true }] },
    { name: 'unmute', description: 'Desilencia a un usuario', options: [{ name: 'usuario', type: 6, description: 'Usuario a desilenciar', required: true }] },
    { name: 'warn', description: 'Advierte a un usuario', options: [{ name: 'usuario', type: 6, description: 'Usuario a advertir', required: true }] },
    { name: 'afk', description: 'Activa/desactiva tu estado AFK' },
    { name: 'md_user', description: 'Envía un mensaje directo a un usuario específico', options: [{ name: 'usuario', type: 6, description: 'Usuario a quien enviar el mensaje', required: true }, { name: 'mensaje', type: 3, description: 'Mensaje a enviar', required: true }] },
    { name: 'lockdown', description: 'Bloquea el canal actual' },
    { name: 'avatar', description: 'Muestra el avatar de un usuario', options: [{ name: 'usuario', type: 6, description: 'Usuario del que mostrar el avatar', required: false }] },
    { name: 'purge', description: 'Elimina una cantidad específica de mensajes', options: [{ name: 'cantidad', type: 4, description: 'Cantidad de mensajes a eliminar', required: true }] },
    { name: 'top', description: 'Muestra los usuarios más activos' },
    { name: 'autorole', description: 'Gestiona los autoroles', options: [{ name: 'add', type: 1, description: 'Añade un autorol', options: [{ name: 'rol', type: 8, description: 'Rol a añadir', required: true }] }, { name: 'remove', type: 1, description: 'Elimina un autorol', options: [{ name: 'rol', type: 8, description: 'Rol a eliminar', required: true }] }] },
    { name: 'securemode', description: 'Activa el modo seguro en un canal', options: [{ name: 'canal', type: 7, description: 'Canal a proteger', required: true }] },
    { name: 'invitechannel', description: 'Establece el canal de invitaciones', options: [{ name: 'canal', type: 7, description: 'Canal para registrar invitaciones', required: true }] },
];

const rest = new REST({ version: '10' }).setToken(token);
let userWarns = {};
let afkUsers = {};
let userActivity = {};
let autoRoles = new Set();
let secureChannels = {};
let actionLog = [];
let inviteChannels = {};

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
    client.user.setActivity('Próximamente...', { type: 'PLAYING' });
});

client.on('messageCreate', (message) => {
    if (message.author.bot) return;
    if (!userActivity[message.author.id]) {
        userActivity[message.author.id] = 0;
    }
    userActivity[message.author.id]++;
    if (secureChannels[message.channel.id]) {
        message.channel.setRateLimitPerUser(10);
    }
});

client.on('guildMemberAdd', async (member) => {
    autoRoles.forEach((roleId) => {
        const role = member.guild.roles.cache.get(roleId);
        if (role) {
            member.roles.add(role);
        }
    });

    const channelId = inviteChannels[member.guild.id];
    if (channelId) {
        const channel = member.guild.channels.cache.get(channelId);
        if (channel) {
            const invites = await member.guild.invites.fetch();
            const invite = invites.find((i) => i.uses > 0);
            if (invite) {
                channel.send(`${member.user.tag} fue invitado por ${invite.inviter.tag}. Invitaciones de ${invite.inviter.tag}: ${invite.uses}.`);
            }
        }
    }
});

client.on('channelCreate', (channel) => logAction(channel.guild.id, channel.id, 'channelCreate'));
client.on('channelDelete', (channel) => logAction(channel.guild.id, channel.id, 'channelDelete'));
client.on('roleCreate', (role) => logAction(role.guild.id, role.id, 'roleCreate'));
client.on('roleDelete', (role) => logAction(role.guild.id, role.id, 'roleDelete'));

function logAction(guildId, actionId, type) {
    const now = Date.now();
    actionLog.push({ guildId, actionId, type, timestamp: now });
    actionLog = actionLog.filter((action) => now - action.timestamp < 60000);
    const recentActions = actionLog.filter((action) => action.guildId === guildId && now - action.timestamp < 60000);
    if (recentActions.length > 3) {
        const userId = recentActions[0].actionId;
        const member = client.guilds.cache.get(guildId)?.members.cache.get(userId);
        if (member) {
            member.ban({ reason: 'Antiraid' }).then(() => {
                member.send('Has sido baneado por el antiraid.');
            });
        }
    }
}

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, user, channel } = interaction;
    if (commandName === 'ping') {
        await interaction.reply('Pong!');
    } else if (commandName === 'say') {
        const texto = options.getString('texto');
        await interaction.reply(texto);
    } else if (commandName === 'ban') {
        const usuario = options.getUser('usuario');
        try {
            await interaction.guild.members.ban(usuario);
            await usuario.send('Has sido sancionado. Tipo de sanción aplicada: ban.');
            await interaction.reply(`${usuario.tag} ha sido baneado.`);
        } catch (error) {
            console.error(error);
            await interaction.reply('No pude banear a ese usuario.');
        }
    } else if (commandName === 'kick') {
        const usuario = options.getUser('usuario');
        try {
            await interaction.guild.members.kick(usuario);
            await usuario.send('Has sido sancionado. Tipo de sanción aplicada: kick.');
            await interaction.reply(`${usuario.tag} ha sido expulsado.`);
        } catch (error) {
            console.error(error);
            await interaction.reply('No pude expulsar a ese usuario.');
        }
    }
    // Continuar con las demás interacciones de comandos según sea necesario
});

