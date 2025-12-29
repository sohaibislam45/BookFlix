import mongoose from 'mongoose';
import { RESERVATION_STATUS } from '@/lib/constants';

const reservationSchema = new mongoose.Schema({
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true,
    index: true,
  },
  reservedDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  },
  expiryDate: {
    type: Date,
    required: true,
    index: true,
  },
  readyDate: {
    type: Date,
    default: null,
  },
  completedDate: {
    type: Date,
    default: null,
  },
  cancelledDate: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: Object.values(RESERVATION_STATUS),
    default: RESERVATION_STATUS.PENDING,
    index: true,
  },
  queuePosition: {
    type: Number,
    default: 1,
    // Deprecated: kept for backward compatibility, but no longer used in single-reservation system
  },
  notes: {
    type: String,
    trim: true,
  },
  cancelledBy: {
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
reservationSchema.index({ member: 1, status: 1 });
reservationSchema.index({ book: 1, status: 1 });
reservationSchema.index({ status: 1, reservedDate: 1 });
// Index for efficient lookup of active reservations per book
reservationSchema.index({ book: 1, status: 1 });

// Update the updatedAt field before saving
reservationSchema.pre('save', async function() {
  this.updatedAt = Date.now();
  
  // Auto-update status based on dates
  if (this.status === RESERVATION_STATUS.PENDING || this.status === RESERVATION_STATUS.READY) {
    const now = new Date();
    if (this.expiryDate && now > this.expiryDate && !this.completedDate && !this.cancelledDate) {
      this.status = RESERVATION_STATUS.EXPIRED;
    }
  }
  
  // Set queue position to 1 for single-reservation system (backward compatibility)
  if (this.status === RESERVATION_STATUS.PENDING && this.isNew) {
    this.queuePosition = 1;
  }
});

// Static method to check if book has active reservation
reservationSchema.statics.hasActiveReservation = async function(bookId) {
  const activeReservation = await this.findOne({
    book: bookId,
    status: { $in: [RESERVATION_STATUS.PENDING, RESERVATION_STATUS.READY] },
  }).populate('member', 'name profilePhoto email');
  return activeReservation;
};

// Deprecated: kept for backward compatibility
reservationSchema.statics.calculateQueuePosition = async function(bookId, reservedDate) {
  return 1; // Always return 1 for single-reservation system
};

// Deprecated: kept for backward compatibility
reservationSchema.statics.updateQueuePositions = async function(bookId) {
  // No-op in single-reservation system
  return;
};

// Virtual for days until expiry
reservationSchema.virtual('daysUntilExpiry').get(function() {
  if (this.status === RESERVATION_STATUS.READY && this.expiryDate) {
    const now = new Date();
    const diffTime = this.expiryDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }
  return null;
});

// Ensure virtuals are included in JSON
reservationSchema.set('toJSON', { virtuals: true });
reservationSchema.set('toObject', { virtuals: true });

const Reservation = mongoose.models.Reservation || mongoose.model('Reservation', reservationSchema);

export default Reservation;

