const mongoose = require("mongoose");

const coordinatePointSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false }
);

const geoFenceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    type: {
      type: String,
      enum: ["circle", "polygon"],
      default: "circle",
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    color: {
      type: String,
      trim: true,
      maxlength: 20,
      default: "#6366f1",
    },

    // ── Circle fields (kept for backward compat with existing records) ──
    center: {
      latitude: { type: Number, min: -90, max: 90, default: null },
      longitude: { type: Number, min: -180, max: 180, default: null },
    },
    radius: {
      type: Number,
      min: 1,
      max: 50000,
      default: null,
    },

    // ── Polygon fields ──────────────────────────────────────────
    polygon: {
      type: [coordinatePointSchema],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    assignedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

geoFenceSchema.index({ companyId: 1, isActive: 1 });
geoFenceSchema.index({ type: 1, isActive: 1 });

geoFenceSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("GeoFence", geoFenceSchema);
