import { Router } from "express";
import { sendContactMessage } from "../controllers/contact.controller";

const router = Router();

// Ruta POST para enviar mensaje de contacto
// Endpoint: /api/contact
router.post("/", sendContactMessage);

export default router;