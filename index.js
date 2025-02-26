const Discord = require('discord.js');
const keep_alive = require('./keep_alive.js');
const { Client, GatewayIntentBits, Routes, EmbedBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const token = process.env.DISCORD_TOKEN;
const commands = [
    {
        name: 'ping',
        description: 'Responde con pong!',
    },
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
            { name: 'duracion', type: 4, description: 'Duracion del silencio en minutos', required: true },
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
];

const rest = new REST({ version: '10' }).setToken(token);
const userWarns = {};
const afkUsers = {};
const userActivity = {};

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
