const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('El bot está online!');
});

function keepAlive() {
  app.listen(3000, () => {
    console.log('Servidor iniciado en el puerto 3000');
  });
}

module.exports = { keepAlive };  // Exportar la función para que pueda ser llamada

