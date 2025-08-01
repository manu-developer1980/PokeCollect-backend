import { Request, Response } from 'express';
import { brevoService } from '../lib/brevo-service';

/**
 * Controlador para manejar las operaciones de Brevo
 */
export class BrevoController {
  /**
   * Envía un email transaccional
   */
  static async sendTransactionalEmail(req: Request, res: Response): Promise<void> {
    try {
      const { to, subject, htmlContent, textContent, sender, replyTo, tags, params } = req.body;

      // Validar campos requeridos
      if (!to || !Array.isArray(to) || to.length === 0) {
        res.status(400).json({
          success: false,
          error: 'El campo "to" es requerido y debe ser un array con al menos un destinatario'
        });
        return;
      }

      if (!subject) {
        res.status(400).json({
          success: false,
          error: 'El campo "subject" es requerido'
        });
        return;
      }

      if (!htmlContent && !textContent) {
        res.status(400).json({
          success: false,
          error: 'Se requiere al menos "htmlContent" o "textContent"'
        });
        return;
      }

      // Validar formato de emails
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const recipient of to) {
        if (!recipient.email || !emailRegex.test(recipient.email)) {
          res.status(400).json({
            success: false,
            error: `Email inválido: ${recipient.email}`
          });
          return;
        }
      }

      const emailData = {
        to,
        subject,
        htmlContent,
        textContent,
        sender,
        replyTo,
        tags,
        params
      };

      const result = await brevoService.sendTransactionalEmail(emailData);

      if (result.success) {
        res.json({
          success: true,
          data: { messageId: result.messageId },
          message: 'Email enviado exitosamente'
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('❌ Error enviando email transaccional:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Envía un email usando una plantilla
   */
  static async sendTemplateEmail(req: Request, res: Response): Promise<void> {
    try {
      const { templateId, to, params, tags } = req.body;

      // Validar campos requeridos
      if (!templateId || typeof templateId !== 'number') {
        res.status(400).json({
          success: false,
          error: 'El campo "templateId" es requerido y debe ser un número'
        });
        return;
      }

      if (!to || !Array.isArray(to) || to.length === 0) {
        res.status(400).json({
          success: false,
          error: 'El campo "to" es requerido y debe ser un array con al menos un destinatario'
        });
        return;
      }

      // Validar formato de emails
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const recipient of to) {
        if (!recipient.email || !emailRegex.test(recipient.email)) {
          res.status(400).json({
            success: false,
            error: `Email inválido: ${recipient.email}`
          });
          return;
        }
      }

      const result = await brevoService.sendTemplateEmail(templateId, to, params, tags);

      if (result.success) {
        res.json({
          success: true,
          data: { messageId: result.messageId },
          message: 'Email con plantilla enviado exitosamente'
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('❌ Error enviando email con plantilla:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Crea o actualiza un contacto
   */
  static async createOrUpdateContact(req: Request, res: Response): Promise<void> {
    try {
      const { email, attributes, listIds, updateEnabled } = req.body;

      // Validar email
      if (!email) {
        res.status(400).json({
          success: false,
          error: 'El campo "email" es requerido'
        });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          error: 'Formato de email inválido'
        });
        return;
      }

      const contactData = {
        email,
        attributes,
        listIds,
        updateEnabled
      };

      const result = await brevoService.createOrUpdateContact(contactData);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          message: 'Contacto creado/actualizado exitosamente'
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('❌ Error creando/actualizando contacto:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene información de un contacto
   */
  static async getContact(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.params;

      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email es requerido'
        });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          error: 'Formato de email inválido'
        });
        return;
      }

      const result = await brevoService.getContact(email);

      if (result.success) {
        res.json({
          success: true,
          data: result.data
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('❌ Error obteniendo contacto:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene todas las listas de contactos
   */
  static async getLists(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      if (limit < 1 || limit > 100) {
        res.status(400).json({
          success: false,
          error: 'El límite debe estar entre 1 y 100'
        });
        return;
      }

      if (offset < 0) {
        res.status(400).json({
          success: false,
          error: 'El offset debe ser mayor o igual a 0'
        });
        return;
      }

      const result = await brevoService.getLists(limit, offset);

      if (result.success) {
        res.json({
          success: true,
          data: result.data
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('❌ Error obteniendo listas:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Crea una nueva lista de contactos
   */
  static async createList(req: Request, res: Response): Promise<void> {
    try {
      const { name, folderId } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'El campo "name" es requerido y debe ser una cadena no vacía'
        });
        return;
      }

      if (folderId && (typeof folderId !== 'number' || folderId < 1)) {
        res.status(400).json({
          success: false,
          error: 'El campo "folderId" debe ser un número positivo'
        });
        return;
      }

      const result = await brevoService.createList(name.trim(), folderId);

      if (result.success) {
        res.status(201).json({
          success: true,
          data: result.data,
          message: 'Lista creada exitosamente'
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('❌ Error creando lista:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Añade contactos a una lista
   */
  static async addContactsToList(req: Request, res: Response): Promise<void> {
    try {
      const { listId } = req.params;
      const { emails } = req.body;

      if (!listId || isNaN(parseInt(listId))) {
        res.status(400).json({
          success: false,
          error: 'ID de lista inválido'
        });
        return;
      }

      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        res.status(400).json({
          success: false,
          error: 'El campo "emails" es requerido y debe ser un array con al menos un email'
        });
        return;
      }

      // Validar formato de emails
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const email of emails) {
        if (!emailRegex.test(email)) {
          res.status(400).json({
            success: false,
            error: `Email inválido: ${email}`
          });
          return;
        }
      }

      const result = await brevoService.addContactsToList(parseInt(listId), emails);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          message: 'Contactos añadidos a la lista exitosamente'
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('❌ Error añadiendo contactos a la lista:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene plantillas de email
   */
  static async getEmailTemplates(req: Request, res: Response): Promise<void> {
    try {
      const templateStatus = req.query.templateStatus === 'true' ? true : 
                           req.query.templateStatus === 'false' ? false : undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      if (limit < 1 || limit > 100) {
        res.status(400).json({
          success: false,
          error: 'El límite debe estar entre 1 y 100'
        });
        return;
      }

      if (offset < 0) {
        res.status(400).json({
          success: false,
          error: 'El offset debe ser mayor o igual a 0'
        });
        return;
      }

      const result = await brevoService.getEmailTemplates(templateStatus, limit, offset);

      if (result.success) {
        res.json({
          success: true,
          data: result.data
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('❌ Error obteniendo plantillas:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene estadísticas de email
   */
  static async getEmailStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, tag } = req.query;

      // Validar formato de fechas si se proporcionan
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (startDate && !dateRegex.test(startDate as string)) {
        res.status(400).json({
          success: false,
          error: 'Formato de startDate inválido. Use YYYY-MM-DD'
        });
        return;
      }

      if (endDate && !dateRegex.test(endDate as string)) {
        res.status(400).json({
          success: false,
          error: 'Formato de endDate inválido. Use YYYY-MM-DD'
        });
        return;
      }

      const result = await brevoService.getEmailStatistics(
        startDate as string,
        endDate as string,
        tag as string
      );

      if (result.success) {
        res.json({
          success: true,
          data: result.data
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Envía un email desde el formulario de contacto (función de conveniencia)
   */
  static async sendContactFormEmail(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, subject, message } = req.body;

      // Validar campos requeridos
      if (!name || !email || !subject || !message) {
        res.status(400).json({
          success: false,
          error: 'Todos los campos son requeridos: name, email, subject, message'
        });
        return;
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          error: 'Formato de email inválido'
        });
        return;
      }

      // Sanitizar texto
      const sanitizedData = {
        name: name.trim().substring(0, 100),
        email: email.trim().toLowerCase(),
        subject: subject.trim().substring(0, 200),
        message: message.trim().substring(0, 2000)
      };

      const result = await brevoService.sendContactFormEmail(sanitizedData);

      if (result.success) {
        res.json({
          success: true,
          data: { messageId: result.messageId },
          message: 'Mensaje de contacto enviado exitosamente'
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('❌ Error enviando mensaje de contacto:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
}