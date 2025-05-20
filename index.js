import express from 'express'
import { createClient } from '@supabase/supabase-js'

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Configura tu cliente Supabase
const SUPABASE_URL = 'https://tu-proyecto.supabase.co'  // reemplaza con tu URL Supabase
const SUPABASE_KEY = 'tu-anon-public-key'              // reemplaza con tu clave anon public
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Ruta base para test
app.get('/', (req, res) => {
  res.send('API de SAVIO funcionando correctamente 🚀');
});

// Obtener todas las notas desde Supabase
app.get('/notas', async (req, res) => {
  const { data, error } = await supabase
    .from('notas')
    .select('*')

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
});

// Crear una nota en Supabase
app.post('/notas', async (req, res) => {
  const { titulo, contenido, idUsuario } = req.body;
  if (!titulo || !contenido || !idUsuario) {
    return res.status(400).json({ error: 'Faltan campos' });
  }

  const { data, error } = await supabase
    .from('notas')
    .insert([{ titulo, contenido, idusuario: idUsuario }])  // ajusta el nombre del campo si es necesario

  if (error) return res.status(500).json({ error: error.message })

  res.status(201).json(data[0]);
});

// Obtener nota por id desde Supabase
app.get('/notas/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { data, error } = await supabase
    .from('notas')
    .select('*')
    .eq('idnota', id)
    .single()

  if (error) return res.status(404).json({ error: 'Nota no encontrada' })
  res.json(data)
});

// Actualizar nota por id en Supabase
app.put('/notas/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { titulo, contenido } = req.body;

  const { data, error } = await supabase
    .from('notas')
    .update({ titulo, contenido })
    .eq('idnota', id)

  if (error) return res.status(404).json({ error: 'Nota no encontrada' })
  res.json(data[0])
});

// Borrar nota por id en Supabase
app.delete('/notas/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  const { error } = await supabase
    .from('notas')
    .delete()
    .eq('idnota', id)

  if (error) return res.status(404).json({ error: 'Nota no encontrada' })
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
