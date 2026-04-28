const mongoose = require("mongoose");

const { ATTENDANCE_STATUS } = require("../utils/constants");

const locationSchema = new mongoose.Schema(
  {
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 250,
      default: "",
    },
    accuracy: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

const matchedGeoFenceSchema = new mongoose.Schema(
  {
    fenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GeoFence",
      required: true,
    },
    fenceName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    distanceFromCenterMeters: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

const attendanceEventSchema = new mongoose.Schema(
  {
    time: {
      type: Date,
      required: true,
    },
    location: {
      type: locationSchema,
      required: true,
    },
    selfieUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
    },
    matchedGeoFence: {
      type: matchedGeoFenceSchema,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const attendanceSchema = new mongoose.Schema(
  {
    user: {
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
    checkIn: {
      type: attendanceEventSchema,
      required: true,
    },
    checkOut: {
      type: attendanceEventSchema,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(ATTENDANCE_STATUS),
      default: ATTENDANCE_STATUS.CHECKED_IN,
      index: true,
    },
    workingMinutes: {
      type: Number,
      min: 0,
      default: 0,
    },
    isSuspicious: {
      type: Boolean,
      default: false,
      index: true,
    },
    fraudFlags: {
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

attendanceSchema.index({ user: 1, workDate: 1 }, { unique: true });
attendanceSchema.index(
  { user: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: ATTENDANCE_STATUS.CHECKED_IN,
    },
  }
);

attendanceSchema.virtual("workingDuration").get(function getWorkingDuration() {
  const totalMinutes = Number(this.workingMinutes || 0);

  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
});

attendanceSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Attendance", attendanceSchema);
