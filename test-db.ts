import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import pool, { initDb } from "./src/db.ts";
import nodemailer from "nodemailer";

const JWT_SECRET = process.env.JWT_SECRET || "dental_secret_key_123";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Initialize Database
  try {
    await initDb();
    console.log("Database initialized");
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }

  // --- AUTH ROUTES ---
  app.get("/api/health", async (req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok", database: "connected" });
    } catch (error: any) {
      res.status(500).json({ status: "error", database: "disconnected", message: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { usuario, password, captcha, expectedCaptcha } = req.body;

    if (captcha !== expectedCaptcha) {
      return res.status(400).json({ error: "CAPTCHA incorrecto" });
    }

    try {
      const [rows] = await pool.query("SELECT * FROM medicos WHERE usuario = ?", [usuario]) as any;
      const medico = rows[0];

      if (!medico || !bcrypt.compareSync(password, medico.password_hash)) {
        return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
      }

      const token = jwt.sign({ id: medico.id, usuario: medico.usuario, nombre: medico.nombre_completo }, JWT_SECRET, { expiresIn: "8h" });
      res.json({ token, user: { id: medico.id, nombre: medico.nombre_completo, usuario: medico.usuario } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- MIDDLEWARE AUTH ---
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // --- MEDICOS ROUTES ---
  app.get("/api/especialidades", async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM especialidades");
      console.log(`Fetched ${Array.isArray(rows) ? rows.length : 0} especialidades`);
      res.json(rows);
    } catch (error: any) {
      console.error("Error fetching especialidades:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/medicos", async (req, res) => {
    const { ci, nombre_completo, celular, correo, especialidad_id, usuario, password } = req.body;
    const password_hash = bcrypt.hashSync(password, 10);
    try {
      const [result] = await pool.query(`
        INSERT INTO medicos (ci, nombre_completo, celular, correo, especialidad_id, usuario, password_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [ci, nombre_completo, celular, correo, especialidad_id, usuario, password_hash]) as any;
      res.json({ id: result.insertId });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // --- PACIENTES ROUTES ---
  app.get("/api/pacientes", authenticateToken, async (req: any, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM pacientes WHERE medico_id = ?", [req.user.id]);
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/pacientes", authenticateToken, async (req: any, res) => {
    const { ci, nombre_completo, celular, correo } = req.body;
    try {
      const [result] = await pool.query(`
        INSERT INTO pacientes (medico_id, ci, nombre_completo, celular, correo)
        VALUES (?, ?, ?, ?, ?)
      `, [req.user.id, ci, nombre_completo, celular, correo]) as any;
      res.json({ id: result.insertId });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // --- TRATAMIENTOS ROUTES ---
  app.get("/api/tipos-tratamiento", async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM tipos_tratamiento");
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tratamientos", authenticateToken, async (req, res) => {
    const { paciente_id, tipo_tratamiento_id, costo_total, citas } = req.body;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const [tResult] = await connection.query(`
        INSERT INTO tratamientos (paciente_id, tipo_tratamiento_id, costo_total)
        VALUES (?, ?, ?)
      `, [paciente_id, tipo_tratamiento_id, costo_total]) as any;
      
      const tratamientoId = tResult.insertId;
      
      for (const fecha of citas) {
        await connection.query(`
          INSERT INTO citas (tratamiento_id, fecha_programada)
          VALUES (?, ?)
        `, [tratamientoId, fecha]);
      }
      
      await connection.commit();
      res.json({ id: tratamientoId });
    } catch (error: any) {
      await connection.rollback();
      res.status(400).json({ error: error.message });
    } finally {
      connection.release();
    }
  });

  // --- CLINICAL WORKFLOW ---
  app.get("/api/citas/pendientes", authenticateToken, async (req: any, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT c.*, p.nombre_completo as paciente_nombre, tt.nombre as tratamiento_nombre, t.costo_total
        FROM citas c
        JOIN tratamientos t ON c.tratamiento_id = t.id
        JOIN pacientes p ON t.paciente_id = p.id
        JOIN tipos_tratamiento tt ON t.tipo_tratamiento_id = tt.id
        WHERE p.medico_id = ? AND c.estado = 'PROGRAMADA'
        ORDER BY c.fecha_programada ASC
      `, [req.user.id]);
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/atencion", authenticateToken, async (req, res) => {
    const { cita_id, descripcion_servicio, medicamentos, abono, proxima_cita, finalizar } = req.body;
    
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Update current appointment
      await connection.query("UPDATE citas SET estado = 'REALIZADA', fecha_atencion = CURRENT_TIMESTAMP, observaciones = ? WHERE id = ?", [descripcion_servicio, cita_id]);
      
      // Add service
      await connection.query("INSERT INTO servicios_realizados (cita_id, descripcion) VALUES (?, ?)", [cita_id, descripcion_servicio]);
      
      // Add medications
      for (const med of medicamentos) {
        await connection.query("INSERT INTO medicamentos (cita_id, nombre, indicaciones) VALUES (?, ?, ?)", [cita_id, med.nombre, med.indicaciones]);
      }
      
      // Add payment
      const [cRows] = await connection.query("SELECT tratamiento_id FROM citas WHERE id = ?", [cita_id]) as any;
      const cita = cRows[0];
      
      if (abono > 0) {
        await connection.query("INSERT INTO pagos (tratamiento_id, cita_id, monto) VALUES (?, ?, ?)", [cita.tratamiento_id, cita_id, abono]);
      }
      
      // Handle next appointment or finish
      if (finalizar) {
        await connection.query("UPDATE tratamientos SET estado = 'FINALIZADO' WHERE id = ?", [cita.tratamiento_id]);
      } else if (proxima_cita) {
        await connection.query("INSERT INTO citas (tratamiento_id, fecha_programada) VALUES (?, ?)", [cita.tratamiento_id, proxima_cita]);
        await connection.query("UPDATE tratamientos SET estado = 'EN_CURSO' WHERE id = ?", [cita.tratamiento_id]);
      }

      await connection.commit();
      res.json({ success: true });
    } catch (error: any) {
      await connection.rollback();
      res.status(400).json({ error: error.message });
    } finally {
      connection.release();
    }
  });

  // --- HISTORY ---
  app.get("/api/historia/:pacienteId", authenticateToken, async (req, res) => {
    const pacienteId = req.params.pacienteId;
    try {
      const [pRows] = await pool.query("SELECT * FROM pacientes WHERE id = ?", [pacienteId]) as any;
      const paciente = pRows[0];

      const [tratamientos] = await pool.query(`
        SELECT t.*, tt.nombre as tipo_nombre
        FROM tratamientos t
        JOIN tipos_tratamiento tt ON t.tipo_tratamiento_id = tt.id
        WHERE t.paciente_id = ?
      `, [pacienteId]) as any;

      const history = await Promise.all(tratamientos.map(async (t: any) => {
        const [citas] = await pool.query(`
          SELECT c.*, 
                 (SELECT GROUP_CONCAT(descripcion SEPARATOR ' | ') FROM servicios_realizados WHERE cita_id = c.id) as servicios,
                 (SELECT GROUP_CONCAT(CONCAT(nombre, ': ', indicaciones) SEPARATOR ' | ') FROM medicamentos WHERE cita_id = c.id) as medicamentos
          FROM citas c
          WHERE c.tratamiento_id = ?
          ORDER BY c.fecha_programada DESC
        `, [t.id]) as any;
        
        const [pagos] = await pool.query("SELECT * FROM pagos WHERE tratamiento_id = ?", [t.id]) as any;
        const totalPagado = pagos.reduce((sum: number, p: any) => sum + parseFloat(p.monto), 0);
        
        return { ...t, citas, pagos, totalPagado, saldo: t.costo_total - totalPagado };
      }));

      res.json({ paciente, history });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- REPORTS ---
  app.get("/api/reportes/ingresos", authenticateToken, async (req, res) => {
    const { inicio, fin } = req.query;
    try {
      const query = `
        SELECT p.monto, p.fecha_pago, tt.nombre as tratamiento, pac.nombre_completo as paciente
        FROM pagos p
        JOIN tratamientos t ON p.tratamiento_id = t.id
        JOIN tipos_tratamiento tt ON t.tipo_tratamiento_id = tt.id
        JOIN pacientes pac ON t.paciente_id = pac.id
        WHERE p.fecha_pago BETWEEN ? AND ?
        ORDER BY p.fecha_pago DESC
      `;
      const [rows] = await pool.query(query, [inicio || '1970-01-01', fin || '2100-01-01']);
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reportes/cuentas-cobrar", authenticateToken, async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT t.id, pac.nombre_completo as paciente, tt.nombre as tratamiento, t.costo_total,
               (SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE tratamiento_id = t.id) as pagado
        FROM tratamientos t
        JOIN pacientes pac ON t.paciente_id = pac.id
        JOIN tipos_tratamiento tt ON t.tipo_tratamiento_id = tt.id
        WHERE t.estado != 'FINALIZADO'
      `) as any;
      res.json(rows.map((r: any) => ({ ...r, saldo: r.costo_total - r.pagado })).filter((r: any) => r.saldo > 0));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- EMAIL NOTIFICATIONS ---
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.mailtrap.io",
    port: parseInt(process.env.SMTP_PORT || "2525"),
    auth: {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || ""
    }
  });

  app.post("/api/notificar-cita", authenticateToken, async (req, res) => {
    const { cita_id } = req.body;
    try {
      const [rows] = await pool.query(`
        SELECT c.*, p.nombre_completo as paciente, p.correo, m.nombre_completo as medico
        FROM citas c
        JOIN tratamientos t ON c.tratamiento_id = t.id
        JOIN pacientes p ON t.paciente_id = p.id
        JOIN medicos m ON p.medico_id = m.id
        WHERE c.id = ?
      `, [cita_id]) as any;
      const cita = rows[0];

      if (!cita || !cita.correo) {
        return res.status(400).json({ error: "Cita no encontrada o paciente sin correo" });
      }

      const mailOptions = {
        from: '"Consultorio Virgen de Copacabana" <citas@dentalcopacabana.com>',
        to: cita.correo,
        subject: "Recordatorio de Cita Odontológica",
        html: `
          <div style="font-family: serif; padding: 20px; color: #1a1a1a;">
            <h1 style="color: #5A5A40;">Recordatorio de Cita</h1>
            <p>Estimado(a) <strong>${cita.paciente}</strong>,</p>
            <p>Le recordamos su próxima cita programada en nuestro consultorio:</p>
            <div style="background: #f5f2ed; padding: 15px; border-radius: 10px; margin: 20px 0;">
              <p><strong>Fecha:</strong> ${new Date(cita.fecha_programada).toLocaleDateString()}</p>
              <p><strong>Hora:</strong> ${new Date(cita.fecha_programada).toLocaleTimeString()}</p>
              <p><strong>Médico:</strong> Dr. ${cita.medico}</p>
            </div>
            <p>Por favor, llegue 10 minutos antes de su cita. Si necesita reprogramar, contáctenos con anticipación.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #888;">Consultorio Dental Virgen de Copacabana - Su sonrisa es nuestra prioridad.</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: "Correo enviado exitosamente" });
    } catch (error: any) {
      res.status(500).json({ error: "Error al enviar el correo: " + error.message });
    }
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
