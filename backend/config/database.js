const { Pool }  = require('pg');
const bcrypt    = require('bcryptjs');

let pool = null;

function getConfig() {
    if (process.env.DATABASE_URL) {
        return { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } };
    }
    return {
        host:     process.env.DB_HOST     || 'localhost',
        database: process.env.DB_NAME     || 'inventario',
        user:     process.env.DB_USER     || 'postgres',
        password: process.env.DB_PASSWORD || '',
        port:     parseInt(process.env.DB_PORT) || 5432,
    };
}

async function connectDB() {
    pool = new Pool(getConfig());
    await pool.query('SELECT 1');
    const label = process.env.DATABASE_URL ? 'Railway PostgreSQL' : (getConfig().database);
    console.log(`✅ PostgreSQL conectado → ${label}`);
    return pool;
}

async function initDB() {
    const p = getPool();

    await p.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id            SERIAL PRIMARY KEY,
            nombre        VARCHAR(255) NOT NULL,
            email         VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            rol           VARCHAR(50)  DEFAULT 'Operador',
            activo        BOOLEAN      DEFAULT true,
            fecha_creacion TIMESTAMP   DEFAULT NOW(),
            ultima_sesion  TIMESTAMP
        )
    `);

    await p.query(`
        CREATE TABLE IF NOT EXISTS areas (
            id             SERIAL PRIMARY KEY,
            nombre         VARCHAR(255) UNIQUE NOT NULL,
            fecha_creacion TIMESTAMP DEFAULT NOW()
        )
    `);

    await p.query(`
        CREATE TABLE IF NOT EXISTS tipos_equipo (
            id              SERIAL PRIMARY KEY,
            nombre          VARCHAR(255) UNIQUE NOT NULL,
            es_predefinido  BOOLEAN DEFAULT false
        )
    `);

    await p.query(`
        CREATE TABLE IF NOT EXISTS equipos (
            codigo_qr      VARCHAR(100) PRIMARY KEY,
            tipo           VARCHAR(100),
            marca          VARCHAR(100),
            modelo         VARCHAR(100),
            numero_serie   VARCHAR(100),
            area_id        INT REFERENCES areas(id),
            area_nombre    VARCHAR(255),
            responsable    VARCHAR(255),
            estado         VARCHAR(50)  DEFAULT 'Activo',
            direccion_ip   VARCHAR(50),
            fecha_registro DATE,
            cantidad       INT          DEFAULT 1,
            observaciones  TEXT,
            fecha_creacion TIMESTAMP    DEFAULT NOW()
        )
    `);

    await p.query(`
        CREATE TABLE IF NOT EXISTS ips_reservadas (
            id           SERIAL PRIMARY KEY,
            ip           VARCHAR(50) UNIQUE NOT NULL,
            nota         TEXT,
            responsable  VARCHAR(255),
            fecha        TIMESTAMP DEFAULT NOW()
        )
    `);

    await p.query(`
        CREATE TABLE IF NOT EXISTS ips_conflictos (
            id           SERIAL PRIMARY KEY,
            ip           VARCHAR(50),
            nota         TEXT,
            responsable  VARCHAR(255),
            tipo         VARCHAR(50) DEFAULT 'manual',
            fecha        TIMESTAMP   DEFAULT NOW()
        )
    `);

    await p.query(`
        CREATE TABLE IF NOT EXISTS ips_conflictos_equipos (
            conflicto_id INT          REFERENCES ips_conflictos(id) ON DELETE CASCADE,
            equipo_id    VARCHAR(100) REFERENCES equipos(codigo_qr) ON DELETE CASCADE,
            PRIMARY KEY (conflicto_id, equipo_id)
        )
    `);

    // Tipos predefinidos
    const tipos = [
        'Computadora','Laptop','Impresora','Monitor','Servidor','Switch','Router',
        'UPS','Proyector','Teléfono IP','Cámara IP',
        'Cable Ethernet','Cable VGA','Cable HDMI','Cable USB','Cable DisplayPort',
        'Teclado','Mouse','Audífonos','Memoria USB','Cartucho / Tóner','Adaptador','Consumible'
    ];
    for (const tipo of tipos) {
        await p.query(
            'INSERT INTO tipos_equipo (nombre, es_predefinido) VALUES ($1, true) ON CONFLICT (nombre) DO NOTHING',
            [tipo]
        );
    }

    // Crear admin automáticamente si no hay usuarios
    const { rows } = await p.query('SELECT COUNT(*) AS cnt FROM usuarios');
    if (parseInt(rows[0].cnt) === 0) {
        const hash = await bcrypt.hash('admin123', 10);
        await p.query(
            `INSERT INTO usuarios (nombre, email, password_hash, rol)
             VALUES ('Administrador', 'admin@inventario.com', $1, 'Administrador')`,
            [hash]
        );
        console.log('✅ Admin creado automáticamente: admin@inventario.com / admin123');
    }

    console.log('✅ Base de datos lista');
}

function getPool() {
    if (!pool) throw new Error('Base de datos no conectada. Llama a connectDB() primero.');
    return pool;
}

module.exports = { connectDB, getPool, initDB };
