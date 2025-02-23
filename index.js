const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const token = 'MTM0Mjk0Njc2MzE2MTYwNDE5Nw.GDRk1k.6NtbV-Xmz_VfhvMWX5ryuPctY7IEDyDxF501c8'; // Reemplaza con el token de tu bot

client.on('ready', () => {
  console.log(`Bot conectado como ${client.user.tag}`);
});

client.on('messageCreate', message => {
  if (message.content === '!ping') {
    message.reply('Pong!');
  } else if (message.content === '!ip') {
    message.reply('<:pepe_happy:1232008882935693322> **armaklandia.hidenmc.com**\n\n1.8 - 1.21.4\n<@1021789210212053042>');
  }
});

client.login(token);