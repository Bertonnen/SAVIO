const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Datos en memoria
let notas = [];
let idCounter = 1;

// Ruta base para test
app.get('/', (req, res) => {
  res.send('API de SAVIO funcionando correctamente 🚀');
});

// Obtener todas las notas
app.get('/notas', (req, res) => {
  res.json(notas);
});

// Crear una nota
app.post('/notas', (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Faltan campos' });
  }
  const nuevaNota = { id: idCounter++, title, content };
  notas.push(nuevaNota);
  res.status(201).json(nuevaNota);
});

// Obtener nota por id
app.get('/notas/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const nota = notas.find(n => n.id === id);
  if (!nota) return res.status(404).json({ error: 'Nota no encontrada' });
  res.json(nota);
});

// Actualizar nota por id
app.put('/notas/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { title, content } = req.body;
  const notaIndex = notas.findIndex(n => n.id === id);
  if (notaIndex === -1) return res.status(404).json({ error: 'Nota no encontrada' });
  
  notas[notaIndex] = { id, title, content };
  res.json(notas[notaIndex]);
});

// Borrar nota por id
app.delete('/notas/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const notaIndex = notas.findIndex(n => n.id === id);
  if (notaIndex === -1) return res.status(404).json({ error: 'Nota no encontrada' });
  
  notas.splice(notaIndex, 1);
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
