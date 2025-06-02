import express from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const supabaseUrl = 'https://nicjdgftcsnoxmmilait.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pY2pkZ2Z0Y3Nub3htbWlsYWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMDAwMzEsImV4cCI6MjA2MTU3NjAzMX0.e2vnZAzaXwMMUx7PaZ567knYIivaXhtFY2LLpyE6NG4';
const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_SECRET = 'MiClaveSuperSecreta123!@#';

// 🔐 Middleware: verificar token JWT
const verificarToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token no proporcionado' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Token inválido' });
  }
};

// Rutas

app.get('/', (req, res) => {
  res.send('API de SAVIO funcionando correctamente 🚀');
});

app.post('/login', async (req, res) => {
  const { correo_electronico, contrasena } = req.body;

  if (!correo_electronico || !contrasena) {
    return res.status(400).json({ error: 'Faltan el correo o la contraseña' });
  }

  const { data: users, error } = await supabase
    .from('usuarios')
    .select('*')
    .ilike('correo_electronico', correo_electronico)
    .limit(1);

  if (error) return res.status(500).json({ error: 'Error al consultar la base de datos' });
  if (!users || users.length === 0) return res.status(401).json({ error: 'Usuario no encontrado' });

  const user = users[0];

  if (user.contrasena !== contrasena) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  const token = jwt.sign(
    {
      idusuario: user.idusuario,
      correo_electronico: user.correo_electronico,
      rol: user.rol
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
    rol: user.rol
  });
});

app.get('/usuario/:idusuario/datos', async (req, res) => {
  const { idusuario } = req.params;
  const tablas = ['configuracion', 'eventos', 'notas', 'recordatorios', 'productos_lista', 'listas_compras'];
  const resultados = {};

  try {
    for (const tabla of tablas) {
      const { data, error } = await supabase
        .from(tabla)
        .select('*')
        .eq('idusuario', idusuario);

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

app.get('/notas/:idusuario', async (req, res) => {
  const { idusuario } = req.params;

  try {
    const { data, error } = await supabase
      .from('notas')
      .select('*')
      .eq('idusuario', idusuario);

    if (error) {
      console.error('Error al consultar notas:', error);
      return res.status(500).json({ error: 'Error al obtener notas' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error inesperado al obtener notas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/notas', async (req, res) => {
  const { titulo, contenido, idusuario } = req.body;

  if (!titulo || !contenido || !idusuario) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  try {
    const { data, error } = await supabase
      .from('notas')
      .insert([{ titulo, contenido, idusuario }])
      .select()
      .single();

    if (error) {
      console.error('Error al insertar nota:', error);
      return res.status(500).json({ error: error.message || 'Error al crear nota' });
    }

    res.status(201).json({ message: 'Nota creada', nota: data });
  } catch (error) {
    console.error('Error inesperado al crear nota:', error);
    res.status(500).json({ error: 'Error inesperado' });
  }
});

// 🗑️ Eliminar nota segura con token y verificación de propietario
app.delete('/notas/:idnota', verificarToken, async (req, res) => {
  const { idnota } = req.params;
  const idusuario = req.user.idusuario;

  try {
    // Verificar que la nota existe y pertenece al usuario
    const { data: nota, error: errorNota } = await supabase
      .from('notas')
      .select('idnota, idusuario')
      .eq('idnota', idnota)
      .single();

    if (errorNota || !nota) {
      return res.status(404).json({ error: 'Nota no encontrada' });
    }

    if (nota.idusuario !== idusuario) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar esta nota' });
    }

    const { error } = await supabase
      .from('notas')
      .delete()
      .eq('idnota', idnota);

    if (error) {
      console.error('Error al eliminar nota:', error);
      return res.status(500).json({ error: 'Error al eliminar nota' });
    }

    res.json({ message: 'Nota eliminada correctamente' });
  } catch (error) {
    console.error('Error inesperado al eliminar nota:', error);
    res.status(500).json({ error: 'Error inesperado' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
