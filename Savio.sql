-- Estructura de tablas de SAVIO convertida de MySQL a PostgreSQL para Supabase

CREATE TABLE usuarios (
    idUsuario SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    apellidos VARCHAR(255) NOT NULL,
    correo_electronico VARCHAR(255) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    telefono VARCHAR(15),
    fecha_creacion TIMESTAMP NOT NULL
);

CREATE TABLE configuracion (
    idConfiguracion SERIAL PRIMARY KEY,
    idUsuario INTEGER NOT NULL,
    tema VARCHAR(50) NOT NULL,
    idioma VARCHAR(50) NOT NULL,
    FOREIGN KEY (idUsuario) REFERENCES usuarios(idUsuario) ON DELETE CASCADE
);

CREATE TABLE eventos (
    idEvento SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP NOT NULL,
    idUsuario INTEGER NOT NULL,
    FOREIGN KEY (idUsuario) REFERENCES usuarios(idUsuario) ON DELETE CASCADE
);

CREATE TABLE listas_compras (
    idLista SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    idUsuario INTEGER NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL,
    FOREIGN KEY (idUsuario) REFERENCES usuarios(idUsuario) ON DELETE CASCADE
);

CREATE TABLE productos_lista (
    idProducto SERIAL PRIMARY KEY,
    nombre_producto VARCHAR(255) NOT NULL,
    cantidad VARCHAR(255) NOT NULL,
    idLista INTEGER NOT NULL,
    comprado BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (idLista) REFERENCES listas_compras(idLista) ON DELETE CASCADE
);

CREATE TABLE notas (
    idNota SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    contenido TEXT NOT NULL,
    idUsuario INTEGER NOT NULL,
    FOREIGN KEY (idUsuario) REFERENCES usuarios(idUsuario) ON DELETE CASCADE
);

CREATE TABLE recordatorios (
    idRecordatorio SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    fecha_recordatorio TIMESTAMP NOT NULL,
    frecuencia VARCHAR(255),
    idUsuario INTEGER NOT NULL,
    FOREIGN KEY (idUsuario) REFERENCES usuarios(idUsuario) ON DELETE CASCADE
);

ALTER TABLE usuarios ADD COLUMN auth_id uuid;
CREATE POLICY select_own_users
  ON usuarios
  FOR SELECT
  USING (auth_id = auth.uid());

CREATE POLICY select_own_configuracion
  ON configuracion
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.idUsuario = configuracion.idUsuario
      AND usuarios.auth_id = auth.uid()
    )
  );

  CREATE POLICY select_own_eventos
  ON eventos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.idUsuario = eventos.idUsuario
      AND usuarios.auth_id = auth.uid()
    )
  );

CREATE POLICY select_own_notas
  ON notas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.idUsuario = notas.idUsuario
      AND usuarios.auth_id = auth.uid()
    )
  );

CREATE POLICY select_own_listas_compras
  ON listas_compras
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.idUsuario = listas_compras.idUsuario
      AND usuarios.auth_id = auth.uid()
    )
  );

CREATE POLICY select_own_productos_lista
  ON productos_lista
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listas_compras
      JOIN usuarios ON listas_compras.idUsuario = usuarios.idUsuario
      WHERE listas_compras.idLista = productos_lista.idLista
      AND usuarios.auth_id = auth.uid()
    )
  );
  
  CREATE POLICY select_own_recordatorios
  ON recordatorios
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.idUsuario = recordatorios.idUsuario
      AND usuarios.auth_id = auth.uid()
    )
  );

  -- 1. Crear una nueva columna temporal de tipo uuid
ALTER TABLE eventos ADD COLUMN idusuario_temp uuid;

-- 2. Copiar los valores actuales casteados a uuid
UPDATE eventos SET idusuario_temp = idusuario::text::uuid;

-- 3. Eliminar la clave foránea (si existe)
ALTER TABLE eventos DROP CONSTRAINT IF EXISTS eventos_idusuario_fkey;

-- 4. Eliminar la columna original
ALTER TABLE eventos DROP COLUMN idusuario;

-- 5. Renombrar la columna temporal
ALTER TABLE eventos RENAME COLUMN idusuario_temp TO idusuario;

-- 6. (Opcional) Volver a crear la foreign key si la necesitas
ALTER TABLE eventos ADD CONSTRAINT eventos_idusuario_fkey FOREIGN KEY (idusuario) REFERENCES usuarios(idusuario);

-----
-- 1. Eliminar la clave foránea si existe
ALTER TABLE recordatorios DROP CONSTRAINT IF EXISTS recordatorios_idusuario_fkey;

-- 2. Crear una nueva columna temporal de tipo uuid
ALTER TABLE recordatorios ADD COLUMN idusuario_temp uuid;

-- 3. Copiar los valores convirtiéndolos a UUID
UPDATE recordatorios SET idusuario_temp = idusuario::uuid;

