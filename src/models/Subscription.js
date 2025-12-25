import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  stripeSubscriptionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  stripeCustomerId: {
    type: String,
    required: true,
    index: true,
  },
  plan: {
    type: String,
    enum: ['monthly', 'yearly'],
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'canceled', 'past_due', 'unpaid', 'trialing', 'incomplete', 'incomplete_expired', 'paused'],
    required: true,
    default: 'active',
    index: true,
  },
  currentPeriodStart: {
    type: Date,
    required: true,
  },
  currentPeriodEnd: {
    type: Date,
    required: true,
    index: true,
  },
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false,
  },
  canceledAt: {
    type: Date,
    default: null,
  },
  trialStart: {
    type: Date,
    default: null,
  },
  trialEnd: {
    type: Date,
    default: null,
  },
  metadata: {
    type: Map,
    of: String,
    default: {},
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ stripeCustomerId: 1 });
subscriptionSchema.index({ currentPeriodEnd: 1 });

// Virtual to check if subscription is active
subscriptionSchema.virtual('isActive').get(function() {
  return this.status === 'active' || this.status === 'trialing';
});

// Virtual to check if subscription is expired
subscriptionSchema.virtual('isExpired').get(function() {
  if (this.status === 'canceled' || this.status === 'unpaid' || this.status === 'incomplete_expired') {
    return true;
  }
  if (this.currentPeriodEnd && new Date() > this.currentPeriodEnd) {
    return true;
  }
  return false;
});

// Ensure virtuals are included in JSON
subscriptionSchema.set('toJSON', { virtuals: true });
subscriptionSchema.set('toObject', { virtuals: true });

const Subscription = mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);

export default Subscription;

