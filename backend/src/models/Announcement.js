const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      index: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    attachmentUrl: {
      type: String,
      trim: true,
      default: "",
    },
    targetAudience: {
      type: String,
      enum: ["all", "field", "office", "remote"],
      default: "all",
      index: true,
    },
    scheduledFor: {
      type: Date,
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isDraft: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

announcementSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Announcement", announcementSchema);
