import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Inicializa supabase con tu Project URL y anon key
const supabaseUrl = 'https://nicjdgftcsnoxmmilait.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pY2pkZ2Z0Y3Nub3htbWlsYWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMDAwMzEsImV4cCI6MjA2MTU3NjAzMX0.e2vnZAzaXwMMUx7PaZ567knYIivaXhtFY2LLpyE6NG4';

const supabase = createClient(supabaseUrl, supabaseKey);

// Ruta base para test
app.get('/', (req, res) => {
  res.send('API de SAVIO funcionando correctamente 🚀');
});

// Obtener todas las notas desde Supabase
app.get('/notas', async (req, res) => {
  const { data, error } = await supabase
    .from('notas')  // nombre de tu tabla en la base de datos
    .select('*');

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// Crear una nota en Supabase
app.post('/notas', async (req, res) => {
  const { title, content, userId } = req.body;

  if (!title || !content || !userId) {
    return res.status(400).json({ error: 'Faltan campos (title, content, userId)' });
  }

  const { data, error } = await supabase
    .from('notas')  // nombre tabla
    .insert([{ titulo: title, contenido: content, idusuario: userId }])
    .select();

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data[0]);
});

// Puedes añadir el resto de endpoints (GET by id, PUT, DELETE) si quieres

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
