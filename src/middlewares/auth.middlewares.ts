import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import "dotenv/config";

export interface AuthRequest extends Request {
  user?: any;
  file?: any;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Access denied, token missing" });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    const decoded: any = jwt.verify(token as string, secret);

    req.user = {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      nim: decoded.nim,
      role: decoded.role,
      majors: decoded.majors,
      years: decoded.years,
      image: decoded.image,
      status: decoded.status,
      research: decoded.research,
      change_mac_address: decoded.change_mac_address,
      mac_address: decoded.mac_address,
    };
    next();
  } catch (err: any) {
    res.status(403).json({ message: err.message });
  }
};
