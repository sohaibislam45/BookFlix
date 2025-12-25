import mongoose from 'mongoose';
import { BORROWING_STATUS } from '@/lib/constants';

const borrowingSchema = new mongoose.Schema({
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  bookCopy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BookCopy',
    required: true,
    index: true,
  },
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true,
    index: true,
  },
  borrowedDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  },
  dueDate: {
    type: Date,
    required: true,
    index: true,
  },
  returnedDate: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: Object.values(BORROWING_STATUS),
    default: BORROWING_STATUS.ACTIVE,
    index: true,
  },
  renewed: {
    type: Boolean,
    default: false,
  },
  renewalCount: {
    type: Number,
    default: 0,
    max: 2, // Maximum 2 renewals
  },
  notes: {
    type: String,
    trim: true,
  },
  returnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient queries
borrowingSchema.index({ member: 1, status: 1 });
borrowingSchema.index({ bookCopy: 1, status: 1 });
borrowingSchema.index({ dueDate: 1, status: 1 });
borrowingSchema.index({ status: 1, dueDate: 1 });

// Update the updatedAt field before saving
borrowingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Auto-update status based on dates
  if (this.status === BORROWING_STATUS.ACTIVE) {
    const now = new Date();
    if (this.dueDate && now > this.dueDate && !this.returnedDate) {
      this.status = BORROWING_STATUS.OVERDUE;
    }
  }
  
  next();
});

// Virtual for days overdue
borrowingSchema.virtual('daysOverdue').get(function() {
  if (this.status === BORROWING_STATUS.OVERDUE && this.dueDate) {
    const now = new Date();
    const diffTime = now - this.dueDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }
  return 0;
});

// Virtual for days remaining
borrowingSchema.virtual('daysRemaining').get(function() {
  if (this.status === BORROWING_STATUS.ACTIVE && this.dueDate) {
    const now = new Date();
    const diffTime = this.dueDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }
  return 0;
});

// Ensure virtuals are included in JSON
borrowingSchema.set('toJSON', { virtuals: true });
borrowingSchema.set('toObject', { virtuals: true });

const Borrowing = mongoose.models.Borrowing || mongoose.model('Borrowing', borrowingSchema);

export default Borrowing;

