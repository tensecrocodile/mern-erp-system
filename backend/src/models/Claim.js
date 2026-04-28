const mongoose = require("mongoose");

const { CLAIM_STATUS, CLAIM_TYPES } = require("../utils/constants");

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

const claimSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(CLAIM_TYPES),
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    attachments: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: Object.values(CLAIM_STATUS),
      default: CLAIM_STATUS.PENDING_MANAGER,
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

claimSchema.index({ userId: 1, status: 1 });
claimSchema.index({ userId: 1, createdAt: -1 });
claimSchema.index({ status: 1, date: -1 });
claimSchema.index({ "approvalHistory.by": 1 });

claimSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Claim", claimSchema);
