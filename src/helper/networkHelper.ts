import { Request } from "express";

/**
 * Extract the real client IP from an Express request.
 * Priority: x-forwarded-for → req.ip → req.socket.remoteAddress
 * Strips ::ffff: prefix from IPv4-mapped IPv6 addresses.
 */
export const getClientIp = (req: Request): string => {
  const forwarded = req.headers["x-forwarded-for"];
  let ip: string;

  if (forwarded) {
    // x-forwarded-for can be "client, proxy1, proxy2" — take the first
    ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
  } else {
    ip = req.ip || req.socket?.remoteAddress || "unknown";
  }

  // Normalize: strip IPv4-mapped IPv6 prefix
  return ip.replace(/^::ffff:/, "").trim();
};
