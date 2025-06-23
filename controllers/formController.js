const Form = require("../models/Form");
const FormResponse = require("../models/FormResponse");
const Campaign = require("../models/Campaign");

const createForm = async (req, res) => {
  try {
    const { title, description, fields, campaignId } = req.body;
    const userId = req.user._id;

    // Validate required fields
    if (!title || !campaignId) {
      return res
        .status(400)
        .json({ error: "Title and campaignId are required" });
    }
    if (!Array.isArray(fields) || fields.length === 0) {
      return res
        .status(400)
        .json({ error: "Fields must be a non-empty array" });
    }
    // Check if campaign exists and belongs to the user
    const campaign = await Campaign.findById(campaignId);
    if (!campaign || campaign.userId.toString() !== userId.toString()) {
      return res
        .status(404)
        .json({ error: "Campaign not found or unauthorized" });
    }

    if (
      campaign.feedbackFormId &&
      campaign.feedbackFormId.toString() !== "null"
    ) {
      return res
        .status(400)
        .json({ error: "Campaign already has a feedback form" });
    }

    const form = new Form({
      campaignId,
      title,
      description,
      createdBy: userId,
      fields: fields.map((field, index) => ({
        ...field,
        id: generateUUID(),
        order: index,
      })),
      status: "draft",
      isPublic: true,
      settings: {
        allowAnonymous: true,
        requireAuth: false,
        multipleSubmissions: true,
        theme: "default",
      },
      metadata: {
        totalSubmissions: 0,
      },
    });

    await form.save();

    const updatedCampaign = await Campaign.findByIdAndUpdate(
      campaignId,
      {
        $set: { feedbackFormId: form._id },
      },
      { new: true }
    );

    if (!updatedCampaign) {
      return res
        .status(404)
        .json({ error: "Campaign not found or unable to update" });
    }
    res.status(201).json(form);
  } catch (error) {
    console.error("Error creating form:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getForm = async (req, res) => {
  try {
    const { formId } = req.params;
    const userId = req.user._id;

    const form = await Form.findOne({
      _id: formId,
      createdBy: userId,
    }).populate("campaignId", "title description");

    if (!form) {
      return res.status(404).json({ error: "Form not found or unauthorized" });
    }

    res.json(form);
  } catch (error) {
    console.error("Error fetching form:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateForm = async (req, res) => {
  try {
    const { formId } = req.params;
    const { title, description, fields, settings, isPublic } = req.body;
    const userId = req.user._id;

    // Build update object
    const updateData = {
      updatedAt: new Date(),
    };

    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (settings) updateData.settings = { ...settings };

    if (fields && Array.isArray(fields)) {
      updateData.fields = fields.map((field, index) => ({
        ...field,
        id: field.id || generateUUID(),
        order: index,
      }));
    }

    const form = await Form.findOneAndUpdate(
      { _id: formId, createdBy: userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!form) {
      return res.status(404).json({ error: "Form not found or unauthorized" });
    }

    res.json(form);
  } catch (error) {
    console.error("Error updating form:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteForm = async (req, res) => {
  try {
    const { formId } = req.params;
    const userId = req.user._id;

    const form = await Form.findOneAndDelete({
      _id: formId,
      createdBy: userId,
    });

    if (!form) {
      return res.status(404).json({ error: "Form not found or unauthorized" });
    }

    // Delete all associated form responses
    await FormResponse.deleteMany({ formId: formId });

    res.json({ message: "Form and all responses deleted successfully" });
  } catch (error) {
    console.error("Error deleting form:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getPublicForm = async (req, res) => {
  try {
    const { slug } = req.params;

    const form = await Form.findOne({
      publicShareLink: slug,
      status: "published",
      isPublic: true,
    }).select("-createdBy -campaignId -updatedAt -__v");

    if (!form) {
      return res.status(404).json({ error: "Form not found or not public" });
    }

    // Check if form has expired
    if (form.settings.expiresAt && new Date() > form.settings.expiresAt) {
      return res.status(410).json({ error: "Form has expired" });
    }

    // Check submission limit
    if (
      form.settings.submissionLimit > 0 &&
      form.metadata.totalSubmissions >= form.settings.submissionLimit
    ) {
      return res
        .status(410)
        .json({ error: "Form has reached submission limit" });
    }

    res.json(form);
  } catch (error) {
    console.error("Error fetching public form:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const publishForm = async (req, res) => {
  try {
    const { formId } = req.params;
    const { isPublic } = req.body;
    const userId = req.user._id;

    const form = await Form.findOne({ _id: formId, createdBy: userId });

    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    const updatedForm = await Form.findOneAndUpdate(
      { _id: formId, createdBy: userId },
      {
        status: "published",
        isPublic,
        publicShareLink: isPublic
          ? generateSlug(form.title) + "-" + generateUUID().slice(0, 8)
          : undefined,
        updatedAt: new Date(),
      },
      { new: true }
    );

    res.json(updatedForm);
  } catch (error) {
    console.error("Error publishing form:", error);
    res.status(500).json({ error: error.message });
  }
};

const submitForm = async (req, res) => {
  try {
    const { slug } = req.params;
    const submissionData = req.body;

    const form = await Form.findOne({
      publicShareLink: slug,
      status: "published",
      isPublic: true,
    });

    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    // Check if form has expired
    if (form.settings.expiresAt && new Date() > form.settings.expiresAt) {
      return res.status(410).json({ error: "Form has expired" });
    }

    // Check submission limit
    if (
      form.settings.submissionLimit > 0 &&
      form.metadata.totalSubmissions >= form.settings.submissionLimit
    ) {
      return res
        .status(410)
        .json({ error: "Form has reached submission limit" });
    }

    // Validate submission data
    const validationResult = validateFormData(form.fields, submissionData);
    if (!validationResult.isValid) {
      return res.status(400).json({
        error: "Validation failed",
        details: validationResult.errors,
      });
    }

    const submission = new FormResponse({
      formId: form._id,
      submittedBy: req.user?._id,
      submittedAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      data: submissionData,
      status: "completed",
    });

    await submission.save();

    await Campaign.findOneAndUpdate(
      { _id: form.campaignId },
      {
        $inc: { feedbackFormResponseCount: 1 },
        $push: { feedbackFormResponses: submission._id },
      },
      { new: true }
    );

    // Update form metadata
    await Form.findByIdAndUpdate(form._id, {
      $inc: { "metadata.totalSubmissions": 1 },
      "metadata.lastSubmissionDate": new Date(),
    });

    res.status(201).json({ message: "Form submitted successfully" });
  } catch (error) {
    console.error("Error submitting form:", error);
    res.status(500).json({ error: error.message });
  }
};

const getSubmissions = async (req, res) => {
  try {
    const { formId } = req.params;
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;
    const userId = req.user._id;

    // Verify form ownership
    const form = await Form.findOne({ _id: formId, createdBy: userId });
    if (!form) {
      return res.status(404).json({ error: "Form not found or unauthorized" });
    }

    // Build query
    const query = { formId };

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.submittedAt = {};
      if (startDate) query.submittedAt.$gte = new Date(startDate);
      if (endDate) query.submittedAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [submissions, total] = await Promise.all([
      FormResponse.find(query)
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      FormResponse.countDocuments(query),
    ]);

    res.json({
      submissions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const { formId } = req.params;
    const { period = "30d" } = req.query;
    const userId = req.user._id;

    // Verify form ownership
    const form = await Form.findOne({ _id: formId, createdBy: userId });
    if (!form) {
      return res.status(404).json({ error: "Form not found or unauthorized" });
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate;

    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get basic stats
    const [totalSubmissions, completedSubmissions, partialSubmissions] =
      await Promise.all([
        FormResponse.countDocuments({ formId }),
        FormResponse.countDocuments({ formId, status: "completed" }),
        FormResponse.countDocuments({ formId, status: "partial" }),
      ]);

    // Get submissions over time
    const submissionsOverTime = await FormResponse.aggregate([
      {
        $match: {
          formId: form._id,
          submittedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$submittedAt" },
            month: { $month: "$submittedAt" },
            day: { $dayOfMonth: "$submittedAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
      },
    ]);

    // Get field analytics (for select, radio, checkbox fields)
    const fieldAnalytics = {};

    for (const field of form.fields) {
      if (["select", "radio", "checkbox"].includes(field.type)) {
        const responses = await FormResponse.aggregate([
          { $match: { formId: form._id } },
          { $project: { fieldValue: `$data.${field.id}` } },
          { $match: { fieldValue: { $exists: true, $ne: null } } },
          { $group: { _id: "$fieldValue", count: { $sum: 1 } } },
        ]);

        fieldAnalytics[field.id] = {
          label: field.label,
          type: field.type,
          responses,
        };
      }
    }

    // Get recent submissions
    const recentSubmissions = await FormResponse.find({ formId })
      .sort({ submittedAt: -1 })
      .limit(5)
      .select("submittedAt status ipAddress")
      .lean();

    const analytics = {
      overview: {
        totalSubmissions,
        completedSubmissions,
        partialSubmissions,
        completionRate:
          totalSubmissions > 0
            ? Math.round((completedSubmissions / totalSubmissions) * 100)
            : 0,
        lastSubmission: form.metadata.lastSubmissionDate,
      },
      submissionsOverTime,
      fieldAnalytics,
      recentSubmissions,
      form: {
        title: form.title,
        status: form.status,
        createdAt: form.createdAt,
        isPublic: form.isPublic,
      },
    };

    res.json(analytics);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Helper functions
const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

const validateFormData = (fields, data) => {
  const errors = [];
  let isValid = true;

  fields.forEach((field) => {
    const fieldValue = data[field.id];
    console.log("Validating field:", field.id, fieldValue);
    // Check required fields
    if (field.required && (!fieldValue || fieldValue === "")) {
      console.log("Field is required:", field.id, fieldValue);
      isValid = false;
      errors.push({
        field: field.id,
        message: `${field.label} is required`,
      });
      return;
    }

    // Skip validation if field is empty and not required
    if (!fieldValue && !field.required) return;

    // Type-specific validation
    switch (field.type) {
      case "email":
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(fieldValue)) {
          isValid = false;
          errors.push({
            field: field.id,
            message: `${field.label} must be a valid email address`,
          });
        }
        break;

      case "number":
        if (isNaN(fieldValue)) {
          isValid = false;
          errors.push({
            field: field.id,
            message: `${field.label} must be a number`,
          });
        } else {
          const numValue = parseFloat(fieldValue);
          if (
            field.config?.minValue !== null &&
            numValue < field.config.minValue
          ) {
            isValid = false;
            errors.push({
              field: field.id,
              message: `${field.label} must be at least ${field.config.minValue}`,
            });
          }
          if (
            field.config?.maxValue !== null &&
            numValue > field.config.maxValue
          ) {
            isValid = false;
            errors.push({
              field: field.id,
              message: `${field.label} must be at most ${field.config.maxValue}`,
            });
          }
        }
        break;

      case "text":
      case "textarea":
        if (
          field.validation?.minLength &&
          fieldValue.length < field.validation.minLength
        ) {
          isValid = false;
          errors.push({
            field: field.id,
            message: `${field.label} must be at least ${field.validation.minLength} characters`,
          });
        }
        if (
          field.validation?.maxLength &&
          fieldValue.length > field.validation.maxLength
        ) {
          isValid = false;
          errors.push({
            field: field.id,
            message: `${field.label} cannot exceed ${field.validation.maxLength} characters`,
          });
        }
        break;
    }
  });

  return { isValid, errors };
};

module.exports = {
  createForm,
  getForm,
  updateForm,
  deleteForm,
  getPublicForm,
  publishForm,
  submitForm,
  getSubmissions,
  getAnalytics,
};
