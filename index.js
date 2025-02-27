const Discord = require('discord.js');
const { Client, GatewayIntentBits, Routes, EmbedBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildInviteReactions, GatewayIntentBits.GuildMessageReactions] });
const token = process.env.DISCORD_TOKEN;

const commands = [
    { name: 'ping', description: 'Responde con pong!' },
    {
        name: 'say',
        description: 'Repite lo que digas',
        options: [{ name: 'texto', type: 3, description: 'Texto a repetir', required: true }],
    },
    {
        name: 'ban',
        description: 'Banea a un usuario',
        options: [{ name: 'usuario', type: 6, description: 'Usuario a banear', required: true }],
    },
    {
        name: 'kick',
        description: 'Expulsa a un usuario',
        options: [{ name: 'usuario', type: 6, description: 'Usuario a expulsar', required: true }],
    },
    {
        name: 'mute',
        description: 'Silencia a un usuario',
        options: [
            { name: 'usuario', type: 6, description: 'Usuario a silenciar', required: true },
            { name: 'duracion', type: 4, description: 'Duración del silencio en minutos', required: true },
        ],
    },
    {
        name: 'unban',
        description: 'Desbanea a un usuario',
        options: [{ name: 'usuario_id', type: 3, description: 'ID del usuario a desbanear', required: true }],
    },
    {
        name: 'unmute',
        description: 'Desilencia a un usuario',
        options: [{ name: 'usuario', type: 6, description: 'Usuario a desilenciar', required: true }],
    },
    {
        name: 'warn',
        description: 'Advierte a un usuario',
        options: [{ name: 'usuario', type: 6, description: 'Usuario a advertir', required: true }],
    },
    {
        name: 'afk',
        description: 'Activa/desactiva tu estado AFK',
    },
    {
        name: 'md_user',
        description: 'Envía un mensaje directo a un usuario específico',
        options: [
            { name: 'usuario', type: 6, description: 'Usuario a quien enviar el mensaje', required: true },
            { name: 'mensaje', type: 3, description: 'Mensaje a enviar', required: true },
        ],
    },
    {
        name: 'lockdown',
        description: 'Bloquea el canal actual',
    },
    {
        name: 'avatar',
        description: 'Muestra el avatar de un usuario',
        options: [{ name: 'usuario', type: 6, description: 'Usuario del que mostrar el avatar', required: false }],
    },
    {
        name: 'purge',
        description: 'Elimina una cantidad específica de mensajes',
        options: [{ name: 'cantidad', type: 4, description: 'Cantidad de mensajes a eliminar', required: true }],
    },
    {
        name: 'top',
        description: 'Muestra los usuarios más activos',
    },
    {
        name: 'autorole add',
        description: 'Añade un rol como autorol',
        options: [{ name: 'rol', type: 8, description: 'Rol a agregar como autorol', required: true }],
    },
    {
        name: 'autorole remove',
        description: 'Remueve un rol de autorol',
        options: [{ name: 'rol', type: 8, description: 'Rol a remover de autorol', required: true }],
    },
    {
        name: 'securemode',
        description: 'Establece un tiempo de espera entre mensajes en un canal',
        options: [{ name: 'canal', type: 7, description: 'Canal donde aplicar el secure mode', required: true }],
    },
    {
        name: 'invitechannel',
        description: 'Configura un canal donde se enviará un mensaje cada vez que un usuario entre',
        options: [{ name: 'canal', type: 7, description: 'Canal donde se enviará el mensaje', required: true }],
    },
];

const rest = new REST({ version: '10' }).setToken(token);
const userWarns = {};
const afkUsers = {};
const userActivity = {};
const userInfractions = {}; // Para llevar el control de las infracciones de cada usuario.
const autoroles = [];
const raidEvents = [];

const zalgoRegex = /[\u0300-\u036f]/; // Detecta ZALGO en el texto (caracteres diacríticos combinados)
const inviteRegex = /discord\.gg|discord\.com|discordapp\.com/; // Detecta invitaciones de Discord.
const floodRegex = /(.)\1{4,}/; // Detecta flood (repetición de caracteres más de 4 veces seguidas)
const emojiSpamRegex = /(:[a-zA-Z0-9_]+:)+/; // Detecta spam de emojis.
const imageSpamRegex = /\.(jpg|jpeg|png|gif|webp|tiff|bmp)$/; // Detecta spam de imágenes (URLs que terminan en .jpg, .png, etc.)

// Definir la configuración de spam de imágenes
const imageSpamLimit = 5; // Límite de imágenes permitidas en el intervalo
const imageSpamInterval = 10000; // Intervalo de tiempo en ms (10 segundos)

