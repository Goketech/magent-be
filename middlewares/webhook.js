/**
 * Middleware: Verify the shared secret so only authorized webhooks are accepted.
 */
function verifyWebhookSecret(req, res, next) {
  const incomingSecret = req.headers["x-webhook-secret"];
  if (!incomingSecret || incomingSecret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Invalid webhook secret" });
  }
  next();
}

module.exports = verifyWebhookSecret;