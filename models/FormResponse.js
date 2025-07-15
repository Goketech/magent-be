const mongoose = require("mongoose");

const formResponseSchema = new mongoose.Schema(
  {
    formId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Form",
      required: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["completed", "partial"],
    },
    walletAddress: {
      type: String,
      required: false, // Optional field for wallet address
    },
    data: {
      type: Object, // This will store the form responses as key-value pairs
      required: true,
      validate: {
        validator: function (v) {
          // Ensure that the data object is not empty
          return Object.keys(v).length > 0;
        },
        message: "Form responses cannot be empty.",
      },
    },
    metadata: {
      type: {
        completionTime: {
          type: Number, // Time taken to complete the form in seconds
          default: 0,
        },
        referrer: {
          type: String, // The URL of the page that referred the user to the form
          default: "",
        },
      },
    },
  },
  { timestamps: true }
);

// Create compound index to ensure walletAddress is unique per formId
formResponseSchema.index({ formId: 1, walletAddress: 1 }, { unique: true, sparse: true });

const FormResponse = mongoose.model("FormResponse", formResponseSchema);
module.exports = FormResponse;
