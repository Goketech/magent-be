const { Queue, Worker } = require('bullmq');
const Campaign = require('../models/Campaign');
const redis = require('../utils/redis');

// Create the queue
const campaignExpiryQueue = new Queue('campaign-expiry', {
  connection: redis,
});

// Job processor function
const processCampaignExpiry = async (job) => {
  try {
    console.log(`Processing campaign expiry job at ${new Date().toISOString()}`);
    
    // Get current date at midnight for comparison
    const now = new Date();
    const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Find campaigns that should be expired
    // Campaigns with endDate < current date and status is 'active'
    const expiredCampaigns = await Campaign.find({
      endDate: { $lt: currentDate },
      status: 'active'
    });

    console.log(`Found ${expiredCampaigns.length} campaigns to expire`);

    if (expiredCampaigns.length === 0) {
      console.log('No campaigns to expire');
      return { processed: 0, message: 'No campaigns to expire' };
    }

    // Update campaigns to completed status
    const campaignIds = expiredCampaigns.map(campaign => campaign._id);
    
    const updateResult = await Campaign.updateMany(
      { 
        _id: { $in: campaignIds },
        status: 'active' // Double-check status to avoid race conditions
      },
      { 
        $set: { status: 'completed' }
      }
    );

    console.log(`Successfully updated ${updateResult.modifiedCount} campaigns to completed status`);
    
    // Log the campaigns that were updated
    const updatedCampaignNames = expiredCampaigns.map(campaign => campaign.name);
    console.log('Updated campaigns:', updatedCampaignNames);

    return {
      processed: updateResult.modifiedCount,
      campaignIds: campaignIds,
      campaignNames: updatedCampaignNames,
      message: `Successfully expired ${updateResult.modifiedCount} campaigns`
    };

  } catch (error) {
    console.error('Error processing campaign expiry job:', error);
    throw error; // This will mark the job as failed
  }
};

// Create the worker
const campaignExpiryWorker = new Worker('campaign-expiry', processCampaignExpiry, {
  connection: redis,
  concurrency: 1, // Process one job at a time
});

// Worker event handlers
campaignExpiryWorker.on('completed', (job, result) => {
  console.log(`Campaign expiry job ${job.id} completed:`, result);
});

campaignExpiryWorker.on('failed', (job, err) => {
  console.error(`Campaign expiry job ${job.id} failed:`, err);
});

campaignExpiryWorker.on('error', (err) => {
  console.error('Campaign expiry worker error:', err);
});

// Function to schedule the recurring job
const scheduleCampaignExpiryJob = async () => {
  try {
    // Remove any existing recurring jobs to avoid duplicates
    await campaignExpiryQueue.obliterate({ force: true });
    
    // Add recurring job that runs every day at 23:59 (11:59 PM)
    await campaignExpiryQueue.add(
      'expire-campaigns',
      {}, // No data needed for this job
      {
        repeat: {
          pattern: '59 23 * * *', // Cron pattern: 23:59 every day
        },
        removeOnComplete: 10, // Keep last 10 completed jobs
        removeOnFail: 5, // Keep last 5 failed jobs
      }
    );

    console.log('Campaign expiry job scheduled successfully');
  } catch (error) {
    console.error('Error scheduling campaign expiry job:', error);
    throw error;
  }
};

// Function to add a one-time job (useful for testing)
const addImmediateCampaignExpiryJob = async () => {
  try {
    const job = await campaignExpiryQueue.add('expire-campaigns-immediate', {});
    console.log(`Immediate campaign expiry job added with ID: ${job.id}`);
    return job;
  } catch (error) {
    console.error('Error adding immediate campaign expiry job:', error);
    throw error;
  }
};

// Graceful shutdown function
const shutdown = async () => {
  console.log('Shutting down campaign expiry worker...');
  await campaignExpiryWorker.close();
  await campaignExpiryQueue.close();
  console.log('Campaign expiry worker shut down successfully');
};

module.exports = {
  campaignExpiryQueue,
  campaignExpiryWorker,
  scheduleCampaignExpiryJob,
  addImmediateCampaignExpiryJob,
  shutdown,
};

// If this file is run directly, schedule the job
if (require.main === module) {
  scheduleCampaignExpiryJob()
    .then(() => {
      console.log('Campaign expiry job scheduling completed');
    })
    .catch((error) => {
      console.error('Failed to schedule campaign expiry job:', error);
      process.exit(1);
    });
}