interface ISPSetting {
  name: string;   // free-form label for this SP level, e.g. "SP 1", "SP 2"
  point: number;  // threshold: a grand_total <= point maps to this level
  createdAt?: Date;
  updatedAt?: Date;
}

export default ISPSetting;
