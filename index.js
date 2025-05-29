import express from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 🔐 Supabase config con tus datos reales
const supabaseUrl = 'https://nicjdgftcsnoxmmilait.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pY2pkZ2Z0Y3Nub3htbWlsYWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMDAwMzEsImV4cCI6MjA2MTU3NjAzMX0.e2vnZAzaXwMMUx7PaZ567knYIivaXhtFY2LLpyE6NG4';
// Cliente "admin" para login, sin token
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

// 🔐 Clave JWT
const JWT_SECRET = 'MiClaveSuperSecreta123!@#';

// Helper para crear cliente Supabase con token (para RLS)
function createSupabaseClientWithToken(token) {
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

// Middleware para validar token y crear cliente supabase con token
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No autorizado, falta token' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado, token mal formado' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Guarda datos del usuario en req.user
    req.supabaseUser = createSupabaseClientWithToken(token); // Cliente supabase con token
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Ruta base
app.get('/', (req, res) => {
  res.send('API de SAVIO funcionando correctamente 🚀');
});

// Ruta de login (sin auth)
app.post('/login', async (req, res) => {
  const { correo_electronico, contrasena } = req.body;

  if (!correo_electronico || !contrasena) {
    return res.status(400).json({ error: 'Faltan el correo o la contraseña' });
  }

  const { data: users, error } = await supabaseAdmin
    .from('usuarios')
    .select('*')
    .ilike('correo_electronico', correo_electronico)
    .limit(1);

  if (error) return res.status(500).json({ error: 'Error al consultar la base de datos' });
  if (!users || users.length === 0) return res.status(401).json({ error: 'Usuario no encontrado' });

  const user = users[0];
  if (user.contrasena !== contrasena) return res.status(401).json({ error: 'Contraseña incorrecta' });

  const token = jwt.sign(
    {
      idusuario: user.idusuario,
      correo_electronico: user.correo_electronico,
      rol: user.rol,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    message: 'Inicio de sesión exitoso',
    token,
    userId: user.idusuario,
    nombre: user.nombre,
    correo_electronico: user.correo_electronico,
    rol: user.rol,
  });
});

// Ruta para obtener todos los datos del usuario (usa auth)
app.get('/usuario/:idusuario/datos', authMiddleware, async (req, res) => {
  const { idusuario } = req.params;

  if (req.user.idusuario !== idusuario)
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

  if (req.user.idusuario !== idusuario)
    return res.status(403).json({ error: 'No tienes permiso para ver estas notas' });

  const { data, error } = await req.supabaseUser.from('notas').select('*').eq('idusuario', idusuario);

  if (error) return res.status(500).json({ error: 'Error al obtener notas' });

  res.json(data);
});

// ➕ Crear una nueva nota (usa auth)
app.post('/usuario/:idusuario/notas', authMiddleware, async (req, res) => {
  const { idusuario } = req.params;
  const { titulo, contenido } = req.body;

  if (req.user.idusuario !== idusuario)
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

  if (req.user.idusuario !== idusuario)
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

  if (req.user.idusuario !== idusuario)
    return res.status(403).json({ error: 'No tienes permiso para eliminar esta nota' });

  const { error } = await req.supabaseUser.from('notas').delete().eq('idnota', idnota).eq('idusuario', idusuario);

  if (error) return res.status(500).json({ error: 'Error al eliminar nota' });

  res.status(204).send();
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