// Mantenemos un registro de las imágenes enviadas por los usuarios
const userImageSpam = {};

function checkAutoModRules(message) {
    if (floodRegex.test(message.content)) {
        return 'flood';
    }
    if (inviteRegex.test(message.content)) {
        return 'invite';
    }
    if (zalgoRegex.test(message.content)) {
        return 'zalgo';
    }
    if (emojiSpamRegex.test(message.content)) {
        return 'emoji_spam';
    }
    if (imageSpamRegex.test(message.content)) {
        return 'image_spam';
    }
    return null;
}

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

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!userActivity[message.author.id]) {
        userActivity[message.author.id] = 0;
    }
    userActivity[message.author.id]++;

    // Verificación de las reglas de automoderación
    const infraction = checkAutoModRules(message);
    if (infraction) {
        const user = message.author;
        if (!userInfractions[user.id]) {
            userInfractions[user.id] = {};
        }

        // Inicializar las infracciones para esta regla
        if (!userInfractions[user.id][infraction]) {
            userInfractions[user.id][infraction] = 0;
        }

        userInfractions[user.id][infraction]++;

        if (userInfractions[user.id][infraction] === 1) {
            // Primera infracción: Eliminar el mensaje
            await message.delete();
            await message.channel.send(`${user.tag}, has infringido la regla: ${infraction}. Tu mensaje ha sido eliminado.`);
        } else if (userInfractions[user.id][infraction] === 2) {
            // Segunda infracción: Silenciar temporalmente (timeout)
            const member = await message.guild.members.fetch(user.id);
            await member.timeout(3600000); // 1 hora = 3600000 ms
            await message.channel.send(`${user.tag}, has infringido la regla: ${infraction} por segunda vez. Has sido silenciado durante 1 hora.`);
            // Reseteamos las infracciones de esta regla
            userInfractions[user.id][infraction] = 0;
        }
    }

    // Verificación de spam de imágenes
    if (imageSpamRegex.test(message.content)) {
        const user = message.author;

        // Verificar si el usuario tiene registros previos de spam de imágenes
        if (!userImageSpam[user.id]) {
            userImageSpam[user.id] = [];
        }

        // Limpiar registros antiguos de imágenes (si pasó más de 'imageSpamInterval' ms)
        userImageSpam[user.id] = userImageSpam[user.id].filter(timestamp => Date.now() - timestamp < imageSpamInterval);

        // Agregar la nueva imagen al registro de imágenes enviadas
        userImageSpam[user.id].push(Date.now());

        // Si el usuario ha enviado más de 'imageSpamLimit' imágenes en el intervalo
        if (userImageSpam[user.id].length > imageSpamLimit) {
            // Primera infracción: Eliminar el mensaje
            await message.delete();
            await message.channel.send(`${user.tag}, has enviado demasiadas imágenes en un corto período de tiempo. Tu mensaje ha sido eliminado.`);

            // Segunda infracción: Silenciar temporalmente
            setTimeout(async () => {
                const member = await message.guild.members.fetch(user.id);
                await member.timeout(3600000); // 1 hora = 3600000 ms
                await message.channel.send(`${user.tag}, has sido silenciado durante 1 hora por enviar demasiadas imágenes.`);
            }, 5000); // Aplazar para dar tiempo a la eliminación del mensaje.
        }
    }
});

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
            await interaction.reply(`${usuario.tag} ha sido baneado.`);
            usuario.send('Has sido baneado por un moderador del servidor.');
        } catch (error) {
            console.error(error);
            await interaction.reply('No pude banear a ese usuario.');
        }
    } else if (commandName === 'kick') {
        const usuario = options.getUser('usuario');
        try {
            await interaction.guild.members.kick(usuario);
            await interaction.reply(`${usuario.tag} ha sido expulsado.`);
            usuario.send('Has sido expulsado por un moderador del servidor.');
        } catch (error) {
            console.error(error);
            await interaction.reply('No pude expulsar a ese usuario.');
        }
    } else if (commandName === 'mute') {
        const usuario = options.getUser('usuario');
        const duracion = options.getInteger('duracion');
        try {
            await interaction.guild.members.cache.get(usuario.id).timeout(duracion * 60000);
            await interaction.reply(`${usuario.tag} ha sido silenciado durante ${duracion} minutos.`);
            usuario.send(`Has sido silenciado durante ${duracion} minutos.`);
        } catch (error) {
            console.error(error);
            await interaction.reply('No pude silenciar a ese usuario.');
        }
    } else if (commandName === 'unban') {
        const usuarioId = options.getString('usuario_id');
        try {
            await interaction.guild.members.unban(usuarioId);
            await interaction.reply(`El usuario con ID ${usuarioId} ha sido desbaneado.`);
        } catch (error) {
            console.error(error);
            await interaction.reply('No pude desbanear a ese usuario.');
        }
    } else if (commandName === 'unmute') {
        const usuario = options.getUser('usuario');
        try {
            await interaction.guild.members.cache.get(usuario.id).timeout(null);
            await interaction.reply(`${usuario.tag} ha sido desilenciado.`);
            usuario.send('Has sido desilenciado.');
        } catch (error) {
            console.error(error);
            await interaction.reply('No pude desilenciar a ese usuario.');
        }
    } else if (commandName === 'warn') {
        const usuario = options.getUser('usuario');
        if (!userWarns[usuario.id]) {
            userWarns[usuario.id] = 0;
        }
        userWarns[usuario.id]++;
        await interaction.reply(`${usuario.tag} ha sido advertido. Total de advertencias: ${userWarns[usuario.id]}`);
    } else if (commandName === 'afk') {
        if (afkUsers[user.id]) {
            delete afkUsers[user.id];
            await interaction.reply('Ya no estás AFK.');
        } else {
            afkUsers[user.id] = true;
            await interaction.reply('Ahora estás AFK.');
        }
    } else if (commandName === 'md_user') {
        const usuario = options.getUser('usuario');
        const mensaje = options.getString('mensaje');
        try {
            await usuario.send(mensaje);
            await interaction.reply(`Mensaje enviado a ${usuario.tag}.`);
        } catch (error) {
            console.error(error);
            await interaction.reply('No pude enviar el mensaje. Asegúrate de que el usuario tenga los mensajes directos activados.');
        }
    } else if (commandName === 'lockdown') {
        try {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SEND_MESSAGES: false });
            await interaction.reply('Canal bloqueado.');
        } catch (error) {
            console.error(error);
            await interaction.reply('No pude bloquear el canal.');
        }
    } else if (commandName === 'avatar') {
        const usuario = options.getUser('usuario') || user;
        const avatarURL = usuario.displayAvatarURL({ dynamic: true, size: 1024 });
        await interaction.reply({ content: `${usuario.tag}'s avatar:`, files: [avatarURL] });
    } else if (commandName === 'purge') {
        const cantidad = options.getInteger('cantidad');
        if (cantidad && cantidad > 0 && cantidad <= 100) {
            try {
                await interaction.channel.bulkDelete(cantidad, true);
                await interaction.reply(`Se han eliminado ${cantidad} mensajes.`);
            } catch (error) {
                console.error(error);
                await interaction.reply('No pude eliminar los mensajes.');
            }
        } else {
            await interaction.reply('Por favor, ingresa un número válido entre 1 y 100.');
        }
    } else if (commandName === 'top') {
        // Mostrar los usuarios más activos con un embed
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Usuarios más activos')
            .setDescription('Lista de los usuarios más activos en el servidor.')
            .setTimestamp()
            .setFooter({ text: 'Bot by YourBotName' });

        Object.entries(userActivity)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .forEach(([userId, activity]) => {
                embed.addFields({ name: `Usuario: <@${userId}>`, value: `Actividad: ${activity}`, inline: true });
            });

        await interaction.reply({ embeds: [embed] });
    } else if (commandName === 'autorole add') {
        const rol = options.getRole('rol');
        if (!autoroles.includes(rol.id)) {
            autoroles.push(rol.id);
            await interaction.reply(`Rol ${rol.name} añadido como autorol.`);
        } else {
            await interaction.reply(`El rol ${rol.name} ya es un autorol.`);
        }
    } else if (commandName === 'autorole remove') {
        const rol = options.getRole('rol');
        const index = autoroles.indexOf(rol.id);
        if (index !== -1) {
            autoroles.splice(index, 1);
            await interaction.reply(`Rol ${rol.name} removido de los autoroles.`);
        } else {
            await interaction.reply(`El rol ${rol.name} no es un autorol.`);
        }
    } else if (commandName === 'securemode') {
        const canal = options.getChannel('canal');
        await canal.setRateLimitPerUser(10);
        await interaction.reply(`El tiempo de espera entre mensajes en ${canal.name} se ha establecido en 10 segundos.`);
    } else if (commandName === 'invitechannel') {
        const canal = options.getChannel('canal');
        // Guardar en algún lugar para usar después cuando se detecte un nuevo miembro en el servidor.
        await interaction.reply(`Se ha configurado el canal ${canal.name} para enviar el mensaje cuando un nuevo miembro se una.`);
    }
});

client.login(token);
