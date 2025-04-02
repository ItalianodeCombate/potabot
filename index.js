const { Client, GatewayIntentBits, Routes, EmbedBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const keep_alive = require('./keep_alive.js'); // Requiere el archivo keep_alive.js
const https = require('https');

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
    { name: 'help', description: 'Muestra todos los comandos del bot' },
    { name: 'bienvenida', description: 'Establece un mensaje de bienvenida para los nuevos miembros', options: [{ name: 'mensaje', type: 3, description: 'Mensaje de bienvenida', required: true }] },
    { name: 'setlogchannel', description: 'Establece un canal para los registros de acciones del servidor', options: [{ name: 'canal', type: 7, description: 'Canal de registros', required: true }] },
];

const rest = new REST({ version: '10' }).setToken(token);
let userWarns = {};
let userActivity = {};
let autoRoles = new Set();
let secureChannels = {};
let actionLog = [];
let inviteChannels = {};
let invitesCache = new Map();
let logChannelId = {};  // Nuevo objeto para los canales de log
let welcomeMessages = {}; // Usaremos un objeto para almacenar mensajes de bienvenida por servidor

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

    // Cache invites on startup
    client.guilds.cache.forEach(async guild => {
        try {
            const invites = await guild.invites.fetch();
            invitesCache.set(guild.id, invites);
        } catch (error) {
            console.error(`Error fetching invites for guild ${guild.id}:`, error);
        }
    });
});

client.on('inviteCreate', async invite => {
    try {
        const invites = await invite.guild.invites.fetch();
        invitesCache.set(invite.guild.id, invites);
    } catch (error) {
        console.error(`Error fetching invites on create for guild ${invite.guild.id}:`, error);
    }
});

client.on('inviteDelete', async invite => {
    try {
        const invites = await invite.guild.invites.fetch();
        invitesCache.set(invite.guild.id, invites);
    } catch (error) {
        console.error(`Error fetching invites on delete for guild ${invite.guild.id}:`, error);
    }
});

client.on('guildMemberAdd', async member => {
    // Apply autoroles
    autoRoles.forEach(roleId => {
        const role = member.guild.roles.cache.get(roleId);
        if (role) {
            member.roles.add(role).catch(error => console.error(`Error adding autorole ${role.name} to ${member.user.tag}:`, error));
        }
    });

    // Track invites
    const channelId = inviteChannels[member.guild.id];
    if (channelId) {
        const channel = member.guild.channels.cache.get(channelId);
        if (channel) {
            try {
                const cachedInvites = invitesCache.get(member.guild.id) || new Map();
                const newInvites = await member.guild.invites.fetch();
                invitesCache.set(member.guild.id, newInvites);

                const invite = newInvites.find(i => cachedInvites.get(i.code) && cachedInvites.get(i.code).uses < i.uses);
                if (invite) {
                    channel.send(`${member.user.tag} fue invitado por ${invite.inviter.tag}. Invitaciones de ${invite.inviter.tag}: ${invite.uses}.`).catch(error => console.error(`Error sending invite log message:`, error));
                }
            } catch (error) {
                console.error(`Error fetching invites on member add for guild ${member.guild.id}:`, error);
            }
        }
    }

    // Send welcome message if defined
    const welcomeMessage = welcomeMessages[member.guild.id]; // Usamos el objeto welcomeMessages
    if (welcomeMessage) {
        member.send(welcomeMessage).catch(error => console.error(`Error sending welcome message to ${member.user.tag}:`, error));
    }
});

client.on('channelCreate', channel => logAction(channel.guild.id, channel.id, 'channelCreate'));
client.on('channelDelete', channel => logAction(channel.guild.id, channel.id, 'channelDelete'));
client.on('roleCreate', role => logAction(role.guild.id, role.id, 'roleCreate'));
client.on('roleDelete', role => logAction(role.guild.id, role.id, 'roleDelete'));

