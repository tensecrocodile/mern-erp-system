const mongoose = require("mongoose");

const { LEAVE_STATUS, LEAVE_TYPES } = require("../utils/constants");

const approvalEntrySchema = new mongoose.Schema(
  {
    action:    { type: String, enum: ["approved", "rejected"], required: true },
    by:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role:      { type: String, enum: ["manager", "hr"], required: true },
    comment:   { type: String, trim: true, maxlength: 500, default: "" },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

const leaveSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(LEAVE_TYPES),
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: Object.values(LEAVE_STATUS),
      default: LEAVE_STATUS.PENDING_MANAGER,
      index: true,
    },
    currentStage: {
      type: String,
      enum: ["manager", "hr", "completed"],
      default: "manager",
      index: true,
    },
    approvalHistory: {
      type: [approvalEntrySchema],
      default: [],
    },
  },
  { timestamps: true }
);

leaveSchema.index({ userId: 1, status: 1 });
leaveSchema.index({ userId: 1, startDate: -1, endDate: -1 });
leaveSchema.index({ status: 1, startDate: 1, endDate: 1 });
leaveSchema.index({ "approvalHistory.by": 1 });

leaveSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Leave", leaveSchema);
