const mongoose = require("mongoose");

const { ALERT_EVENT_TYPES, TRIP_IDLE_EVENT_STATUS, TRIP_STATUS } = require("../utils/constants");

const trackedLocationSchema = new mongoose.Schema(
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
    accuracy: {
      type: Number,
      required: true,
      min: 0,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 250,
      default: "",
    },
  },
  {
    _id: false,
  }
);

const routePointSchema = new mongoose.Schema(
  {
    recordedAt: {
      type: Date,
      required: true,
    },
    location: {
      type: trackedLocationSchema,
      required: true,
    },
    distanceFromPreviousMeters: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    _id: false,
  }
);

const idleCandidateSchema = new mongoose.Schema(
  {
    anchorLocation: {
      type: trackedLocationSchema,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    lastSeenAt: {
      type: Date,
      default: null,
    },
    maxDistanceMeters: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    _id: false,
  }
);

const idleEventSchema = new mongoose.Schema(
  {
    startedAt: {
      type: Date,
      required: true,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    durationMinutes: {
      type: Number,
      min: 0,
      default: 0,
    },
    anchorLocation: {
      type: trackedLocationSchema,
      required: true,
    },
    radiusMeters: {
      type: Number,
      required: true,
      min: 1,
    },
    thresholdMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    maxDistanceMeters: {
      type: Number,
      min: 0,
      default: 0,
    },
    alertTriggeredAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(TRIP_IDLE_EVENT_STATUS),
      default: TRIP_IDLE_EVENT_STATUS.ACTIVE,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const alertEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: Object.values(ALERT_EVENT_TYPES),
      required: true,
    },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "warning",
    },
    createdAt: {
      type: Date,
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    metadata: {
      idleEventId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
      radiusMeters: {
        type: Number,
        min: 0,
        default: 0,
      },
      thresholdMinutes: {
        type: Number,
        min: 0,
        default: 0,
      },
    },
  },
  {
    _id: true,
  }
);

const trackingStateSchema = new mongoose.Schema(
  {
    lastLocation: {
      type: routePointSchema,
      default: null,
    },
    idleCandidate: {
      type: idleCandidateSchema,
      default: null,
    },
    activeIdleEventId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const tripSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(TRIP_STATUS),
      default: TRIP_STATUS.ACTIVE,
      index: true,
    },
    startedAt: {
      type: Date,
      required: true,
      index: true,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    startLocation: {
      type: trackedLocationSchema,
      required: true,
    },
    endLocation: {
      type: trackedLocationSchema,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    routePoints: {
      type: [routePointSchema],
      default: [],
    },
    totalDistanceMeters: {
      type: Number,
      min: 0,
      default: 0,
    },
    idleEvents: {
      type: [idleEventSchema],
      default: [],
    },
    alertEvents: {
      type: [alertEventSchema],
      default: [],
    },
    trackingState: {
      type: trackingStateSchema,
      default: () => ({
        lastLocation: null,
        idleCandidate: null,
        activeIdleEventId: null,
      }),
    },
  },
  {
    timestamps: true,
  }
);

tripSchema.index(
  { user: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: TRIP_STATUS.ACTIVE,
    },
  }
);

tripSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    delete ret.trackingState;
    return ret;
  },
});

module.exports = mongoose.model("Trip", tripSchema);
