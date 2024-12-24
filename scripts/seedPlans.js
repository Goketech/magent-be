// scripts/seedPlans.js
const mongoose = require('mongoose');
require('dotenv').config();

const Plan = require('../models/Plan');

const plans = [
  {
    name: 'Free',
    price: 0,
    features: {
      aiCalls: {
        limit: 10,
        period: 'daily'
      }
    },
    isCustom: false
  },
  {
    name: 'Average',
    price: 29.99,
    features: {
      aiCalls: {
        limit: 100,
        period: 'daily'
      }
    },
    isCustom: false
  },
  {
    name: 'Pro',
    price: 99.99,
    features: {
      aiCalls: {
        limit: 1000,
        period: 'daily'
      }
    },
    isCustom: false
  }
];

const seedPlans = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Delete existing plans except custom ones
    await Plan.deleteMany({ isCustom: false });
    console.log('Deleted existing default plans');

    // Insert new plans
    const createdPlans = await Plan.insertMany(plans);
    console.log('Plans seeded successfully:', createdPlans.map(plan => plan.name));

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding plans:', error);
    process.exit(1);
  }
};

// Run the seeding function
seedPlans();