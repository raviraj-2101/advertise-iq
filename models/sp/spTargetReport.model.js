const mongoose = require("mongoose");
const spTargetReportSchema = new mongoose.Schema(
  {
    profileId: {
      type: Number,
      trim: true,
    },
    reportTypeId: {
      type: String,
      trim: true,
    },
    startDate: {
      type: String,
      trim: true,
    },
    endDate: {
      type: String,
      trim: true,
    },
    reportId: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      trim: true,
    },
    cronRun: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);
module.exports = new mongoose.model("spTargetReport", spTargetReportSchema);