function logAction(guildId, actionId, type) {
    if (logChannelId[guildId]) {
        const logChannel = client.guilds.cache.get(guildId)?.channels.cache.get(logChannelId[guildId]);
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setTitle('Acción del servidor')
                .setDescription(`Tipo: ${type}\nID de la acción: ${actionId}`)
                .setColor(0x00AE86)
                .setTimestamp();
            logChannel.send({ embeds: [embed] }).catch(error => console.error(`Error sending log message:`, error));
        }
    }
}

client.on('messageCreate', message => {
    if (message.author.bot) return;
    const userId = message.author.id;
    if (!userActivity[userId]) {
        userActivity[userId] = 0;
    }
    userActivity[userId]++;

    const channelId = message.channel.id;
    if (secureChannels[channelId]) {
        message.channel.setRateLimitPerUser(10).catch(error => console.error(`Error setting rate limit for channel ${channelId}:`, error));
    }

    // Automoderación
    if (message.mentions.users.size > 5) {
        message.delete().catch(error => console.error(`Error deleting message with too many mentions:`, error));
        message.author.send('No puedes mencionar a tantas personas a la vez.').catch(error => console.error(`Error sending DM about too many mentions to ${userId}:`, error));
    }

    const maliciousLinks = ['example.com', 'malicious.com'];
    if (maliciousLinks.some(link => message.content.includes(link))) {
        message.delete().catch(error => console.error(`Error deleting message with malicious link:`, error));
        message.author.send('No puedes enviar enlaces maliciosos.').catch(error => console.error(`Error sending DM about malicious link to ${userId}:`, error));
    }

    if (message.content.includes('discord.gg/')) {
        message.delete().catch(error => console.error(`Error deleting Discord invite link:`, error));
        message.author.send('No puedes enviar invitaciones de Discord.').catch(error => console.error(`Error sending DM about Discord invite link to ${userId}:`, error));
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, user, channel, guild } = interaction;

    if (commandName === 'ping') {
        await interaction.reply('Pong!').catch(error => console.error(`Error responding to ping command:`, error));
    } else if (commandName === 'say') {
        const texto = options.getString('texto');
        await interaction.reply(texto).catch(error => console.error(`Error responding to say command:`, error));
    } else if (commandName === 'md_user') {
        const usuario = options.getUser('usuario');
        const mensaje = options.getString('mensaje');
        try {
            await usuario.send(mensaje);
            await interaction.reply(`Mensaje enviado a ${usuario.tag}.`).catch(error => console.error(`Error responding to md_user command:`, error));
        } catch (error) {
            console.error(`Error sending DM to ${usuario.tag}:`, error);
            await interaction.reply('No pude enviar el mensaje a ese usuario.').catch(error => console.error(`Error responding to md_user command (failure):`, error));
        }
    } else if (commandName === 'ban') {
        const usuario = options.getUser('usuario');
        try {
            await interaction.guild.members.ban(usuario);
            await usuario.send('Has sido sancionado. Tipo de sanción aplicada: ban.').catch(error => console.error(`Error sending ban DM to ${usuario.tag}:`, error));
            await interaction.reply(`${usuario.tag} ha sido baneado.`).catch(error => console.error(`Error responding to ban command:`, error));
        } catch (error) {
            console.error(`Error banning user ${usuario.tag}:`, error);
            await interaction.reply('No pude banear a ese usuario.').catch(error => console.error(`Error responding to ban command (failure):`, error));
        }
    } else if (commandName === 'kick') {
        const usuario = options.getUser('usuario');
        try {
            await interaction.guild.members.kick(usuario);
            await usuario.send('Has sido sancionado. Tipo de sanción aplicada: kick.').catch(error => console.error(`Error sending kick DM to ${usuario.tag}:`, error));
            await interaction.reply(`${usuario.tag} ha sido expulsado.`).catch(error => console.error(`Error responding to kick command:`, error));
        } catch (error) {
            console.error(`Error kicking user ${usuario.tag}:`, error);
            await interaction.reply('No pude expulsar a ese usuario.').catch(error => console.error(`Error responding to kick command (failure):`, error));
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
                // Potencialmente, también necesitas configurar los permisos del rol en los canales
                guild.channels.cache.forEach(async channel => {
                    try {
                        await channel.permissionOverwrites.edit(muteRole, { SendMessages: false, AddReactions: false });
                    } catch (error) {
                        console.error(`Error setting mute role permissions in channel ${channel.name}:`, error);
                    }
                });
            }
            await usuario.roles.add(muteRole).catch(error => console.error(`Error adding mute role to ${usuario.tag}:`, error));
            await usuario.send(`Has sido sancionado. Tipo de sanción aplicada: mute por ${duracion} minutos.`).catch(error => console.error(`Error sending mute DM to ${usuario.tag}:`, error));
            await interaction.reply(`${usuario.tag} ha sido silenciado por ${duracion} minutos.`).catch(error => console.error(`Error responding to mute command:`, error));
            setTimeout(() => {
                usuario.roles.remove(muteRole).catch(error => console.error(`Error removing mute role from ${usuario.tag}:`, error));
                usuario.send('Tu silencio ha terminado.').catch(error => console.error(`Error sending unmute DM to ${usuario.tag}:`, error));
            }, duracion * 60000);
        } catch (error) {
            console.error(`Error muting user ${usuario.tag}:`, error);
            await interaction.reply('No pude silenciar a ese usuario.').catch(error => console.error(`Error responding to mute command (failure):`, error));
        }
    } else if (commandName === 'warn') {
        const usuario = options.getUser('usuario');
        const userId = usuario.id;
        if (!userWarns[userId]) {
            userWarns[userId] = 0;
        }
        userWarns[userId]++;
        await usuario.send(`Has sido sancionado. Tipo de sanción aplicada: warn. Advertencias acumuladas: ${userWarns[userId]}.`).catch(error => console.error(`Error sending warn DM to ${usuario.tag}:`, error));
        await interaction.reply(`${usuario.tag} ha sido advertido. Advertencias acumuladas: ${userWarns[userId]}.`).catch(error => console.error(`Error responding to warn command:`, error));
    } else if (commandName === 'top') {
        const sortedUsers = Object.entries(userActivity)
            .sort(([, a], [, b]) => b - a) // Ordenar por valor descendente
            .slice(0, 10);
        const embed = new EmbedBuilder()
            .setTitle('Usuarios más activos')
            .setColor(0x00AE86)
            .setDescription(sortedUsers.map(([userId, count], index) => `${index + 1}. <@${userId}> - ${count} mensajes`).join('\n'));
        await interaction.reply({ embeds: [embed] }).catch(error => console.error(`Error responding to top command:`, error));
    } else if (commandName === 'autorole') {
        const subcommand = options.getSubcommand();
        const rol = options.getRole('rol');
        if (subcommand === 'add') {
            autoRoles.add(rol.id);
            await interaction.reply(`El rol ${rol.name} ha sido añadido como autorol.`).catch(error => console.error(`Error responding to autorole add command:`, error));
        } else if (subcommand === 'remove') {
            autoRoles.delete(rol.id);
            await interaction.reply(`El rol ${rol.name} ha sido eliminado como autorol.`).catch(error => console.error(`Error responding to autorole remove command:`, error));
        }
    } else if (commandName === 'securemode') {
        const canal = options.getChannel('canal');
        secureChannels[canal.id] = true;
        await canal.setRateLimitPerUser(10).catch(error => console.error(`Error setting rate limit for securemode in channel ${canal.name}:`, error));
        await interaction.reply(`El modo seguro ha sido activado en el canal ${canal.name}.`).catch(error => console.error(`Error responding to securemode command:`, error));
    } else if (commandName === 'invitechannel') {
        const subcommand = options.getSubcommand();
        const canal = options.getChannel('canal');
        if (subcommand === 'add') {
            inviteChannels[interaction.guild.id] = canal.id;
            await interaction.reply(`El canal de invitaciones ha sido establecido en ${canal.name}.`).catch(error => console.error(`Error responding to invitechannel add command:`, error));
        } else if (subcommand === 'remove') {
            delete inviteChannels[interaction.guild.id];
            await interaction.reply(`El canal de invitaciones ha sido eliminado.`).catch(error => console.error(`Error responding to invitechannel remove command:`, error));
        }
    } else if (commandName === 'avatar') {
        let usuario = options.getUser('usuario') || user; // Si no se pasa usuario, usa el que ejecuta el comando
        const avatarURL = usuario.displayAvatarURL({ dynamic: true, size: 1024 });
        const embed = new EmbedBuilder()
            .setTitle(`${usuario.tag}'s Avatar`)
            .setImage(avatarURL);
        await interaction.reply({ embeds: [embed] }).catch(error => console.error(`Error responding to avatar command:`, error));
    } else if (commandName === 'purge') {
        const cantidad = options.getInteger('cantidad');
        try {
            const deletedMessages = await channel.bulkDelete(cantidad, true);
            await interaction.reply(`${deletedMessages.size} mensajes han sido eliminados.`).catch(error => console.error(`Error responding to purge command:`, error));
        } catch (error) {
            console.error(`Error purging messages:`, error);
            await interaction.reply('No pude eliminar los mensajes. Asegúrate de tener los permisos necesarios.').catch(error => console.error(`Error responding to purge command (failure):`, error));
        }
    } else if (commandName === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('Comandos del Bot')
            .setDescription('Aquí tienes una lista de los comandos disponibles en el bot.')
            .setFooter({ text: '¡Disfruta de la experiencia!' })
            .setTimestamp()
            .addFields(
                { name: '/ping', value: 'Responde con un "Pong!"' },
                { name: '/say [texto]', value: 'Repite el texto que escribas.' },
                { name: '/ban [usuario]', value: 'Banea a un usuario del servidor.' },
                { name: '/kick [usuario]', value: 'Expulsa a un usuario del servidor.' },
                { name: '/mute [usuario] [duración]', value: 'Silencia a un usuario por un tiempo determinado.' },
                { name: '/unban [usuario_id]', value: 'Desbanea a un usuario usando su ID.' },
                { name: '/warn [usuario]', value: 'Advierte a un usuario.' },
                { name: '/top', value: 'Muestra los usuarios más activos.' },
                { name: '/autorole [add/remove] [rol]', value: 'Añade o elimina un autorol.' },
                { name: '/securemode [canal]', value: 'Activa el modo seguro en un canal.' },
                { name: '/invitechannel [add/remove] [canal]', value: 'Gestiona el canal de invitaciones.' },
                { name: '/avatar [usuario]', value: 'Muestra el avatar de un usuario.' },
                { name: '/purge [cantidad]', value: 'Elimina una cantidad específica de mensajes.' },
                { name: '/help', value: 'Muestra este mensaje de ayuda.' },
                { name: '/bienvenida [mensaje]', value: 'Establece un mensaje de bienvenida para nuevos miembros.' },
                { name: '/setlogchannel [canal]', value: 'Establece un canal para los registros de acciones del servidor.' }
            );

        await interaction.reply({ embeds: [helpEmbed] }).catch(error => console.error(`Error responding to help command:`, error));
    } else if (commandName === 'bienvenida') {
        const mensaje = options.getString('mensaje');
        welcomeMessages[guild.id] = mensaje; // Guardamos el mensaje de bienvenida por ID del servidor
        await interaction.reply(`Mensaje de bienvenida establecido: ${mensaje}`).catch(error => console.error(`Error responding to bienvenida command:`, error));
    } else if (commandName === 'setlogchannel') {
        const canal = options.getChannel('canal');
        logChannelId[guild.id] = canal.id;
        await interaction.reply(`Canal de registros establecido en ${canal.name}`).catch(error => console.error(`Error responding to setlogchannel command:`, error));
    }
});
