const mongoose = require("mongoose");

const meetingLocationSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
    address: { type: String, trim: true, maxlength: 250, default: "" },
  },
  { _id: false }
);

const meetingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    clientName: { type: String, required: true, trim: true, maxlength: 120 },
    purpose: { type: String, required: true, trim: true, maxlength: 500 },
    notes: { type: String, trim: true, maxlength: 1000, default: "" },
    outcome: { type: String, trim: true, maxlength: 1000, default: "" },
    nextActionDate: { type: Date, default: null },
    location: { type: meetingLocationSchema, required: true },
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
    },
  },
  { timestamps: true }
);

meetingSchema.index({ userId: 1, createdAt: -1 });

meetingSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Meeting", meetingSchema);
