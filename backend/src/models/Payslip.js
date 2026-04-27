const mongoose = require("mongoose");

const componentSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 100 },
    amount: { type: Number, required: true },
    type: { type: String, enum: ["earning", "deduction"], required: true },
  },
  { _id: false }
);

const payslipSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
      min: 2000,
    },
    components: {
      type: [componentSchema],
      default: [],
    },
    grossPay: { type: Number, required: true, min: 0 },
    netPay: { type: Number, required: true, min: 0 },
    fileUrl: {
      type: String,
      trim: true,
      default: "",
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

payslipSchema.index({ userId: 1, year: -1, month: -1 });
payslipSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

payslipSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Payslip", payslipSchema);
