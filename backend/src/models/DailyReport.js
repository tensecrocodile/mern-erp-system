const mongoose = require("mongoose");

const plannedItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true, maxlength: 500 },
    clientOrLocation: { type: String, trim: true, maxlength: 200, default: "" },
    expectedTime: { type: String, trim: true, maxlength: 50, default: "" },
  },
  { _id: false }
);

const activityItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true, maxlength: 500 },
    clientOrLocation: { type: String, trim: true, maxlength: 200, default: "" },
    outcome: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { _id: false }
);

const dailyReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    workDate: {
      type: Date,
      required: true,
      index: true,
    },
    plannedItems: {
      type: [plannedItemSchema],
      default: [],
    },
    activityItems: {
      type: [activityItemSchema],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

dailyReportSchema.index({ userId: 1, workDate: -1 }, { unique: true });

dailyReportSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("DailyReport", dailyReportSchema);
