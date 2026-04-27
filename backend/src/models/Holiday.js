const mongoose = require("mongoose");

const { HOLIDAY_TYPES } = require("../utils/constants");

const holidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(HOLIDAY_TYPES),
      default: HOLIDAY_TYPES.COMPANY,
      index: true,
    },
    applicableTo: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      validate: {
        validator(value) {
          if (value === "all") {
            return true;
          }

          if (!Array.isArray(value) || value.length === 0) {
            return false;
          }

          return value.every((item) => mongoose.Types.ObjectId.isValid(item));
        },
        message: "applicableTo must be 'all' or a non-empty array of valid user IDs.",
      },
    },
    scopeKey: {
      type: String,
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

holidaySchema.index({ date: 1, scopeKey: 1 }, { unique: true });

holidaySchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    delete ret.scopeKey;
    return ret;
  },
});

module.exports = mongoose.model("Holiday", holidaySchema);
