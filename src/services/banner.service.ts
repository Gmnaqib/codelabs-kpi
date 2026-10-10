import bannerRepository from "../repository/banner.repository";
import userRepository from "../repository/user.repository";
import pointWalletService from "./pointWallet.service";
import { IBanner } from "../models/banner/banner.interface";
import { Types } from "mongoose";

const bannerService = {
  createBanner: async (data: { name: string; point_cost: number; image: string }): Promise<IBanner> => {
    if (!data.name || !data.name.trim()) throw new Error("Name is required");
    if (data.point_cost === undefined || data.point_cost < 0) throw new Error("point_cost must be a non-negative number");
    if (!data.image) throw new Error("image is required");

    return await bannerRepository.create(data);
  },

  getAllBanners: async () => {
    return await bannerRepository.findAll();
  },

  updateBanner: async (id: string, data: Partial<{ name: string; point_cost: number; image: string }>): Promise<IBanner> => {
    if (data.name !== undefined && !data.name.trim()) throw new Error("Name is required");
    if (data.point_cost !== undefined && data.point_cost < 0) throw new Error("point_cost must be a non-negative number");

    const updated = await bannerRepository.updateById(id, data);
    if (!updated) throw new Error("Banner not found");
    return updated;
  },

  // Hard delete — a banner is purely cosmetic (unlike KPIDetail, no point
  // history depends on it existing), so no soft-delete/freeze is needed.
  // Still cleans up ownership rows and un-equips it for anyone wearing it,
  // so nothing is left pointing at a dangling id.
  deleteBanner: async (id: string): Promise<IBanner> => {
    const deleted = await bannerRepository.deleteById(id);
    if (!deleted) throw new Error("Banner not found");

    await Promise.all([
      bannerRepository.deleteOwnershipByBannerId(id),
      userRepository.clearActiveBannerId(id),
    ]);

    return deleted;
  },

  // Owned banners for a user, plus which one (if any) is currently equipped.
  getMyBanners: async (userId: string) => {
    const [owned, user] = await Promise.all([
      bannerRepository.findOwnedByUserId(userId),
      userRepository.findUserById(userId),
    ]);
    if (!user) throw new Error("User not found");

    const activeBannerId = (user as any).active_banner_id ? String((user as any).active_banner_id) : null;
    return {
      activeBannerId,
      // bannerId can populate to null if the banner was deleted after being
      // bought — skip those rather than crashing on a dangling reference.
      owned: owned
        .filter((o: any) => o.bannerId)
        .map((o: any) => ({
          _id: o.bannerId._id,
          name: o.bannerId.name,
          point_cost: o.bannerId.point_cost,
          image: o.bannerId.image,
          active: activeBannerId === o.bannerId._id.toString(),
        })),
    };
  },

  // Self-service purchase. If the user already owns this banner, this just
  // equips it instead of charging them again (matches "switch" behavior).
  buyBanner: async (userId: string, bannerId: string) => {
    if (!Types.ObjectId.isValid(bannerId)) throw new Error("Invalid bannerId format");

    const banner = await bannerRepository.findById(bannerId);
    if (!banner) throw new Error("Banner not found");

    const alreadyOwned = await bannerRepository.findOwnership(userId, bannerId);
    if (alreadyOwned) {
      return bannerService.equipBanner(userId, bannerId);
    }

    // Free banners (point_cost === 0) skip the wallet entirely — redeemPoints
    // rejects a zero/non-positive amount since there's nothing to deduct.
    if (banner.point_cost > 0) {
      // Throws if the user's wallet balance is insufficient.
      await pointWalletService.redeemPoints(userId, banner.point_cost, `Bought banner: ${banner.name}`, userId);
    }

    await bannerRepository.createOwnership(new Types.ObjectId(userId), new Types.ObjectId(bannerId));
    await userRepository.updateUserById(userId, { active_banner_id: bannerId } as any);

    const [wallet, user] = await Promise.all([
      pointWalletService.getWalletBalance(userId),
      userRepository.findUserById(userId),
    ]);

    return { banner, wallet, activeBannerId: (user as any)?.active_banner_id ?? bannerId };
  },

  // Switches the active banner among ones the user already owns — no charge.
  equipBanner: async (userId: string, bannerId: string) => {
    if (!Types.ObjectId.isValid(bannerId)) throw new Error("Invalid bannerId format");

    const owned = await bannerRepository.findOwnership(userId, bannerId);
    if (!owned) throw new Error("You don't own this banner yet");

    const user = await userRepository.updateUserById(userId, { active_banner_id: bannerId } as any);
    return { activeBannerId: (user as any)?.active_banner_id ?? bannerId };
  },

  unequipBanner: async (userId: string) => {
    await userRepository.updateUserById(userId, { active_banner_id: null } as any);
    return { activeBannerId: null };
  },
};

export default bannerService;
