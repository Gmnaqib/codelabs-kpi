import { RouterOSAPI } from "node-routeros";
import "dotenv/config";

const getMikrotikConnection = () => {
  return new RouterOSAPI({
    host: process.env.MIKROTIK_HOST!,
    user: process.env.MIKROTIK_USER!,
    password: process.env.MIKROTIK_PASS!,
    port: Number(process.env.MIKROTIK_PORT) || 8728,
    timeout: 5,
  });
};

let leaseCache: any[] = [];
let leaseCacheReady = false;

const fetchAndCacheLeases = async (): Promise<void> => {
  const conn = getMikrotikConnection();
  try {
    await conn.connect();
    const result = await conn.write("/ip/dhcp-server/lease/getall");
    leaseCache = result as any[];
    leaseCacheReady = true;
  } catch (error: any) {
    console.error(`[MikroTik] Background cache refresh failed: ${error.message}`);
  } finally {
    await conn.close();
  }
};

// Warm up cache saat module pertama kali di-load
fetchAndCacheLeases();
// Refresh otomatis setiap 55 detik di background
setInterval(fetchAndCacheLeases, 55_000);

const mikrotikService = {
  getArpTable: async (): Promise<any[]> => {
    const conn = getMikrotikConnection();
    try {
      await conn.connect();
      const result = await conn.write("/ip/arp/getall");
      return result as any[];
    } catch (error: any) {
      console.error(`[MikroTik] Connection failed: ${error.message}`);
      throw new Error(`Failed to connect to MikroTik: ${error.message}`);
    } finally {
      await conn.close();
    }
  },

  getDhcpLeases: async (): Promise<any[]> => {
    if (leaseCacheReady) {
      return leaseCache;
    }
    // Cache belum siap (server baru start, fetch belum selesai) — fallback langsung ke MikroTik
    const conn = getMikrotikConnection();
    try {
      await conn.connect();
      const result = await conn.write("/ip/dhcp-server/lease/getall");
      leaseCache = result as any[];
      leaseCacheReady = true;
      return leaseCache;
    } catch (error: any) {
      console.error(`[MikroTik] DHCP lease fetch failed: ${error.message}`);
      throw new Error(`Failed to fetch DHCP leases from MikroTik: ${error.message}`);
    } finally {
      await conn.close();
    }
  },

  getMacAddressByIp: async (ip: string): Promise<string | null> => {
    const normalizedIp = ip.replace(/^::ffff:/, "").trim();
    try {
      const leases = await mikrotikService.getDhcpLeases();
      const entry = leases.find((item: any) => {
        const activeAddr = item["active-address"]?.trim();
        const addr = item.address?.trim();
        return activeAddr === normalizedIp || addr === normalizedIp;
      });
      if (!entry) return null;
      const rawMac: string | undefined = entry["active-mac-address"] || entry["mac-address"];
      if (!rawMac) return null;
      return rawMac.toUpperCase().replace(/-/g, ":");
    } catch (error: any) {
      console.error(`[MikroTik] getMacAddressByIp failed: ${error.message}`);
      throw new Error(`MikroTik DHCP lookup failed: ${error.message}`);
    }
  },

  isMacAddressActive: async (macAddress: string): Promise<boolean> => {
    try {
      const arpTable = await mikrotikService.getArpTable();
      const normalizedMac = macAddress.toUpperCase();
      return arpTable.some((device: any) => device["mac-address"]?.toUpperCase() === normalizedMac);
    } catch (error: any) {
      throw new Error(`MikroTik validation failed: ${error.message}`);
    }
  },
};

export default mikrotikService;
