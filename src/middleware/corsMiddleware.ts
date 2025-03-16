import { Request, Response, NextFunction } from "express";

export function corsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Establecer los headers CORS para todas las respuestas
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  // Manejar las solicitudes OPTIONS de preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
}