-- 4. Eliminar la columna original
ALTER TABLE recordatorios DROP COLUMN idusuario;

-- 5. Renombrar la columna temporal
ALTER TABLE recordatorios RENAME COLUMN idusuario_temp TO idusuario;

-- 6. Crear nuevamente la clave foránea
ALTER TABLE recordatorios ADD CONSTRAINT recordatorios_idusuario_fkey FOREIGN KEY (idusuario) REFERENCES usuarios(idusuario);

ALTER TABLE recordatorios ADD COLUMN idusuario_temp uuid;

--

UPDATE recordatorios SET idusuario_temp = idusuario::uuid;

ALTER TABLE recordatorios DROP COLUMN idusuario;

ALTER TABLE recordatorios RENAME COLUMN idusuario_temp TO idusuario;

ALTER TABLE recordatorios ADD CONSTRAINT recordatorios_idusuario_fkey FOREIGN KEY (idusuario) REFERENCES usuarios(idusuario);

-----

ALTER TABLE configuracion ADD COLUMN idusuario_temp uuid;
UPDATE configuracion SET idusuario_temp = gen_random_uuid(); -- o usa alguna lógica de conversión
ALTER TABLE configuracion DROP COLUMN idusuario;
ALTER TABLE configuracion RENAME COLUMN idusuario_temp TO idusuario;
ALTER TABLE configuracion
ADD CONSTRAINT configuracion_idusuario_fkey FOREIGN KEY (idusuario) REFERENCES usuarios(idusuario);





-- Política para 'configuracion'
CREATE POLICY select_own_configuracion
  ON configuracion
  FOR SELECT
  USING (idusuario = auth.uid());  -- asumiendo que idusuario es uuid

CREATE POLICY insert_own_configuracion
  ON configuracion
  FOR INSERT
  WITH CHECK (idusuario = auth.uid());

-- Política para 'eventos'  FUNCIONA
CREATE POLICY select_own_eventos
  ON eventos
  FOR SELECT
  USING (idusuario = auth.uid());
-- FUNCIONA
CREATE POLICY insert_own_eventos
  ON eventos
  FOR INSERT
  WITH CHECK (idusuario = auth.uid());

-- Política para 'listas_compras'
CREATE POLICY select_own_listas_compras
  ON listas_compras
  FOR SELECT
  USING (idusuario = auth.uid());

CREATE POLICY insert_own_listas_compras
  ON listas_compras
  FOR INSERT
  WITH CHECK (idusuario = auth.uid());

-- Política para 'notas'
CREATE POLICY select_own_notas
  ON notas
  FOR SELECT
  USING (idusuario = auth.uid());

CREATE POLICY insert_own_notas
  ON notas
  FOR INSERT
  WITH CHECK (idusuario = auth.uid());

-- Política para 'productos_lista' -- NO VA

ALTER TABLE productos_lista
ADD COLUMN idusuario uuid;

SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'productos_lista';


CREATE POLICY select_own_productos_lista
  ON productos_lista
  FOR SELECT
  USING (idusuario = auth.uid());

CREATE POLICY insert_own_productos_lista
  ON productos_lista
  FOR INSERT
  WITH CHECK (idusuario = auth.uid());

-- Política para 'recordatorios' -- VA
CREATE POLICY select_own_recordatorios
  ON recordatorios
  FOR SELECT
  USING (idusuario = auth.uid());

CREATE POLICY insert_own_recordatorios
  ON recordatorios
  FOR INSERT
  WITH CHECK (idusuario = auth.uid());

SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'notas';

CREATE POLICY "Permitir seleccionar notas propias"
ON notas
FOR SELECT
USING ( idusuario = current_setting('jwt.claims.idusuario')::uuid );

CREATE POLICY "Permitir insertar notas propias"
ON notas
FOR INSERT
WITH CHECK ( idusuario = current_setting('jwt.claims.idusuario')::uuid );

CREATE POLICY "Permitir actualizar notas propias"
ON notas
FOR UPDATE
USING ( idusuario = current_setting('jwt.claims.idusuario')::uuid )
WITH CHECK ( idusuario = current_setting('jwt.claims.idusuario')::uuid );

CREATE POLICY "Permitir borrar notas propias"
ON notas
FOR DELETE
USING ( idusuario = current_setting('jwt.claims.idusuario')::uuid );


