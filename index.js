import express from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 🔐 Supabase config con tus datos reales
const supabaseUrl = 'https://nicjdgftcsnoxmmilait.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pY2pkZ2Z0Y3Nub3htbWlsYWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMDAwMzEsImV4cCI6MjA2MTU3NjAzMX0.e2vnZAzaXwMMUx7PaZ567knYIivaXhtFY2LLpyE6NG4';
const supabase = createClient(supabaseUrl, supabaseKey);

// 🔐 Clave JWT (debería estar en variable de entorno en producción)
const JWT_SECRET = 'MiClaveSuperSecreta123!@#';

// 🌐 Ruta base para comprobar funcionamiento
app.get('/', (req, res) => {
  res.send('API de SAVIO funcionando correctamente 🚀');
});

// 🔐 Ruta de login
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

  if (error) {
    return res.status(500).json({ error: 'Error al consultar la base de datos' });
  }

  if (!users || users.length === 0) {
    return res.status(401).json({ error: 'Usuario no encontrado' });
  }

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

// 🆕 NUEVO: Ruta para obtener todos los datos del usuario
app.get('/usuario/:idusuario/datos', async (req, res) => {
  const { idusuario } = req.params;

  try {
    const tablas = [
      'configuracion',
      'eventos',
      'notas',
      'recordatorios',
      'productos_lista',
      'listas_compras'
    ];

    const resultados = {};

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

// 🆕 NUEVO: Obtener notas de un usuario
app.get('/notas/:idUsuario', async (req, res) => {
  const { idUsuario } = req.params;

  const { data, error } = await supabase
    .from('notas')
    .select('*')
    .eq('idUsuario', idUsuario)
    .order('idNota', { ascending: false });

  if (error) return res.status(500).json({ error: 'Error al obtener notas' });

  res.json(data);
});

// 🚀 Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
