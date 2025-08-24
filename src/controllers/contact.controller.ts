import { Request, Response } from "express";
import { brevoService } from "../lib/brevo-service";

// Interfaz para los datos del formulario de contacto
interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

// Función para validar email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Función para sanitizar texto
const sanitizeText = (text: string): string => {
  return text.trim().replace(/[<>"'&]/g, (match) => {
    const entities: { [key: string]: string } = {
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '&': '&amp;'
    };
    return entities[match] || match;
  });
};

// Controlador para enviar mensaje de contacto
export const sendContactMessage = async (req: Request, res: Response) => {
  try {
    const { name, email, subject, message }: ContactFormData = req.body;

    // Validación de campos requeridos
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        error: "Todos los campos son requeridos"
      });
    }

    // Validación de email
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: "El formato del email no es válido"
      });
    }

    // Validación de longitud de campos
    if (name.length > 100) {
      return res.status(400).json({
        success: false,
        error: "El nombre no puede exceder 100 caracteres"
      });
    }

    if (subject.length > 200) {
      return res.status(400).json({
        success: false,
        error: "El asunto no puede exceder 200 caracteres"
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        error: "El mensaje no puede exceder 2000 caracteres"
      });
    }

    // Sanitizar datos
    const sanitizedData = {
      name: sanitizeText(name),
      email: sanitizeText(email),
      subject: sanitizeText(subject),
      message: sanitizeText(message)
    };

    // Enviar email usando el nuevo servicio de Brevo
    const result = await brevoService.sendContactFormEmail(sanitizedData);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: "Mensaje enviado correctamente",
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || "Error interno del servidor al enviar el mensaje"
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error interno del servidor"
    });
  }
};