-- Crea trigger para insertar en "usuarios" cuando se registre alguien
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into usuarios (idusuario, correo_electronico)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.usuarios (
  idusuario uuid primary key references auth.users(id) on delete cascade,
  correo_electronico text,
  nombre text, -- opcional
  rol text     -- opcional
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into usuarios (idusuario, correo_electronico, nombre, rol)
  values (new.id, new.email, new.email, 'usuario');
  return new;
end;
$$ language plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP FUNCTION IF EXISTS public.handle_new_user();

DROP POLICY IF EXISTS select_own_users ON usuarios;
ALTER TABLE usuarios DROP COLUMN auth_id;

ALTER TABLE usuarios DROP COLUMN IF EXISTS auth_id;

DROP POLICY IF EXISTS select_own_users ON usuarios;

DROP TABLE IF EXISTS usuarios CASCADE;



---------------------------------------------------------------
Recreación
---------------------------------------------------------------


-- Create 'usuarios' table
CREATE TABLE usuarios (
    idusuario uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre varchar(255),
    apellidos varchar(255),
    correo_electronico varchar(255),
    contrasena varchar(255),
    fecha_nacimiento date,
    telefono varchar(255),
    fecha_creacion timestamp DEFAULT now(),
    rol text,
    auth_id uuid -- Assuming this links to Supabase Auth user IDs
);

-- Create 'configuracion' table
CREATE TABLE configuracion (
    idconfiguracion int PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    tema varchar(255),
    idioma varchar(255),
    idusuario uuid
);

-- Create 'eventos' table
CREATE TABLE eventos (
    idevento int PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    titulo varchar(255),
    descripcion text,
    fecha_inicio timestamp,
    fecha_fin timestamp,
    idusuario uuid
);

-- Create 'notas' table
CREATE TABLE notas (
    idnota int PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    titulo varchar(255),
    contenido text,
    idusuario uuid
);

ALTER TABLE notas
  ALTER COLUMN idUsuario TYPE UUID USING idUsuario::UUID;


-- Create 'recordatorios' table
CREATE TABLE recordatorios (
    idrecordatorio int PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    titulo varchar(255),
    descripcion text,
    fecha_recordatorio timestamp,
    frecuencia varchar(255),
    idusuario uuid
);

-- Create 'listas_compras' table
CREATE TABLE listas_compras (
    idlista int PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    titulo varchar(255),
    fecha_creacion timestamp DEFAULT now(),
    idusuario uuid
);

-- Create 'productos_lista' table
CREATE TABLE productos_lista (
    idproducto int PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    nombre_producto varchar(255),
    cantidad varchar(255),
    idlista int,
    comprado boolean DEFAULT FALSE,
    idusuario uuid
);

-- Add foreign key constraints

ALTER TABLE configuracion
ADD CONSTRAINT fk_configuracion_usuario
FOREIGN KEY (idusuario) REFERENCES usuarios(idusuario) ON DELETE CASCADE;

ALTER TABLE eventos
ADD CONSTRAINT fk_eventos_usuario
FOREIGN KEY (idusuario) REFERENCES usuarios(idusuario) ON DELETE CASCADE;

ALTER TABLE notas
ADD CONSTRAINT fk_notas_usuario
FOREIGN KEY (idusuario) REFERENCES usuarios(idusuario) ON DELETE CASCADE;

ALTER TABLE recordatorios
ADD CONSTRAINT fk_recordatorios_usuario
FOREIGN KEY (idusuario) REFERENCES usuarios(idusuario) ON DELETE CASCADE;

ALTER TABLE listas_compras
ADD CONSTRAINT fk_listascompras_usuario
FOREIGN KEY (idusuario) REFERENCES usuarios(idusuario) ON DELETE CASCADE;

ALTER TABLE productos_lista
ADD CONSTRAINT fk_productoslista_lista
FOREIGN KEY (idlista) REFERENCES listas_compras(idlista) ON DELETE CASCADE;

ALTER TABLE productos_lista
ADD CONSTRAINT fk_productoslista_usuario
FOREIGN KEY (idusuario) REFERENCES usuarios(idusuario) ON DELETE CASCADE;

INSERT INTO usuarios (nombre, apellidos, correo_electronico, contrasena, rol)
VALUES ('Juan', 'Perez', 'jperez@savio.com', 'empleadoejemplar', 'empleado');


___________________________________________________________________________________________
------------------------------------ Crear RLS --------------------------------------------
___________________________________________________________________________________________

-- Permitir SELECT solo si el idusuario coincide con el usuario conectado
CREATE POLICY "Select own notes"
ON public.notas
FOR SELECT
USING (idusuario = auth.uid());

-- Permitir INSERT solo si el idusuario es el usuario conectado
CREATE POLICY "Insert own notes"
ON public.notas
FOR INSERT
WITH CHECK (idusuario = auth.uid());

-- Permitir UPDATE solo si el idusuario es el usuario conectado
CREATE POLICY "Update own notes"
ON public.notas
FOR UPDATE
USING (idusuario = auth.uid());

-- Permitir DELETE solo si el idusuario es el usuario conectado
CREATE POLICY "Delete own notes"
ON public.notas
FOR DELETE
USING (idusuario = auth.uid());

SELECT * FROM notas WHERE idusuario = '6eaaa65c-2cbd-46cf-b7a1-60cbd277f2b1';

