require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const { Pool }  = require('pg');
const bcrypt    = require('bcryptjs');

const pool = new Pool(
    process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
        : {
            host:     process.env.DB_HOST     || 'localhost',
            database: process.env.DB_NAME     || 'inventario',
            user:     process.env.DB_USER     || 'postgres',
            password: process.env.DB_PASSWORD || '',
            port:     parseInt(process.env.DB_PORT) || 5432,
          }
);

async function seed() {
    try {
        const hash = await bcrypt.hash('admin123', 10);
        await pool.query(
            `INSERT INTO usuarios (nombre, email, password_hash, rol)
             VALUES ('Administrador', 'admin@inventario.com', $1, 'Administrador')
             ON CONFLICT (email) DO NOTHING`,
            [hash]
        );
        console.log('✅ Seed completado: admin@inventario.com / admin123');
        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

seed();
