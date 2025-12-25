import mongoose from 'mongoose';
import { FINE_STATUS } from '@/lib/constants';

const fineSchema = new mongoose.Schema({
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  borrowing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Borrowing',
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  daysOverdue: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: Object.values(FINE_STATUS),
    default: FINE_STATUS.PENDING,
    index: true,
  },
  issuedDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  },
  paidDate: {
    type: Date,
    default: null,
  },
  waivedDate: {
    type: Date,
    default: null,
  },
  waivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient queries
fineSchema.index({ member: 1, status: 1 });
fineSchema.index({ borrowing: 1, status: 1 });
fineSchema.index({ status: 1, issuedDate: 1 });

// Virtual for amount paid
fineSchema.virtual('amountPaid', {
  ref: 'Payment',
  localField: '_id',
  foreignField: 'fine',
  match: { status: 'completed' },
  options: { select: 'amount' },
});

// Ensure virtuals are included in JSON
fineSchema.set('toJSON', { virtuals: true });
fineSchema.set('toObject', { virtuals: true });

const Fine = mongoose.models.Fine || mongoose.model('Fine', fineSchema);

export default Fine;

