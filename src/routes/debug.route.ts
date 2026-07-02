import { Router, Request, Response } from "express";

const debugRouter = Router();

// TEMPORARY DEBUG ENDPOINT
// Purpose: Verify what client IP the backend receives (real LAN IP vs proxy IP).
// This helps determine whether MikroTik ARP-based IP-to-MAC lookup will work.
// Safe to remove after IP detection is confirmed.
debugRouter.get("/ip", (req: Request, res: Response) => {
  const xForwardedFor = req.headers["x-forwarded-for"];
  const xRealIp = req.headers["x-real-ip"];

  console.log("══════════════════ DEBUG /debug/ip ══════════════════");
  console.log(`  req.ip:                    ${req.ip}`);
  console.log(`  req.ips:                   ${JSON.stringify(req.ips)}`);
  console.log(`  req.socket.remoteAddress:  ${req.socket.remoteAddress}`);
  console.log(`  x-forwarded-for:           ${xForwardedFor ?? "(not set)"}`);
  console.log(`  x-real-ip:                 ${xRealIp ?? "(not set)"}`);
  console.log(`  host:                      ${req.headers["host"] ?? "(not set)"}`);
  console.log(`  user-agent:                ${req.headers["user-agent"] ?? "(not set)"}`);
  console.log("══════════════════════════════════════════════════════");

  const data = {
    ip: req.ip,
    ips: req.ips,
    remoteAddress: req.socket.remoteAddress,
    headers: {
      "x-forwarded-for": xForwardedFor ?? null,
      "x-real-ip": xRealIp ?? null,
      host: req.headers["host"] ?? null,
      "user-agent": req.headers["user-agent"] ?? null,
    },
    note: "If x-forwarded-for is set, req.ip reflects the proxy IP, not the client. Without trust proxy, req.ip = direct TCP peer.",
  };

  res.status(200).json(data);
});

export default debugRouter;
