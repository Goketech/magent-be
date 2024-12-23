const planCheck = (feature) => {
    return async (req, res, next) => {
      try {
        const user = req.user;
        
        // Check if plan is still active
        if (new Date() > user.planEndDate) {
          return res.status(403).json({ error: 'Plan has expired' });
        }
  
        // Check feature limits
        if (feature === 'aiCalls') {
          const { count, lastReset } = user.usage.aiCalls;
          const plan = user.plan;
  
          // Reset counter if needed
          const resetNeeded = plan.features.aiCalls.period === 'daily' 
            ? new Date(lastReset).getDate() !== new Date().getDate()
            : new Date(lastReset).getMonth() !== new Date().getMonth();
  
          if (resetNeeded) {
            user.usage.aiCalls.count = 0;
            user.usage.aiCalls.lastReset = new Date();
            await user.save();
          }
  
          if (count >= plan.features.aiCalls.limit) {
            return res.status(403).json({ error: 'AI calls limit reached for your plan' });
          }
        }
  
        next();
      } catch (error) {
        res.status(500).json({ error: 'Error checking plan limits' });
      }
    };
  };
  
  module.exports = planCheck;