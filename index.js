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

    const channelId = inviteChannels[member.guild.id];
    if (channelId) {
        const channel = member.guild.channels.cache.get(channelId);
        if (channel) {
            const cachedInvites = invitesCache.get(member.guild.id) || new Map();
            const newInvites = await member.guild.invites.fetch();
            invitesCache.set(member.guild.id, newInvites);

            const invite = newInvites.find(i => cachedInvites.get(i.code) && cachedInvites.get(i.code).uses < i.uses);
            if (invite) {
                channel.send(`${member.user.tag} fue invitado por ${invite.inviter.tag}. Invitaciones de ${invite.inviter.tag}: ${invite.uses}.`);
            }
        }
    }
});

client.on('channelCreate', channel => logAction(channel.guild.id, channel.id, 'channelCreate'));
client.on('channelDelete', channel => logAction(channel.guild.id, channel.id, 'channelDelete'));
client.on('roleCreate', role => logAction(role.guild.id, role.id, 'roleCreate'));
client.on('roleDelete', role => logAction(role.guild.id, role.id, 'roleDelete'));

function logAction(guildId, actionId, type) {
    const now = Date.now();
    actionLog = actionLog.filter(action => now - action.timestamp < 60000);
    actionLog.push({ guildId, actionId, type, timestamp: now });

    const recentActions = actionLog.filter(action => action.guildId === guildId && now - action.timestamp < 60000);
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

client.on('messageCreate', message => {
    if (message.author.bot) return;
    if (!userActivity[message.author.id]) {
        userActivity[message.author.id] = 0;
    }
    userActivity[message.author.id]++;
    if (secureChannels[message.channel.id]) {
        message.channel.setRateLimitPerUser(10);
    }

    // Automoderación
    if (message.mentions.users.size > 5) {
        message.delete().catch(console.error);
        message.author.send('No puedes mencionar a tantas personas a la vez.').catch(console.error);
    }

    const maliciousLinks = ['example.com', 'malicious.com'];
    if (maliciousLinks.some(link => message.content.includes(link))) {
        message.delete().catch(console.error);
        message.author.send('No puedes enviar enlaces maliciosos.').catch(console.error);
    }

    if (message.content.includes('discord.gg/')) {
        message.delete().catch(console.error);
        message.author.send('No puedes enviar invitaciones de Discord.').catch(console.error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, user, channel } = interaction;

    if (commandName === 'ping') {
        await interaction.reply('Pong!');
    } else if (commandName === 'say') {
        const texto = options.getString('texto');
        await interaction.reply(texto);
    } else if (commandName === 'md_user') {
        const usuario = options.getUser('usuario');
        const mensaje = options.getString('mensaje');
        try {
            await usuario.send(mensaje);
            await interaction.reply(`Mensaje enviado a ${usuario.tag}.`);
        } catch (error) {
            console.error(error);
            await interaction.reply('No pude enviar el mensaje a ese usuario.');
        }
    } else if (commandName === 'ban') {
        const usuario = options.getUser('usuario');
        try {
            await interaction.guild.members.ban(usuario);
            await usuario.send('Has sido sancionado. Tipo de sanción aplicada: ban.').catch(console.error);
            await interaction.reply(`${usuario.tag} ha sido baneado.`);
        } catch (error) {
            console.error(error);
            await interaction.reply('No pude banear a ese usuario.');
        }
    } else if (commandName === 'kick') {
        const usuario = options.getUser('usuario');
        try {
            await interaction.guild.members.kick(usuario);
            await usuario.send('Has sido sancionado. Tipo de sanción aplicada: kick.').catch(console.error);
            await interaction.reply(`${usuario.tag} ha sido expulsado.`);
        } catch (error) {
            console.error(error);
            await interaction.reply('No pude expulsar a ese usuario.');
        }
    } else if (commandName === 'mute') {
        const usuario = options.getUser('usuario');
        const duracion = options.getInteger('duracion');
        try {
            let muteRole = interaction.guild.roles.cache.find(role => role.name === 'Muted');
            if (!muteRole) {
                muteRole = await interaction.guild.roles.create({
                    name: 'Muted',
                    permissions: [],
                    reason: 'Role created for muting users.',
                });
            }
            await usuario.roles.add(muteRole);
            setTimeout(() => {
                usuario.roles.remove(muteRole).catch(console.error);
            }, duracion * 60000);
            await usuario.send(`Has sido sancionado. Tipo de sanción aplicada: mute por ${duracion} minutos.`).catch(console.error);
            await interaction.reply(`${usuario.tag} ha sido silenciado por ${duracion} minutos.`);
        } catch (error) {
            console.error(error);
            await interaction.reply('No pude silenciar a ese usuario.');
        }
    } else if (commandName === 'warn') {
        const usuario = options.getUser('usuario');
        if (!userWarns[usuario.id]) {
            userWarns[usuario.id] = 0;
        }
        userWarns[usuario.id]++;
        await usuario.send(`Has sido sancionado. Tipo de sanción aplicada: warn. Advertencias acumuladas: ${userWarns[usuario.id]}.`).catch(console.error);
        await interaction.reply(`${usuario.tag} ha sido advertido. Advertencias acumuladas: ${userWarns[usuario.id]}.`);
    } else if (commandName === 'top') {
        const sortedUsers = Object.entries(userActivity).sort((a, b) => b[1] - a[1]).slice(0, 10);
        const embed = new EmbedBuilder()
            .setTitle('Usuarios más activos')
            .setColor(0x00AE86)
            .setDescription(sortedUsers.map(([userId, count], index) => `${index + 1}. <@${userId}> - ${count} mensajes`).join('\n'));
        await interaction.reply({ embeds: [embed] });
    } else if (commandName === 'autorole') {
        const subcommand = options.getSubcommand();
        const rol = options.getRole('rol');
        if (subcommand === 'add') {
            autoRoles.add(rol.id);
            await interaction.reply(`El rol ${rol.name} ha sido añadido como autorol.`);
        } else if (subcommand === 'remove') {
            autoRoles.delete(rol.id);
            await interaction.reply(`El rol ${rol.name} ha sido eliminado como autorol.`);
        }
    } else if (commandName === 'securemode') {
        const canal = options.getChannel('canal');
        secureChannels[canal.id] = true;
        await canal.setRateLimitPerUser(10);
        await interaction.reply(`El modo seguro ha sido activado en el canal ${canal.name}.`);
    } else if (commandName === 'invitechannel') {
        const subcommand = options.getSubcommand();
        const canal = options.getChannel('canal');
        if (subcommand === 'add') {
            inviteChannels[interaction.guild.id] = canal.id;
            await interaction.reply(`El canal de invitaciones ha sido establecido en ${canal.name}.`);
        } else if (subcommand === 'remove') {
            delete inviteChannels[interaction.guild.id];
            await interaction.reply(`El canal de invitaciones ha sido eliminado.`);
        }
    } else if (commandName === 'avatar') {
        let usuario = options.getUser('usuario');
        if (!usuario) {
            usuario = user; // Si no se pasa un usuario, usamos el que ejecutó el comando
        }
        const avatarURL = usuario.displayAvatarURL({ dynamic: true, size: 1024 });
        const embed = new EmbedBuilder()
            .setTitle(`${usuario.tag}'s Avatar`)
            .setImage(avatarURL);
        await interaction.reply({ embeds: [embed] });
    } else if (commandName === 'purge') {
        const cantidad = options.getInteger('cantidad');
        const deletedMessages = await channel.bulkDelete(cantidad, true);
        await interaction.reply(`${deletedMessages.size} mensajes han sido eliminados.`);
    }
});

client.login(token);
