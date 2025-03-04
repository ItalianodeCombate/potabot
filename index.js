const { Client, GatewayIntentBits, Routes, EmbedBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const keep_alive = require('./keep_alive.js'); // Requerir el archivo keep_alive.js

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildInvites
    ]
});

const token = process.env.DISCORD_TOKEN;

const commands = [
    { name: 'ping', description: 'Responde con pong!' },
    { name: 'say', description: 'Repite lo que digas', options: [{ name: 'texto', type: 3, description: 'Texto a repetir', required: true }] },
    { name: 'ban', description: 'Banea a un usuario', options: [{ name: 'usuario', type: 6, description: 'Usuario a banear', required: true }] },
    { name: 'kick', description: 'Expulsa a un usuario', options: [{ name: 'usuario', type: 6, description: 'Usuario a expulsar', required: true }] },
    { name: 'mute', description: 'Silencia a un usuario', options: [{ name: 'usuario', type: 6, description: 'Usuario a silenciar', required: true }, { name: 'duracion', type: 4, description: 'Duración del silencio en minutos', required: true }] },
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
    { name: 'invitechannel', description: 'Gestiona el canal de invitaciones', options: [{ name: 'add', type: 1, description: 'Añade un canal de invitaciones', options: [{ name: 'canal', type: 7, description: 'Canal para registrar invitaciones', required: true }] }, { name: 'remove', type: 1, description: 'Elimina un canal de invitaciones', options: [{ name: 'canal', type: 7, description: 'Canal a eliminar', required: true }] }] },
];

const rest = new REST({ version: '10' }).setToken(token);
let userWarns = {};
let userActivity = {};
let autoRoles = new Set();
let secureChannels = {};
let actionLog = [];
let inviteChannels = {};
let invitesCache = new Map();

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

    // Cache invites
    client.guilds.cache.forEach(async guild => {
        const invites = await guild.invites.fetch();
        invitesCache.set(guild.id, invites);
    });
});

client.on('inviteCreate', async invite => {
    const invites = await invite.guild.invites.fetch();
    invitesCache.set(invite.guild.id, invites);
});

client.on('inviteDelete', async invite => {
    const invites = await invite.guild.invites.fetch();
    invitesCache.set(invite.guild.id, invites);
});

client.on('guildMemberAdd', async member => {
    autoRoles.forEach(roleId => {
        const role = member.guild.roles.cache.get(roleId);
        if (role) {
            member.roles.add(role);
        }
    });

    const channelId = inviteChannels[member.gu

