import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import pool, { initDb } from "./src/db.js";
import nodemailer from "nodemailer";

const JWT_SECRET = process.env.JWT_SECRET || "dental_secret_key_123";

async function startServer() {
  const app = express();
  ///const PORT = 3000;
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

  app.listen(PORT, () => {
    console.log(`Servidor corriendo en ${PORT}`);
  });

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
    const [rows] = await pool.query("SELECT 1 as test");
    res.json({ status: "OK", db: "Conectado", result: rows });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      db: "Desconectado",
      error: (error as Error).message
    });
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

      const token = jwt.sign({ id: medico.id, usuario: medico.usuario, nombre: medico.nombre_completo, es_admin: medico.es_admin }, JWT_SECRET, { expiresIn: "8h" });
      res.json({ token, user: { id: medico.id, nombre: medico.nombre_completo, usuario: medico.usuario, es_admin: medico.es_admin } });
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
  app.get("/api/medicos/count", async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT COUNT(*) as count FROM medicos WHERE activo = 1") as any;
      res.json({ count: rows[0].count });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/medicos", authenticateToken, async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT m.*, e.nombre as especialidad_nombre
        FROM medicos m
        LEFT JOIN especialidades e ON m.especialidad_id = e.id
        WHERE m.activo = 1
        ORDER BY m.created_at ASC
      `);
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/medicos/:id", authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    
    // Only admin can delete other doctors
    if (!req.user.es_admin) {
      return res.status(403).json({ error: "Solo el administrador puede eliminar médicos" });
    }

    // Cannot delete yourself
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: "No puede eliminarse a sí mismo" });
    }

    try {
      // Check for activity (patients)
      const [pacientes] = await pool.query("SELECT COUNT(*) as count FROM pacientes WHERE medico_id = ?", [id]) as any;
      
      if (pacientes[0].count > 0) {
        // Logical delete
        await pool.query("UPDATE medicos SET activo = 0 WHERE id = ?", [id]);
        res.json({ message: "Médico inactivado (baja lógica) debido a que tiene pacientes registrados" });
      } else {
        // Physical delete
        await pool.query("DELETE FROM medicos WHERE id = ?", [id]);
        res.json({ message: "Médico eliminado permanentemente" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/especialidades", async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM especialidades");
      console.log(`Fetched ${Array.isArray(rows) ? rows.length : 0} especialidades`);
      res.json(rows);
    } catch (error) {
        const err = error as Error;
        console.error("Error fetching especialidades:", err.message);
        res.status(500).json({
          error: err.message,
          db: "error"
        });
    }
  });

  app.post("/api/medicos", async (req, res) => {
    const { ci, nombre_completo, celular, correo, especialidad_id, usuario, password } = req.body;
    const password_hash = bcrypt.hashSync(password, 10);
    
    try {
      const [rows] = await pool.query("SELECT COUNT(*) as count FROM medicos WHERE activo = 1") as any;
      const count = rows[0].count;
      
      let es_admin = 0;
      
      if (count > 0) {
        // If not the first user, must be authenticated as admin
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) return res.status(401).json({ error: "Debe ser administrador para registrar otros médicos" });
        
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          if (!decoded.es_admin) {
            return res.status(403).json({ error: "Solo el administrador puede registrar otros médicos" });
          }
        } catch (err) {
          return res.status(403).json({ error: "Sesión inválida" });
        }
      } else {
        // First user becomes admin
        es_admin = 1;
      }

      const [result] = await pool.query(`
        INSERT INTO medicos (ci, nombre_completo, celular, correo, especialidad_id, usuario, password_hash, es_admin)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [ci, nombre_completo, celular, correo, especialidad_id, usuario, password_hash, es_admin]) as any;
      res.json({ id: result.insertId, es_admin });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/dashboard/stats", authenticateToken, async (req: any, res) => {
    try {
      const [pacientesCount] = await pool.query("SELECT COUNT(*) as count FROM pacientes WHERE medico_id = ?", [req.user.id]) as any;
      const [citasCount] = await pool.query(`
        SELECT COUNT(*) as count 
        FROM citas c 
        JOIN tratamientos t ON c.tratamiento_id = t.id 
        WHERE t.paciente_id IN (SELECT id FROM pacientes WHERE medico_id = ?) 
        AND c.estado = 'PROGRAMADA'
      `, [req.user.id]) as any;
      const [ingresosSum] = await pool.query(`
        SELECT COALESCE(SUM(monto), 0) as total 
        FROM pagos 
        WHERE tratamiento_id IN (SELECT id FROM tratamientos WHERE paciente_id IN (SELECT id FROM pacientes WHERE medico_id = ?))
        AND MONTH(fecha_pago) = MONTH(CURRENT_DATE()) AND YEAR(fecha_pago) = YEAR(CURRENT_DATE())
      `, [req.user.id]) as any;

      const [proximasCitas] = await pool.query(`
        SELECT c.*, p.nombre_completo as paciente_nombre, tt.nombre as tratamiento_nombre
        FROM citas c
        JOIN tratamientos t ON c.tratamiento_id = t.id
        JOIN pacientes p ON t.paciente_id = p.id
        JOIN tipos_tratamiento tt ON t.tipo_tratamiento_id = tt.id
        WHERE p.medico_id = ? AND c.estado = 'PROGRAMADA' AND c.fecha_programada >= CURRENT_TIMESTAMP
        ORDER BY c.fecha_programada ASC
        LIMIT 5
      `, [req.user.id]) as any;

      res.json({
        pacientes: pacientesCount[0].count,
        citasPendientes: citasCount[0].count,
        ingresosMes: ingresosSum[0].total,
        proximasCitas
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- PACIENTES ROUTES ---
  app.get("/api/pacientes", authenticateToken, async (req: any, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM pacientes WHERE medico_id = ? AND activo = 1", [req.user.id]);
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/pacientes/:id", authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    try {
      // Verify ownership
      const [pRows] = await pool.query("SELECT * FROM pacientes WHERE id = ? AND medico_id = ?", [id, req.user.id]) as any;
      if (pRows.length === 0) {
        return res.status(404).json({ error: "Paciente no encontrado" });
      }

      // Check for activity (treatments)
      const [tratamientos] = await pool.query("SELECT COUNT(*) as count FROM tratamientos WHERE paciente_id = ?", [id]) as any;
      
      if (tratamientos[0].count > 0) {
        // Logical delete
        await pool.query("UPDATE pacientes SET activo = 0 WHERE id = ?", [id]);
        res.json({ message: "Paciente inactivado (baja lógica) debido a que tiene historial registrado" });
      } else {
        // Physical delete
        await pool.query("DELETE FROM pacientes WHERE id = ?", [id]);
        res.json({ message: "Paciente eliminado permanentemente" });
      }
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

  app.get("/api/tratamientos", authenticateToken, async (req: any, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT t.*, p.nombre_completo as paciente_nombre, tt.nombre as tratamiento_nombre
        FROM tratamientos t
        JOIN pacientes p ON t.paciente_id = p.id
        JOIN tipos_tratamiento tt ON t.tipo_tratamiento_id = tt.id
        WHERE p.medico_id = ?
        ORDER BY t.created_at DESC
      `, [req.user.id]);
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/tratamientos/:id", authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Verify ownership
      const [tRows] = await connection.query(`
        SELECT t.id 
        FROM tratamientos t
        JOIN pacientes p ON t.paciente_id = p.id
        WHERE t.id = ? AND p.medico_id = ? AND t.estado = 'PENDIENTE'
      `, [id, req.user.id]) as any;

      if (tRows.length === 0) {
        throw new Error("Tratamiento no encontrado o no está en estado PENDIENTE");
      }

      // Delete associated citas
      await connection.query("DELETE FROM citas WHERE tratamiento_id = ?", [id]);
      
      // Delete the treatment
      await connection.query("DELETE FROM tratamientos WHERE id = ?", [id]);

      await connection.commit();
      res.json({ success: true });
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
        SELECT c.*, p.nombre_completo as paciente_nombre, tt.nombre as tratamiento_nombre, t.costo_total,
               (SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE tratamiento_id = t.id) as total_pagado
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

      // Get treatment info and current payments
      const [cRows] = await connection.query(`
        SELECT c.tratamiento_id, t.costo_total,
               (SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE tratamiento_id = t.id) as total_pagado
        FROM citas c
        JOIN tratamientos t ON c.tratamiento_id = t.id
        WHERE c.id = ?
      `, [cita_id]) as any;
      
      if (cRows.length === 0) throw new Error("Cita no encontrada");
      const cita = cRows[0];
      const saldoPendiente = cita.costo_total - cita.total_pagado;

      if (abono > saldoPendiente + 0.01) { // Small margin for floating point
        throw new Error(`El abono (Bs. ${abono}) no puede ser mayor al saldo pendiente (Bs. ${saldoPendiente.toFixed(2)})`);
      }

      // Update current appointment
      await connection.query("UPDATE citas SET estado = 'REALIZADA', fecha_atencion = CURRENT_TIMESTAMP, observaciones = ? WHERE id = ?", [descripcion_servicio, cita_id]);
      
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
  app.get("/api/reportes/ingresos", authenticateToken, async (req: any, res) => {
    const { inicio, fin, medicos } = req.query;
    try {
      let query = `
        SELECT p.monto, p.fecha_pago, tt.nombre as tratamiento, pac.nombre_completo as paciente, m.nombre_completo as medico
        FROM pagos p
        JOIN tratamientos t ON p.tratamiento_id = t.id
        JOIN tipos_tratamiento tt ON t.tipo_tratamiento_id = tt.id
        JOIN pacientes pac ON t.paciente_id = pac.id
        JOIN medicos m ON pac.medico_id = m.id
        WHERE p.fecha_pago BETWEEN ? AND ?
      `;
      
      const params: any[] = [inicio || '1970-01-01', fin || '2100-01-01'];

      if (req.user.es_admin && medicos) {
        const medicoIds = medicos.split(',').map((id: string) => parseInt(id));
        query += ` AND pac.medico_id IN (${medicoIds.map(() => '?').join(',')})`;
        params.push(...medicoIds);
      } else {
        query += ` AND pac.medico_id = ?`;
        params.push(req.user.id);
      }

      query += ` ORDER BY p.fecha_pago DESC`;
      
      const [rows] = await pool.query(query, params);
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reportes/cuentas-cobrar", authenticateToken, async (req: any, res) => {
    const { medicos } = req.query;
    try {
      let query = `
        SELECT t.id, pac.nombre_completo as paciente, tt.nombre as tratamiento, t.costo_total,
               (SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE tratamiento_id = t.id) as pagado,
               m.nombre_completo as medico
        FROM tratamientos t
        JOIN pacientes pac ON t.paciente_id = pac.id
        JOIN tipos_tratamiento tt ON t.tipo_tratamiento_id = tt.id
        JOIN medicos m ON pac.medico_id = m.id
        WHERE t.estado != 'FINALIZADO'
      `;
      
      const params: any[] = [];

      if (req.user.es_admin && medicos) {
        const medicoIds = medicos.split(',').map((id: string) => parseInt(id));
        query += ` AND pac.medico_id IN (${medicoIds.map(() => '?').join(',')})`;
        params.push(...medicoIds);
      } else {
        query += ` AND pac.medico_id = ?`;
        params.push(req.user.id);
      }

      const [rows] = await pool.query(query, params) as any;
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
