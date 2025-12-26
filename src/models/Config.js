import mongoose from 'mongoose';

const configSchema = new mongoose.Schema({
  // General Settings
  timezone: {
    type: String,
    default: 'EST',
    enum: ['UTC', 'EST', 'PST', 'GMT'],
  },
  maintenanceMode: {
    type: Boolean,
    default: false,
  },
  supportEmail: {
    type: String,
    default: 'help@bookflix.lib',
    trim: true,
  },
  // Borrowing Limits
  standardLoanDays: {
    type: Number,
    default: 14,
    min: 1,
    max: 365,
  },
  premiumLoanDays: {
    type: Number,
    default: 30,
    min: 1,
    max: 365,
  },
  maxConcurrentLoans: {
    type: Number,
    default: 5,
    min: 1,
    max: 20,
  },
  gracePeriod: {
    type: Number,
    default: 1,
    min: 0,
    max: 30,
  },
  // Fine Rates
  dailyFine: {
    type: Number,
    default: 0.50,
    min: 0,
    max: 100,
  },
  maxFineCap: {
    type: Number,
    default: 20.00,
    min: 0,
    max: 1000,
  },
  autoChargeFines: {
    type: Boolean,
    default: false,
  },
  // Logistics & Automation
  deliveryService: {
    type: Boolean,
    default: true,
  },
  deliveryRadius: {
    type: Number,
    default: 15,
    min: 0,
    max: 100,
  },
  droneBeta: {
    type: Boolean,
    default: false,
  },
  vipPriority: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Ensure only one config document exists
configSchema.statics.getConfig = async function() {
  let config = await this.findOne();
  if (!config) {
    config = new this();
    await config.save();
  }
  return config;
};

const Config = mongoose.models.Config || mongoose.model('Config', configSchema);

export default Config;

