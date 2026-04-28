const mongoose = require("mongoose");

const trackingLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },
    attendanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attendance",
      required: true,
      index: true,
    },
    lat: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    lng: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    accuracy: {
      type: Number,
      required: true,
      min: 0,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    speedKmh: {
      type: Number,
      default: null,
      min: 0,
    },
    distanceFromPreviousMeters: {
      type: Number,
      default: null,
      min: 0,
    },
    deviceId: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
    isSuspicious: {
      type: Boolean,
      default: false,
      index: true,
    },
    suspicionFlags: {
      type: [
        {
          code: { type: String, required: true },
          detail: { type: String, default: "" },
          _id: false,
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

trackingLogSchema.index({ userId: 1, timestamp: -1 });
trackingLogSchema.index({ attendanceId: 1, timestamp: -1 });
trackingLogSchema.index({ userId: 1, attendanceId: 1, timestamp: -1 });

trackingLogSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("TrackingLog", trackingLogSchema);
