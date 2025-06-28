const {
  scheduleCampaignExpiryJob,
  shutdown,
} = require("./jobs/campaignExpiryJob");

class JobScheduler {
  constructor() {
    this.jobs = [];
  }

  async initialize() {
    try {
      console.log("Initializing job scheduler...");

      // Schedule campaign expiry job
      await scheduleCampaignExpiryJob();
      this.jobs.push("campaign-expiry");

      console.log("All jobs scheduled successfully");

      // Setup graceful shutdown
    //   this.setupGracefulShutdown();
    } catch (error) {
      console.error("Error initializing job scheduler:", error);
      throw error;
    }
  }

  setupGracefulShutdown() {
    const handleShutdown = async (signal) => {
      console.log(`Received ${signal}, shutting down gracefully...`);

      try {
        await shutdown();
        console.log("Job scheduler shut down successfully");
        process.exit(0);
      } catch (error) {
        console.error("Error during shutdown:", error);
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => handleShutdown("SIGTERM"));
    process.on("SIGINT", () => handleShutdown("SIGINT"));
  }

  async shutdown() {
    try {
      console.log("Job scheduler shutting down...");
      await shutdown();
      console.log("Job scheduler shut down successfully");
    } catch (error) {
      console.error("Error during job scheduler shutdown:", error);
      throw error;
    }
  }

  getActiveJobs() {
    return this.jobs;
  }
}

// Export the scheduler instance
const jobScheduler = new JobScheduler();

module.exports = jobScheduler;

// If this file is run directly, initialize the scheduler
if (require.main === module) {
  jobScheduler
    .initialize()
    .then(() => {
      console.log("Job scheduler is running...");
      console.log("Active jobs:", jobScheduler.getActiveJobs());
    })
    .catch((error) => {
      console.error("Failed to initialize job scheduler:", error);
      process.exit(1);
    });
}
