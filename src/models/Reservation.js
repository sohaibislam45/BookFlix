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
reservationSchema.index({ book: 1, status: 1, queuePosition: 1 });

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
  
  // Calculate queue position for pending reservations
  if (this.status === RESERVATION_STATUS.PENDING && this.isNew) {
    const count = await mongoose.model('Reservation').countDocuments({
      book: this.book,
      status: { $in: [RESERVATION_STATUS.PENDING, RESERVATION_STATUS.READY] },
      _id: { $ne: this._id },
      reservedDate: { $lt: this.reservedDate },
    });
    this.queuePosition = count + 1;
  }
});

// Static method to calculate queue position
reservationSchema.statics.calculateQueuePosition = async function(bookId, reservedDate) {
  const count = await this.countDocuments({
    book: bookId,
    status: { $in: [RESERVATION_STATUS.PENDING, RESERVATION_STATUS.READY] },
    reservedDate: { $lt: reservedDate },
  });
  return count + 1;
};

// Static method to update queue positions for a book
reservationSchema.statics.updateQueuePositions = async function(bookId) {
  const reservations = await this.find({
    book: bookId,
    status: { $in: [RESERVATION_STATUS.PENDING, RESERVATION_STATUS.READY] },
  }).sort({ reservedDate: 1 });
  
  for (let i = 0; i < reservations.length; i++) {
    reservations[i].queuePosition = i + 1;
    await reservations[i].save();
  }
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

