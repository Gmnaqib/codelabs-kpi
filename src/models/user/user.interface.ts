interface IUser {
  name: string;
  email: string;
  dob?: Date;
  address?: string;
  image?: string;
  password: string;
  role?: Role;
  nim: string;
  majors: string;
  years: string;
  status?: Status;
  research?: Research;
  telegram_id?: string;
  telegram_username?: string;
  mac_address?: string;
  change_mac_address?: boolean;
  product_id?: string;
  image_updated_at?: Date;
}

export enum Role {
  Admin = "admin",
  Lecturer = "lecturer",
  MinisterOfResearch = "minister of research",
  MinisterOfCompetition = "minister of competition",
  MinisterOfBranding = "minister of branding",
  MinisterOfOperation = "minister of operation",
  President = "president",
  VicePresident = "vice president",
  Secretary = "secretary",
  User = "user",
}

export enum Status {
  active = "active",
  inactive = "inactive",
  graduated = "graduated",
}

export enum Research {
  website = "website",
  mobile = "mobile",
  game = "game",
  ui = "ui/ux",
  data = "data",
  other = "other",
}

export default IUser;
