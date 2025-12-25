import mongoose from 'mongoose';
import { PAYMENT_STATUS } from '@/lib/constants';

const paymentSchema = new mongoose.Schema({
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  fine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fine',
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: Object.values(PAYMENT_STATUS),
    default: PAYMENT_STATUS.PENDING,
    index: true,
  },
  stripePaymentIntentId: {
    type: String,
    index: true,
    sparse: true,
  },
  stripeCustomerId: {
    type: String,
    index: true,
    sparse: true,
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'cash', 'waived'],
    default: 'stripe',
  },
  metadata: {
    type: Map,
    of: String,
    default: {},
  },
  completedDate: {
    type: Date,
    default: null,
  },
  failureReason: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient queries
paymentSchema.index({ member: 1, status: 1 });
paymentSchema.index({ fine: 1, status: 1 });
paymentSchema.index({ stripePaymentIntentId: 1 });

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

export default Payment;

