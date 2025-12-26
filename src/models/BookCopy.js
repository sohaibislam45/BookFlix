import mongoose from 'mongoose';
import { BOOK_STATUS } from '@/lib/constants';

const bookCopySchema = new mongoose.Schema({
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true,
    index: true,
  },
  copyNumber: {
    type: String,
    required: true,
    trim: true,
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true,
  },
  status: {
    type: String,
    enum: Object.values(BOOK_STATUS),
    default: BOOK_STATUS.AVAILABLE,
    index: true,
  },
  condition: {
    type: String,
    enum: ['new', 'good', 'fair', 'poor'],
    default: 'good',
  },
  location: {
    shelf: String,
    section: String,
    floor: String,
  },
  notes: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
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

// Compound index for efficient queries
bookCopySchema.index({ book: 1, status: 1 });
bookCopySchema.index({ status: 1, isActive: 1 });

// Note: updatedAt is automatically managed by timestamps: true in schema options

const BookCopy = mongoose.models.BookCopy || mongoose.model('BookCopy', bookCopySchema);

export default BookCopy;

