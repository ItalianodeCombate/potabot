const { Client, GatewayIntentBits, Routes, EmbedBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const token = process.env.DISCORD_TOKEN;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildMessageReactions
    ]
});

const rest = new REST({ version: '10' }).setToken(token);

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
        name: 'autorole',
        description: 'Añadir o quitar un autorol',
        options: [
            { name: 'add', type: 5, description: 'Añadir autorol', required: false },
            { name: 'remove', type: 5, description: 'Eliminar autorol', required: false },
            { name: 'rol', type: 8, description: 'Rol', required: true }
        ]
    },
    {
        name: 'securemode',
        description: 'Establecer un modo seguro en un canal con tiempo de espera entre mensajes',
        options: [{ name: 'canal', type: 7, description: 'Canal a aplicar el modo seguro', required: true }]
    },
    {
        name: 'invitechannel',
        description: 'Establece un canal para ver las invitaciones',
        options: [{ name: 'canal', type: 7, description: 'Canal a establecer', required: true }]
    }
];

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

    // Anti-Spam (flood)
    if (message.content.includes('flood')) {
        await message.delete();
        await message.channel.send(`${message.author.tag}, no puedes hacer flood.`);
    }

    // Anti-raid: Detectar usuarios que se unen rápidamente
    if (message.guild) {
        const members = message.guild.members.cache.filter(member => !member.user.bot);
        if (members.size > 5) { // Ajusta el número de miembros que se deben unir en un corto periodo
            await message.channel.send('¡Advertencia! Parece que hay un posible raid en curso.');
        }
    }
});

client.on('guildMemberAdd', async (member) => {
    // Bienvenida en MD al usuario que se une
    try {
        await member.send(`¡Bienvenido a ${member.guild.name}, ${member.user.username}! Estamos felices de tenerte con nosotros.`);
    } catch (error) {
        console.log('No se pudo enviar un mensaje directo al nuevo miembro');
    }

    // Mensaje de bienvenida en el canal (puedes cambiar el canal de bienvenida)
    const bienvenidaCanal = member.guild.channels.cache.find(channel => channel.name === 'bienvenida');
    if (bienvenidaCanal) {
        bienvenidaCanal.send(`¡Bienvenido ${member.user.username} al servidor! Por favor, lee las reglas.`);
    }
});

client.on('guildMemberRemove', async (member) => {
    // Mensaje de despedida cuando alguien se va
    const despedidaCanal = member.guild.channels.cache.find(channel => channel.name === 'despedida');
    if (despedidaCanal) {
        despedidaCanal.send(`Adiós ${member.user.username}, ¡esperamos verte pronto!`);
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
            await usuario.send(`Has sido baneado de ${interaction.guild.name}`);
        } catch (error) {
            console.error(error);
            await interaction.reply('No pude banear a ese usuario.');
        }
    } else if (commandName === 'kick') {
        const usuario = options.getUser('usuario');
        try {
            await interaction.guild.members.kick(usuario);
            await interaction.reply(`${usuario.tag} ha sido expulsado.`);
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
        } catch (error) {
            console.error(error);
            await interaction.reply('No pude desilenciar a ese usuario.');
        }
    } else if (commandName === 'warn') {
        const usuario = options.getUser('usuario');
        await interaction.reply(`${usuario.tag} ha sido advertido.`);
        // Aquí puedes añadir un sistema de advertencias o el registro de advertencias
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
            await interaction.reply('No pude enviar el mensaje.');
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
        const embed = new EmbedBuilder()
            .setTitle('Top Usuarios Activos')
            .setDescription('Lista de los usuarios más activos.')
            .addFields(
                { name: 'Usuario 1', value: 'Actividad: 10 mensajes', inline: true },
                { name: 'Usuario 2', value: 'Actividad: 8 mensajes', inline: true }
            )
            .setColor('#3498db');
        await interaction.reply({ embeds: [embed] });
    }
});

client.login(token);

