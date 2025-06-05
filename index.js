import express from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

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

// Rutas básicas
app.get('/', (req, res) => {
  res.send('API de SAVIO funcionando correctamente 🚀');
});

// 👤 Rutas de autenticación y usuarios
app.post('/register', async (req, res) => {
  const { nombre, apellidos, correo_electronico, contrasena, fecha_nacimiento, telefono } = req.body;

  // Validar campos requeridos
  if (!nombre || !correo_electronico || !contrasena) {
    return res.status(400).json({ error: 'Los campos nombre, correo y contraseña son obligatorios' });
  }

  // Validar formato de correo electrónico
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  if (!emailRegex.test(correo_electronico)) {
    return res.status(400).json({ error: 'Formato de correo electrónico inválido' });
  }

  // Validar contraseña segura
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(contrasena)) {
    return res.status(400).json({
      error: 'La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y caracteres especiales'
    });
  }

  try {
    // Verificar si el correo ya existe
    const { data: existingUser, error: searchError } = await supabase
      .from('usuarios')
      .select('correo_electronico')
      .eq('correo_electronico', correo_electronico)
      .single();

    if (searchError && searchError.code !== 'PGRST116') {
      console.error('Error al buscar usuario existente:', searchError);
      return res.status(500).json({ error: 'Error al verificar disponibilidad del correo' });
    }

    if (existingUser) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
    }

    // Crear el nuevo usuario
    const { data, error } = await supabase
      .from('usuarios')
      .insert([{
        nombre,
        apellidos,
        correo_electronico,
        contrasena,
        fecha_nacimiento,
        telefono,
        fecha_creacion: new Date().toISOString(),
        rol: 'usuario'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error al crear usuario:', error);
      return res.status(500).json({ error: 'Error al registrar usuario' });
    }

    // Generar token JWT para el nuevo usuario
    const token = jwt.sign(
      {
        idusuario: data.idusuario,
        correo_electronico: data.correo_electronico,
        rol: data.rol
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Enviar respuesta exitosa
    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      userId: data.idusuario,
      nombre: data.nombre,
      correo_electronico: data.correo_electronico,
      rol: data.rol
    });

  } catch (error) {
    console.error('Error inesperado al registrar usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
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

// 📝 Rutas de notas
app.get('/notas/:idusuario', async (req, res) => {
  const { idusuario } = req.params;
  console.log(`[GET /notas/:idusuario] Consultando notas para usuario: ${idusuario}`);

  try {
    const { data, error } = await supabase
      .from('notas')
      .select('*')
      .eq('idusuario', idusuario);

    if (error) {
      console.error('[Supabase Error] al consultar notas:', error);
      return res.status(500).json({ error: 'Error al obtener notas' });
    }

    console.log(`[Supabase Success] Notas encontradas: ${data.length}`);
    res.json(data);
  } catch (error) {
    console.error('[Error inesperado] al obtener notas:', error);
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

app.put('/notas/:idnota', async (req, res) => {
  const { idnota } = req.params;
  const { titulo, contenido } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido' });
  }

  try {
    // Verificamos que la nota pertenece al usuario
    const { data: notaExistente, error: fetchError } = await supabase
      .from('notas')
      .select('*')
      .eq('idnota', idnota)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: 'Nota no encontrada' });
    }

    if (notaExistente.idusuario !== payload.idusuario) {
      return res.status(403).json({ error: 'No tienes permiso para editar esta nota' });
    }

    const { data, error } = await supabase
      .from('notas')
      .update({ titulo, contenido })
      .eq('idnota', idnota)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Error al actualizar la nota' });
    }

    res.json({ message: 'Nota actualizada correctamente', nota: data });
  } catch (error) {
    console.error('Error inesperado al editar nota:', error);
    res.status(500).json({ error: 'Error inesperado' });
  }
});

app.delete('/notas/:idnota', verificarToken, async (req, res) => {
  const { idnota } = req.params;
  const idusuario = req.user.idusuario;

  try {
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

// 🛒 Rutas de listas de compras
app.post('/listas_compras', verificarToken, async (req, res) => {
  const { titulo } = req.body;
  const idusuario = req.user.idusuario;

  if (!titulo) {
    return res.status(400).json({ error: 'El título es obligatorio' });
  }

  try {
    const { data, error } = await supabase
      .from('listas_compras')
      .insert([{ titulo, idusuario }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ message: 'Lista creada', lista: data });
  } catch (error) {
    console.error('Error al crear lista:', error);
    res.status(500).json({ error: 'Error al crear lista' });
  }
});

app.get('/listas_compras', verificarToken, async (req, res) => {
  const idusuario = req.user.idusuario;

  try {
    const { data: listas, error: errorListas } = await supabase
      .from('listas_compras')
      .select('*')
      .eq('idusuario', idusuario);

    if (errorListas) {
      console.error('Error al obtener listas:', errorListas);
      return res.status(500).json({ error: 'Error al obtener listas' });
    }

    const listasConProductos = await Promise.all(
      listas.map(async (lista) => {
        const { data: productos, error: errorProductos } = await supabase
          .from('productos_lista')
          .select('*')
          .eq('idlista', lista.idlista);

        return {
          ...lista,
          productos: productos || [],
          errorProductos,
        };
      })
    );

    const errores = listasConProductos.filter(l => l.errorProductos);
    if (errores.length > 0) {
      console.warn('Algunas listas tienen errores al obtener productos');
    }

    const respuestaFinal = listasConProductos.map(({ errorProductos, ...resto }) => resto);
    res.json({ listas: respuestaFinal });
  } catch (err) {
    console.error('Error inesperado:', err);
    res.status(500).json({ error: 'Error inesperado al obtener listas y productos' });
  }
});

app.put('/listas_compras/:idlista', verificarToken, async (req, res) => {
  const { idlista } = req.params;
  const { titulo } = req.body;
  const idusuario = req.user.idusuario;

  try {
    const { data: lista, error: errorLista } = await supabase
      .from('listas_compras')
      .select('idusuario')
      .eq('idlista', idlista)
      .single();

    if (errorLista || !lista) return res.status(404).json({ error: 'Lista no encontrada' });
    if (lista.idusuario !== idusuario) return res.status(403).json({ error: 'No tienes permiso' });

    const { data, error } = await supabase
      .from('listas_compras')
      .update({ titulo })
      .eq('idlista', idlista)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Lista actualizada', lista: data });
  } catch (error) {
    console.error('Error al actualizar lista:', error);
    res.status(500).json({ error: 'Error al actualizar lista' });
  }
});

app.delete('/listas_compras/:idlista', verificarToken, async (req, res) => {
  const { idlista } = req.params;
  const idusuario = req.user.idusuario;

  try {
    const { data: lista, error: errorLista } = await supabase
      .from('listas_compras')
      .select('idusuario')
      .eq('idlista', idlista)
      .single();

    if (errorLista || !lista) return res.status(404).json({ error: 'Lista no encontrada' });
    if (lista.idusuario !== idusuario) return res.status(403).json({ error: 'No autorizado' });

    await supabase.from('productos_lista').delete().eq('idlista', idlista);
    await supabase.from('listas_compras').delete().eq('idlista', idlista);

    res.json({ message: 'Lista y productos eliminados correctamente' });
  } catch (error) {
    console.error('Error al eliminar lista:', error);
    res.status(500).json({ error: 'Error al eliminar lista' });
  }
});

// 📦 Rutas de productos
app.post('/productos_lista', verificarToken, async (req, res) => {
  const { idlista, nombre_producto, cantidad } = req.body;
  const idusuario = req.user.idusuario;

  if (!idlista || !nombre_producto) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  try {
    const { data, error } = await supabase
      .from('productos_lista')
      .insert([{ idlista, nombre_producto, cantidad, comprado: false, idusuario }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ message: 'Producto añadido', producto: data });
  } catch (error) {
    console.error('Error al añadir producto:', error);
    res.status(500).json({ error: 'Error al añadir producto' });
  }
});

app.put('/productos_lista/:idproducto', verificarToken, async (req, res) => {
  const { idproducto } = req.params;
  const { nombre_producto, cantidad, comprado } = req.body;
  const idusuario = req.user.idusuario;

  try {
    const { data: producto, error: errorProducto } = await supabase
      .from('productos_lista')
      .select('idusuario')
      .eq('idproducto', idproducto)
      .single();

    if (errorProducto || !producto) return res.status(404).json({ error: 'Producto no encontrado' });
    if (producto.idusuario !== idusuario) return res.status(403).json({ error: 'No autorizado' });

    const { data, error } = await supabase
      .from('productos_lista')
      .update({ nombre_producto, cantidad, comprado })
      .eq('idproducto', idproducto)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Producto actualizado', producto: data });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

app.delete('/productos_lista/:idproducto', verificarToken, async (req, res) => {
  const { idproducto } = req.params;
  const idusuario = req.user.idusuario;

  try {
    const { data: producto, error: errorProducto } = await supabase
      .from('productos_lista')
      .select('idusuario')
      .eq('idproducto', idproducto)
      .single();

    if (errorProducto || !producto) return res.status(404).json({ error: 'Producto no encontrado' });
    if (producto.idusuario !== idusuario) return res.status(403).json({ error: 'No autorizado' });

    await supabase.from('productos_lista').delete().eq('idproducto', idproducto);

    res.json({ message: 'Producto eliminado' });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

// 📅 Rutas de eventos
app.post('/eventos', verificarToken, async (req, res) => {
  const { titulo, descripcion, fecha_inicio, fecha_fin } = req.body;
  const idusuario = req.user.idusuario;

  if (!titulo || !fecha_inicio || !fecha_fin) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  try {
    const { data, error } = await supabase
      .from('eventos')
      .insert([{ titulo, descripcion, fecha_inicio, fecha_fin, idusuario }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ message: 'Evento creado', evento: data });
  } catch (error) {
    console.error('Error al crear evento:', error);
    res.status(500).json({ error: 'Error al crear evento' });
  }
});

app.put('/eventos/:idevento', verificarToken, async (req, res) => {
  const { idevento } = req.params;
  const { titulo, descripcion, fecha_inicio, fecha_fin } = req.body;
  const idusuario = req.user.idusuario;

  try {
    const { data: evento, error: errorEvento } = await supabase
      .from('eventos')
      .select('idusuario')
      .eq('idevento', idevento)
      .single();

    if (errorEvento || !evento) return res.status(404).json({ error: 'Evento no encontrado' });
    if (evento.idusuario !== idusuario) return res.status(403).json({ error: 'No autorizado' });

    const { data, error } = await supabase
      .from('eventos')
      .update({ titulo, descripcion, fecha_inicio, fecha_fin })
      .eq('idevento', idevento)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Evento actualizado', evento: data });
  } catch (error) {
    console.error('Error al actualizar evento:', error);
    res.status(500).json({ error: 'Error al actualizar evento' });
  }
});

app.delete('/eventos/:idevento', verificarToken, async (req, res) => {
  const { idevento } = req.params;
  const idusuario = req.user.idusuario;

  try {
    const { data: evento, error: errorEvento } = await supabase
      .from('eventos')
      .select('idusuario')
      .eq('idevento', idevento)
      .single();

    if (errorEvento || !evento) return res.status(404).json({ error: 'Evento no encontrado' });
    if (evento.idusuario !== idusuario) return res.status(403).json({ error: 'No autorizado' });

    const { error } = await supabase
      .from('eventos')
      .delete()
      .eq('idevento', idevento);

    if (error) throw error;

    res.json({ message: 'Evento eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar evento:', error);
    res.status(500).json({ error: 'Error al eliminar evento' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
