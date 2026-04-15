import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: parseInt(process.env.MYSQL_PORT || '10634'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Conectado a la base de datos");
    connection.release();
  } catch (error) {
    console.error("❌ Error conectando a la BD:", error);
  }
};

testConnection();

export async function initDb() {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS especialidades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS medicos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ci VARCHAR(20) NOT NULL UNIQUE,
        nombre_completo VARCHAR(255) NOT NULL,
        celular VARCHAR(20),
        correo VARCHAR(100) UNIQUE,
        especialidad_id INT,
        usuario VARCHAR(50) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (especialidad_id) REFERENCES especialidades(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS pacientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        medico_id INT,
        ci VARCHAR(20) NOT NULL UNIQUE,
        nombre_completo VARCHAR(255) NOT NULL,
        celular VARCHAR(20),
        correo VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (medico_id) REFERENCES medicos(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS tipos_tratamiento (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        descripcion TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS tratamientos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        paciente_id INT,
        tipo_tratamiento_id INT,
        costo_total DECIMAL(10, 2) NOT NULL,
        estado VARCHAR(20) DEFAULT 'PENDIENTE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
        FOREIGN KEY (tipo_tratamiento_id) REFERENCES tipos_tratamiento(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS citas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tratamiento_id INT,
        fecha_programada DATETIME NOT NULL,
        fecha_atencion DATETIME,
        estado VARCHAR(20) DEFAULT 'PROGRAMADA',
        observaciones TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (tratamiento_id) REFERENCES tratamientos(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS servicios_realizados (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cita_id INT,
        descripcion TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cita_id) REFERENCES citas(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS medicamentos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cita_id INT,
        nombre VARCHAR(255) NOT NULL,
        indicaciones TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cita_id) REFERENCES citas(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS pagos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tratamiento_id INT,
        cita_id INT,
        monto DECIMAL(10, 2) NOT NULL,
        fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tratamiento_id) REFERENCES tratamientos(id),
        FOREIGN KEY (cita_id) REFERENCES citas(id)
      )
    `);

    // Seed data
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM especialidades') as any;
    console.log(`Especialidades count: ${rows[0].count}`);
    if (rows[0].count === 0) {
      console.log('Seeding especialidades...');
      const specs = ['Odontología General', 'Ortodoncia', 'Endodoncia', 'Periodoncia', 'Odontopediatría', 'Cirugía Maxilofacial', 'Rehabilitación Oral'];
      for (const s of specs) {
        await connection.query('INSERT INTO especialidades (nombre) VALUES (?)', [s]);
      }
      console.log('Especialidades seeded.');
      
      console.log('Seeding tipos_tratamiento...');
      const types = [
        ['Limpieza Dental', 'Profilaxis completa'],
        ['Extracción', 'Exodoncia simple o compleja'],
        ['Brackets', 'Tratamiento de ortodoncia'],
        ['Endodoncia', 'Tratamiento de conducto'],
        ['Blanqueamiento', 'Estética dental'],
        ['Implante', 'Prótesis fija sobre implante']
      ];
      for (const t of types) {
        await connection.query('INSERT INTO tipos_tratamiento (nombre, descripcion) VALUES (?, ?)', [t[0], t[1]]);
      }
      console.log('Tipos de tratamiento seeded.');
    }
  } finally {
    connection.release();
  }
}

export default pool;
