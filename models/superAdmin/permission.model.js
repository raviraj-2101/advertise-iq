const mongoose = require("mongoose");
const permissionSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "customer_companies",
    },
    pages: [
      {
        pageId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "page",
        },
        allocatedActions: [
          {
            actionId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "pageAction",
            },
            status: {
              type: Boolean,
              default: true,
              trim: true,
            },
          },
        ],
        allocatedOn: {
          type: Date,
          default: new Date(),
        },
      },
    ],
  },
  { timestamps: true }
);
module.exports = new mongoose.model("permission", permissionSchema);
