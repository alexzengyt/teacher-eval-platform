// evaluation-service/src/routes/documents.js
import express from "express";
import { pool } from "../db.js";
import { randomUUID } from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// Configure multer for file uploads
         const storage = multer.diskStorage({
           destination: (req, file, cb) => {
             const uploadDir = "/app/uploads/documents";
             // Create uploads directory if it doesn't exist
             if (!fs.existsSync(uploadDir)) {
               fs.mkdirSync(uploadDir, { recursive: true });
             }
             cb(null, uploadDir);
           },
           filename: (req, file, cb) => {
             // Generate unique filename: timestamp-uuid.extension
             const uniqueName = `${Date.now()}-${randomUUID()}${path.extname(file.originalname)}`;
             cb(null, uniqueName);
           }
         });

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Allow: PDF, DOC, DOCX, PNG, JPG
    const allowedTypes = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not allowed. Allowed types: PDF, DOC, DOCX, PNG, JPG`));
    }
  }
});

// GET /api/eval/documents/list
// List documents (filter by teacher_id if provided)
router.get("/list", async (req, res) => {
  try {
    const { teacher_id } = req.query;

    let sql = `
      SELECT 
        d.id,
        d.teacher_id,
        d.filename,
        d.original_filename,
        d.file_size,
        d.mime_type,
        d.document_type,
        d.description,
        d.uploaded_at,
        d.created_at,
        t.first_name,
        t.last_name,
        t.email
      FROM documents d
      LEFT JOIN teachers t ON t.id = d.teacher_id
    `;

    const params = [];
    if (teacher_id) {
      sql += " WHERE d.teacher_id = $1";
      params.push(teacher_id);
    }

    sql += " ORDER BY d.uploaded_at DESC";

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("List documents error:", err);
    res.status(500).json({ error: "Failed to list documents" });
  }
});

// POST /api/eval/documents/upload
// Upload a new document
router.post("/upload", upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { teacher_id, document_type, description } = req.body;

    if (!teacher_id) {
      return res.status(400).json({ error: "teacher_id is required" });
    }

    // Verify teacher exists
    const teacherCheck = await pool.query("SELECT id FROM teachers WHERE id = $1", [teacher_id]);
    if (teacherCheck.rowCount === 0) {
      // Delete uploaded file if teacher doesn't exist
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: "Teacher not found" });
    }

             // Insert document metadata into database
             const documentId = randomUUID();
             
             // Store absolute path for file retrieval
             const absoluteFilePath = `/app/uploads/documents/${req.file.filename}`;
             
             const result = await pool.query(
               `INSERT INTO documents (id, teacher_id, filename, original_filename, file_path, 
                  file_size, mime_type, document_type, description, uploaded_by, owner_type, owner_id, kind, url, uploaded_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
                RETURNING *`,
               [
                 documentId,
                 teacher_id,
                 req.file.filename,
                 req.file.originalname,
                 absoluteFilePath,  // Use absolute path
                 req.file.size,
                 req.file.mimetype,
                 document_type || 'other',
                 description || null,
                 null,  // uploaded_by - we don't have user info yet
                 'teacher',  // owner_type - documents are owned by teachers
                 teacher_id,  // owner_id - same as teacher_id
                 'file',  // kind - local file storage
                 `/api/eval/documents/${documentId}/download`,  // url - download URL
               ]
             );

    res.status(201).json({
      ok: true,
      document: result.rows[0]
    });
  } catch (err) {
    console.error("Document upload error:", err);
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: "Failed to upload document" });
  }
});

// GET /api/eval/documents/:id/download
// Download a document
router.get("/:id/download", async (req, res) => {
  console.log(`📥 Download request for document: ${req.params.id}`);
  try {
    const { id } = req.params;

    // Get document metadata
    const result = await pool.query(
      "SELECT * FROM documents WHERE id = $1",
      [id]
    );

    if (result.rowCount === 0) {
      console.log(`❌ Document not found: ${id}`);
      return res.status(404).json({ error: "Document not found" });
    }

    const doc = result.rows[0];
    console.log(`📄 Found document: ${doc.original_filename}`);

    // Check if file exists
    if (!fs.existsSync(doc.file_path)) {
      console.log(`❌ File not found on server: ${doc.file_path}`);
      return res.status(404).json({ error: "File not found on server" });
    }

    console.log(`✅ Streaming file: ${doc.file_path}`);

    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${doc.original_filename}"`);
    res.setHeader('Content-Type', doc.mime_type);

    // Stream file to response
    const fileStream = fs.createReadStream(doc.file_path);
    fileStream.pipe(res);

  } catch (err) {
    console.error("Download document error:", err);
    res.status(500).json({ error: "Failed to download document" });
  }
});

// GET /api/eval/documents/:id
// Get document metadata
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        d.*,
        t.first_name,
        t.last_name,
        t.email
       FROM documents d
       LEFT JOIN teachers t ON t.id = d.teacher_id
       WHERE d.id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get document error:", err);
    res.status(500).json({ error: "Failed to get document" });
  }
});

// DELETE /api/eval/documents/:id
// Delete a document
router.delete("/:id", async (req, res) => {
  console.log(`🗑️ Delete request for document: ${req.params.id}`);
  try {
    const { id } = req.params;

    // Get document to retrieve file path
    const result = await pool.query(
      "SELECT * FROM documents WHERE id = $1",
      [id]
    );

    if (result.rowCount === 0) {
      console.log(`❌ Document not found: ${id}`);
      return res.status(404).json({ error: "Document not found" });
    }

    const doc = result.rows[0];
    console.log(`🗑️ Deleting document: ${doc.original_filename}`);

    // Delete from database
    await pool.query("DELETE FROM documents WHERE id = $1", [id]);

    // Delete file from filesystem
    if (fs.existsSync(doc.file_path)) {
      fs.unlinkSync(doc.file_path);
      console.log(`✅ Deleted file: ${doc.file_path}`);
    }

    res.json({ ok: true, message: "Document deleted successfully" });
  } catch (err) {
    console.error("Delete document error:", err);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

export default router;

