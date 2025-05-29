import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 🔐 Supabase config con tus datos reales
const supabaseUrl = 'https://nicjdgftcsnoxmmilait.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pY2pkZ2Z0Y3Nub3htbWlsYWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMDAwMzEsImV4cCI6MjA2MTU3NjAzMX0.e2vnZAzaXwMMUx7PaZ567knYIivaXhtFY2LLpyE6NG4';

const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware para validar token y extraer usuario Supabase
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No autorizado, falta token' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado, token mal formado' });

  try {
    // Obtener usuario del token con Supabase Auth API
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) return res.status(401).json({ error: 'Token inválido o expirado' });

    req.user = user;

    // Crear cliente Supabase con token para respetar RLS
    req.supabaseUser = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    next();
  } catch (err) {
    console.error('Error validando token:', err);
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Ruta base
app.get('/', (req, res) => {
  res.send('API de SAVIO funcionando correctamente 🚀');
});

// Ya no es necesario el login en backend, el frontend usará Supabase Auth directamente para login
// Si quieres, podrías crear rutas para refrescar token o signup, pero no es obligatorio

// Ruta para obtener todos los datos del usuario (usa auth)
app.get('/usuario/:idusuario/datos', authMiddleware, async (req, res) => {
  const { idusuario } = req.params;

  if (req.user.id !== idusuario)
    return res.status(403).json({ error: 'No tienes permiso para ver estos datos' });

  try {
    const tablas = ['configuracion', 'eventos', 'notas', 'recordatorios', 'productos_lista', 'listas_compras'];
    const resultados = {};

    for (const tabla of tablas) {
      const { data, error } = await req.supabaseUser.from(tabla).select('*').eq('idusuario', idusuario);

      if (error) {
        console.error(`Error en tabla ${tabla}:`, error.message);
        return res.status(500).json({ error: `Error al consultar la tabla ${tabla}` });
      }

      resultados[tabla] = data;
    }

    res.json(resultados);
  } catch (error) {
    console.error('Error inesperado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 📒 Obtener todas las notas de un usuario (usa auth)
app.get('/usuario/:idusuario/notas', authMiddleware, async (req, res) => {
  const { idusuario } = req.params;

  if (req.user.id !== idusuario)
    return res.status(403).json({ error: 'No tienes permiso para ver estas notas' });

  const { data, error } = await req.supabaseUser.from('notas').select('*').eq('idusuario', idusuario);

  if (error) return res.status(500).json({ error: 'Error al obtener notas' });

  res.json(data);
});

// ➕ Crear una nueva nota (usa auth)
app.post('/usuario/:idusuario/notas', authMiddleware, async (req, res) => {
  const { idusuario } = req.params;
  const { titulo, contenido } = req.body;

  if (req.user.id !== idusuario)
    return res.status(403).json({ error: 'No tienes permiso para crear notas para este usuario' });

  const { data, error } = await req.supabaseUser.from('notas').insert([{ idusuario, titulo, contenido }]).select();

  if (error) {
    console.error('Error al crear nota:', error.message);
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json(data[0]);
});

// ✏️ Actualizar nota (usa auth)
app.put('/usuario/:idusuario/notas/:idnota', authMiddleware, async (req, res) => {
  const { idusuario, idnota } = req.params;
  const { titulo, contenido } = req.body;

  if (req.user.id !== idusuario)
    return res.status(403).json({ error: 'No tienes permiso para actualizar esta nota' });

  const { data, error } = await req.supabaseUser
    .from('notas')
    .update({ titulo, contenido })
    .eq('idnota', idnota)
    .eq('idusuario', idusuario)
    .select();

  if (error) return res.status(500).json({ error: 'Error al actualizar nota' });

  res.json(data[0]);
});

// 🗑️ Eliminar nota (usa auth)
app.delete('/usuario/:idusuario/notas/:idnota', authMiddleware, async (req, res) => {
  const { idusuario, idnota } = req.params;

  if (req.user.id !== idusuario)
    return res.status(403).json({ error: 'No tienes permiso para eliminar esta nota' });

  const { error } = await req.supabaseUser.from('notas').delete().eq('idnota', idnota).eq('idusuario', idusuario);

  if (error) return res.status(500).json({ error: 'Error al eliminar nota' });

  res.status(204).send();
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
