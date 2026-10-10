import bannerRepository from "../repository/banner.repository";
import userRepository from "../repository/user.repository";
import pointWalletService from "./pointWallet.service";
import { IBanner, BannerType } from "../models/banner/banner.interface";
import { Types } from "mongoose";

// Each item type has its own "equip slot" on the User document, so a user
// can wear a name background AND a profile frame at the same time instead
// of one replacing the other.
const EQUIP_FIELD_BY_TYPE: Record<BannerType, "active_banner_id" | "active_frame_id"> = {
  [BannerType.NameBackground]: "active_banner_id",
  [BannerType.ProfileFrame]: "active_frame_id",
};

const bannerService = {
  createBanner: async (data: { name: string; type: BannerType; point_cost: number; image: string }): Promise<IBanner> => {
    if (!data.name || !data.name.trim()) throw new Error("Name is required");
    if (!Object.values(BannerType).includes(data.type)) throw new Error("Invalid type");
    if (data.point_cost === undefined || data.point_cost < 0) throw new Error("point_cost must be a non-negative number");
    if (!data.image) throw new Error("image is required");

    return await bannerRepository.create(data);
  },

  getAllBanners: async () => {
    return await bannerRepository.findAll();
  },

  updateBanner: async (id: string, data: Partial<{ name: string; type: BannerType; point_cost: number; image: string }>): Promise<IBanner> => {
    if (data.name !== undefined && !data.name.trim()) throw new Error("Name is required");
    if (data.type !== undefined && !Object.values(BannerType).includes(data.type)) throw new Error("Invalid type");
    if (data.point_cost !== undefined && data.point_cost < 0) throw new Error("point_cost must be a non-negative number");

    const existing = await bannerRepository.findById(id);
    if (!existing) throw new Error("Banner not found");

    const updated = await bannerRepository.updateById(id, data);
    if (!updated) throw new Error("Banner not found");

    // Changing type moves it to a different equip slot — anyone who had it
    // equipped under the OLD slot would otherwise be left with a dangling
    // reference there (and no reference in the new slot, which is fine —
    // equip is a separate explicit action).
    if (data.type !== undefined && data.type !== existing.type) {
      const oldField = EQUIP_FIELD_BY_TYPE[existing.type];
      await (oldField === "active_banner_id" ? userRepository.clearActiveBannerId(id) : userRepository.clearActiveFrameId(id));
    }

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
      userRepository.clearActiveFrameId(id),
    ]);

    return deleted;
  },

  // Owned items for a user, plus which one (if any) is currently equipped
  // per slot (name background / profile frame).
  getMyBanners: async (userId: string) => {
    const [owned, user] = await Promise.all([
      bannerRepository.findOwnedByUserId(userId),
      userRepository.findUserById(userId),
    ]);
    if (!user) throw new Error("User not found");

    const activeBannerId = (user as any).active_banner_id ? String((user as any).active_banner_id) : null;
    const activeFrameId = (user as any).active_frame_id ? String((user as any).active_frame_id) : null;

    return {
      activeBannerId,
      activeFrameId,
      // bannerId can populate to null if the banner was deleted after being
      // bought — skip those rather than crashing on a dangling reference.
      owned: owned
        .filter((o: any) => o.bannerId)
        .map((o: any) => {
          const itemId = o.bannerId._id.toString();
          const type: BannerType = o.bannerId.type ?? BannerType.NameBackground;
          const activeId = type === BannerType.ProfileFrame ? activeFrameId : activeBannerId;
          return {
            _id: o.bannerId._id,
            name: o.bannerId.name,
            type,
            point_cost: o.bannerId.point_cost,
            image: o.bannerId.image,
            active: activeId === itemId,
          };
        }),
    };
  },

  // Self-service purchase. If the user already owns this item, this just
  // equips it instead of charging them again (matches "switch" behavior).
  buyBanner: async (userId: string, bannerId: string) => {
    if (!Types.ObjectId.isValid(bannerId)) throw new Error("Invalid bannerId format");

    const banner = await bannerRepository.findById(bannerId);
    if (!banner) throw new Error("Banner not found");

    const alreadyOwned = await bannerRepository.findOwnership(userId, bannerId);
    if (alreadyOwned) {
      return bannerService.equipBanner(userId, bannerId);
    }

    // Free items (point_cost === 0) skip the wallet entirely — redeemPoints
    // rejects a zero/non-positive amount since there's nothing to deduct.
    if (banner.point_cost > 0) {
      // Throws if the user's wallet balance is insufficient.
      await pointWalletService.redeemPoints(userId, banner.point_cost, `Bought ${banner.type === BannerType.ProfileFrame ? "frame" : "banner"}: ${banner.name}`, userId);
    }

    await bannerRepository.createOwnership(new Types.ObjectId(userId), new Types.ObjectId(bannerId));
    const equipField = EQUIP_FIELD_BY_TYPE[banner.type];
    const user = await userRepository.updateUserById(userId, { [equipField]: bannerId } as any);
    const wallet = await pointWalletService.getWalletBalance(userId);

    return {
      banner,
      wallet,
      activeBannerId: (user as any)?.active_banner_id ? String((user as any).active_banner_id) : null,
      activeFrameId: (user as any)?.active_frame_id ? String((user as any).active_frame_id) : null,
    };
  },

  // Switches the active item (within its own type's slot) among ones the
  // user already owns — no charge.
  equipBanner: async (userId: string, bannerId: string) => {
    if (!Types.ObjectId.isValid(bannerId)) throw new Error("Invalid bannerId format");

    const [owned, banner] = await Promise.all([
      bannerRepository.findOwnership(userId, bannerId),
      bannerRepository.findById(bannerId),
    ]);
    if (!owned) throw new Error("You don't own this item yet");
    if (!banner) throw new Error("Banner not found");

    const equipField = EQUIP_FIELD_BY_TYPE[banner.type];
    const user = await userRepository.updateUserById(userId, { [equipField]: bannerId } as any);
    return {
      activeBannerId: (user as any)?.active_banner_id ? String((user as any).active_banner_id) : null,
      activeFrameId: (user as any)?.active_frame_id ? String((user as any).active_frame_id) : null,
    };
  },

  unequipBanner: async (userId: string, type: BannerType) => {
    if (!Object.values(BannerType).includes(type)) throw new Error("Invalid type");
    const equipField = EQUIP_FIELD_BY_TYPE[type];
    await userRepository.updateUserById(userId, { [equipField]: null } as any);
    return { [equipField]: null };
  },
};

export default bannerService;
