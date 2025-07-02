const { body, param, validationResult } = require("express-validator");

const createCampaignValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Campaign name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),

  body("goals")
    .trim()
    .notEmpty()
    .withMessage("Goals are required")
    .isIn(["engagement", "awareness", "conversion"])
    .withMessage("Goals must be one of: engagement, awareness, conversion"),

  // kpi is required when goals is engagement
  body("kpi")
    .if(body("goals").equals("engagement"))
    .notEmpty()
    .withMessage("KPI is required for engagement campaigns")
    .isString()
    .withMessage("KPI must be a string"),

  body("targetNumber")
    .notEmpty()
    .withMessage("Target number is required")
    .isInt({ gt: 0 })
    .withMessage("Target number must be a positive integer"),

  body("targetAudience")
    .notEmpty()
    .withMessage("Target audience is required")
    .custom((audience) => {
      if (typeof audience !== "object")
        throw new Error("Target audience must be an object");
      const { age, gender } = audience;
      if (!age) throw new Error("Target audience age is required");
      if (!gender) throw new Error("Target audience gender is required");
      return true;
    }),

  body("industry")
    .trim()
    .notEmpty()
    .withMessage("Industry is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Industry must be between 2 and 50 characters"),

  body("valuePerUser")
    .trim()
    .notEmpty()
    .withMessage("Value per user denomination is required"),

  body("valuePerUserAmount")
    .notEmpty()
    .withMessage("Value per user amount is required")
    .isFloat({ gt: 0 })
    .withMessage("Value per user amount must be a positive number"),

  body("totalLiquidity")
    .notEmpty()
    .withMessage("Total liquidity is required")
    .isFloat({ gt: 0 })
    .withMessage("Total liquidity must be a positive number")
    .custom((totalLiquidity, { req }) => {
      const valueAmount = parseFloat(req.body.valuePerUserAmount);
      if (valueAmount > totalLiquidity) {
        throw new Error(
          "Value per user amount cannot be greater than total liquidity"
        );
      }
      return true;
    }),

  body("website")
    .trim()
    .notEmpty()
    .withMessage("Website is required")
    .isURL()
    .withMessage("Please provide a valid URL"),

  body("xAccount")
    .trim()
    .notEmpty()
    .withMessage("X/Twitter account is required")
    .isString()
    .withMessage("X account must be a string"),

  // Optional social links
  body("youtube").optional().trim().isURL().withMessage("Invalid YouTube URL"),
  body("instagram")
    .optional()
    .trim()
    .isURL()
    .withMessage("Invalid Instagram URL"),
  body("telegram")
    .optional()
    .trim()
    .isURL()
    .withMessage("Invalid Telegram URL"),
  body("discord").optional().trim().isURL().withMessage("Invalid Discord URL"),
  body("otherSocials").optional().trim(),
  body("otherInfo").optional().trim(),

  // transactionId must reference an existing successful transaction
  body("transactionId")
    .notEmpty()
    .withMessage("Transaction ID is required")
    .isMongoId()
    .withMessage("Invalid transaction ID"),

  body("startDate")
    .notEmpty()
    .withMessage("Start date is required")
    .isISO8601()
    .withMessage("Start date must be a valid date"),

  body("endDate")
    .notEmpty()
    .withMessage("End date is required")
    .isISO8601()
    .withMessage("End date must be a valid date")
    .custom((endDate, { req }) => {
      if (new Date(endDate) <= new Date(req.body.startDate)) {
        throw new Error("End date must be after start date");
      }
      return true;
    }),

  // handle validation result
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

// Validation chain for updating a campaign's status
const updateCampaignStatusValidation = [
  body("campaignId")
    .notEmpty()
    .withMessage("Campaign ID is required")
    .isMongoId()
    .withMessage("Invalid campaign ID"),

  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["pending", "active", "inactive", "completed"])
    .withMessage("Status must be one of: pending, active, inactive, completed"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

const joinCampaignValidation = [
  param("campaignId")
    .notEmpty()
    .withMessage("Campaign ID is required")
    .isMongoId()
    .withMessage("Invalid campaign ID"),

  body("wallet")
    .notEmpty()
    .withMessage("Wallet address is required")
    .isString()
    .withMessage("Wallet must be a string"),

  body("email").optional().isEmail().withMessage("Invalid email format"),

  body("xAccount")
    .optional()
    .isString()
    .withMessage("X/Twitter account must be a string"),
  body("youtube").optional().isURL().withMessage("Invalid YouTube URL"),
  body("instagram").optional().isURL().withMessage("Invalid Instagram URL"),
  body("telegram").optional().isURL().withMessage("Invalid Telegram URL"),
  body("discord").optional().isURL().withMessage("Invalid Discord URL"),
];

module.exports = {
  createCampaignValidation,
  updateCampaignStatusValidation,
  joinCampaignValidation,
};
