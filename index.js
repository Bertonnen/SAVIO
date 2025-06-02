import express from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const supabaseUrl = 'https://nicjdgftcsnoxmmilait.supabase.co';
// Usa la clave pública (anon) aquí, no la service_role
const supabaseAnonKey = 'TU_ANON_KEY_PUBLICA_AQUÍ'; 

const JWT_SECRET = 'MiClaveSuperSecreta123!@#';

// Middleware: verificar token JWT y cargar usuario
const verificarToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token no proporcionado' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.token = token; // guardamos token para usar luego en supabase
    next();
  } catch (err) {
    res.status(403).json({ error: 'Token inválido' });
  }
};

// Crear cliente Supabase con el token del usuario para que funcione RLS
const createSupabaseClientWithAuth = (token) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
};

app.get('/', (req, res) => {
  res.send('API de SAVIO funcionando correctamente 🚀');
});

app.post('/login', async (req, res) => {
  const { correo_electronico, contrasena } = req.body;

  if (!correo_electronico || !contrasena) {
    return res.status(400).json({ error: 'Faltan el correo o la contraseña' });
  }

  // Aquí sigue usando el cliente con service_role para login (seguridad controlada)
  const supabaseService = createClient(supabaseUrl, process.env.SERVICE_ROLE_KEY || 'TU_SERVICE_ROLE_KEY_AQUI');

  const { data: users, error } = await supabaseService
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

// --- Datos generales de usuario, sin usar token porque no filtras por usuario actual, 
// puedes modificar según convenga ---
app.get('/usuario/:idusuario/datos', verificarToken, async (req, res) => {
  const { idusuario } = req.params;
  const tablas = ['configuracion', 'eventos', 'notas', 'recordatorios', 'productos_lista', 'listas_compras'];
  const resultados = {};

  try {
    const supabaseUser = createSupabaseClientWithAuth(req.token);

    for (const tabla of tablas) {
      const { data, error } = await supabaseUser
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

app.get('/notas/:idusuario', verificarToken, async (req, res) => {
  const { idusuario } = req.params;

  // Comprobar que el usuario del token coincide con el solicitado, para evitar que lean datos de otros usuarios
  if (req.user.idusuario !== parseInt(idusuario, 10)) {
    return res.status(403).json({ error: 'No tienes permiso para ver estas notas' });
  }

  try {
    const supabaseUser = createSupabaseClientWithAuth(req.token);

    const { data, error } = await supabaseUser
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

app.post('/notas', verificarToken, async (req, res) => {
  const { titulo, contenido, idusuario } = req.body;

  if (!titulo || !contenido || !idusuario) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  // Solo permite crear nota para el usuario autenticado
  if (req.user.idusuario !== idusuario) {
    return res.status(403).json({ error: 'No tienes permiso para crear notas para otro usuario' });
  }

  try {
    const supabaseUser = createSupabaseClientWithAuth(req.token);

    const { data, error } = await supabaseUser
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

app.delete('/notas/:idnota', verificarToken, async (req, res) => {
  const { idnota } = req.params;

  try {
    const supabaseUser = createSupabaseClientWithAuth(req.token);

    // Intentar borrar; RLS evitará borrar si no es dueño
    const { error } = await supabaseUser
      .from('notas')
      .delete()
      .eq('idnota', idnota);

    if (error) {
      console.error('Error al eliminar nota:', error);
      return res.status(403).json({ error: 'No tienes permiso para eliminar esta nota o no existe' });
    }

    res.json({ message: 'Nota eliminada correctamente' });
  } catch (error) {
    console.error('Error inesperado al eliminar nota:', error);
    res.status(500).json({ error: 'Error inesperado' });
  }
});

app.put('/notas/:idnota', verificarToken, async (req, res) => {
  const { idnota } = req.params;
  const { titulo, contenido } = req.body;

  try {
    const supabaseUser = createSupabaseClientWithAuth(req.token);

    // Actualizar solo si RLS permite (es dueño)
    const { data, error } = await supabaseUser
      .from('notas')
      .update({ titulo, contenido })
      .eq('idnota', idnota)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar la nota:', error);
      return res.status(403).json({ error: 'No tienes permiso para editar esta nota o no existe' });
    }

    res.json({ message: 'Nota actualizada correctamente', nota: data });
  } catch (error) {
    console.error('Error inesperado al editar nota:', error);
    res.status(500).json({ error: 'Error inesperado' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
