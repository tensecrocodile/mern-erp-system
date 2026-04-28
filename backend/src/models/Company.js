const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    domain: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 100,
      default: null,
    },
    plan: {
      type: String,
      enum: ["free", "starter", "professional", "enterprise"],
      default: "starter",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    settings: {
      defaultLeaveBalance: { type: Number, default: 12 },
      fullDayMinutes: { type: Number, default: 480 },
      maxGpsAccuracyMeters: { type: Number, default: 50 },
      timezone: { type: String, default: "Asia/Kolkata" },
      requireSelfie: { type: Boolean, default: true },
    },
    address: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    logoUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

companySchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Company", companySchema);
