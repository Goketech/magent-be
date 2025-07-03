const mongoose = require("mongoose");

const formSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    settings: {
      type: {
        allowAnonymous: {
          type: Boolean,
          default: false,
        },
        requireAuth: {
          type: Boolean,
          default: false,
        },
        multipleSubmissions: {
          type: Boolean,
          default: false,
        },
        submissionLimit: {
          type: Number,
          default: 0, // 0 means no limit
        },
        expiresAt: {
          type: Date,
          default: null, // null means no expiration
        },
        customCss: {
          type: String,
          default: "",
        },
        theme: {
          type: String,
          enum: ["default", "minimal", "modern"],
          default: "default",
        },
      },
    },
    publicShareLink: {
      type: String,
      unique: true,
      sparse: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },
    metadata: {
      type: {
        totalSubmissions: {
          type: Number,
          default: 0,
        },
        lastSubmissionDate: {
          type: Date,
          default: null,
        },
      },
    },
    fields: [
      {
        _id: { type: String },
        type: {
          type: String,
          enum: [
            "text",
            "email",
            "number",
            "select",
            "checkbox",
            "radio",
            "textarea",
          ],
          required: true,
        },
        label: {
          type: String,
          required: true,
          trim: true,
        },
        placeholder: {
          type: String,
          default: "",
        },
        description: {
          type: String,
          default: "",
        },
        required: {
          type: Boolean,
          default: false,
        },
        order: {
          type: Number,
          default: 0,
        },
        validation: {
          type: {
            min: Number, // For number fields
            max: Number, // For number fields
            minLength: Number, // For text, email, textarea
            maxLength: Number, // For text, email, textarea
            pattern: String, // For custom validation
            custom: String, // For custom validation
          }, // For text, email, number
        },
        config: {
          multiline: {
            type: Boolean,
            default: false, // For textarea
          },
          options: {
            type: [
              {
                id: String, // Unique identifier for each option
                label: String, // Display label for the option
                value: String, // Value submitted for the option
              },
            ], // For select, checkbox, radio
            default: [],
          },
          minValue: {
            type: Number, // For number fields
            default: null,
          },
          maxValue: {
            type: Number, // For number fields
            default: null,
          },
          step: {
            type: Number, // For number fields
            default: 1,
          },
          showLabels: {
            type: Boolean, // For checkbox, radio
            default: true,
          },
          acceptedTypes: {
            type: [String], // For file upload
            default: [],
          },
          maxFileSize: {
            type: Number, // For file upload in bytes
            default: 10485760, // 10 MB
          },
          maxFiles: {
            type: Number, // For file upload
            default: 5,
          },

          maxRating: {
            type: Number, // For rating fields
            default: 5,
          },
          ratingType: {
            type: String, // For rating fields
            enum: ["stars", "numbers", "emojis"],
            default: "stars",
          },
        },
        conditions: {
          showIf: [
            {
              field: String, // The field to check
              operator: {
                type: String, // The operator to use (e.g., "equals", "not_equals", "contains")
                enum: [
                  "equals",
                  "not_equals",
                  "contains",
                  "greater_than",
                  "less_than",
                ],
              }, // The operator to use (e.g., "equals", "not_equals", "contains")
              value: String, // The value to match
            }, // For conditional visibility
          ],
          logic: {
            type: String, // The logic to apply (e.g., "and", "or")
            enum: ["and", "or"],
          },
        },
      },
    ],
  },
  { timestamps: true }
);

const Form = mongoose.model("Form", formSchema);
module.exports = Form;
