const express = require("express");
const {
  createForm,
  getForm,
  updateForm,
  deleteForm,
  getPublicForm,
  publishForm,
  submitForm,
  getSubmissions,
  getAnalytics,
} = require("../controllers/formController");
const auth = require("../middlewares/auth");

const router = express.Router();
router.post('/', auth, createForm);
// router.get('/', auth, FormController.getUserForms);
router.get('/:formId', auth, getForm);
router.put('/:formId', auth, updateForm);
router.delete('/:formId', auth, deleteForm);

// Public Access
router.get('/public/:slug', getPublicForm);
router.post('/public/:slug/submit', submitForm);

// Form Management
router.post('/:formId/publish', auth, publishForm);
// router.post('/:formId/duplicate', auth, FormController.duplicateForm);
router.get('/:formId/submissions', auth, getSubmissions);
router.get('/:formId/analytics', auth, getAnalytics);


module.exports = router;
