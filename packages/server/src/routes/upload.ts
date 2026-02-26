import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import { parseCSV } from '../ingestion/csv-parser.js';
import { parsePDF } from '../ingestion/pdf-parser.js';
import { normalizeObservations } from '../ingestion/normalizer.js';
import { createObservations } from '../db/queries.js';

export const uploadRouter = Router();
uploadRouter.use(authenticateToken);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['text/csv', 'application/pdf', 'image/png', 'image/jpeg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

uploadRouter.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const userId = req.user!.userId;
    let rawObservations: any[];

    switch (req.file.mimetype) {
      case 'text/csv':
        rawObservations = await parseCSV(req.file.buffer, userId);
        break;
      case 'application/pdf':
        rawObservations = await parsePDF(req.file.buffer, userId);
        break;
      default:
        res.status(400).json({ error: `Unsupported file type: ${req.file.mimetype}` });
        return;
    }

    const normalized = normalizeObservations(rawObservations);
    const saved = await createObservations(normalized);

    res.status(201).json({
      message: `Imported ${saved.length} observations`,
      count: saved.length,
      observations: saved,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to process upload' });
  }
});
