const Discord = require('discord.js');
const client = new Discord.Client({ intents: ["Guilds", "GuildMessages", "MessageContent"] });

const token = process.env.DISCORD_TOKEN;

client.on('ready', () => {
  console.log(`Bot logged in as ${client.user.tag}!`);

  // Establecer el estado del bot
  client.user.setActivity('Próximamente...', { type: 'PLAYING' }); // Puedes cambiar 'PLAYING' por otro tipo

  //Otras opciones de tipo son:
  //LISTENING: Escuchando
  //WATCHING: Viendo
  //COMPETING: Compitiendo
  //STREAMING: Transmitiendo.
});

client.on('messageCreate', (message) => {
  if (message.content === 'ping') {
    message.reply('pong!');
  }
});

client.login(token);
