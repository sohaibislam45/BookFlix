import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Book from '@/models/Book';
import BookCopy from '@/models/BookCopy';
import Category from '@/models/Category';
import Borrowing from '@/models/Borrowing';
import Reservation from '@/models/Reservation';
import { handleApiError, validateObjectId, sanitizeInput } from '@/lib/apiErrorHandler';
import { isValidISBN, isValidDate } from '@/lib/validation';
import { BORROWING_STATUS, RESERVATION_STATUS } from '@/lib/constants';
import mongoose from 'mongoose';

export async function GET(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;

    const idError = validateObjectId(id, 'Book ID');
    if (idError) {
      return idError;
    }

    const book = await Book.findById(id)
      .populate('category', 'name slug icon')
      .select('-__v')
      .lean();

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    // Get copy counts
    const availableCopies = await BookCopy.countDocuments({
      book: id,
      status: 'available',
      isActive: true,
    });
    const totalCopies = await BookCopy.countDocuments({
      book: id,
      isActive: true,
    });

    // Get shelf location from Book or BookCopy
    // The shelfLocation field might not exist in old documents, so check explicitly
    let shelfLocation = '';
    
    // Check if book has shelfLocation field (handle both undefined and empty string)
    // Use 'in' operator to check if field exists, even if value is empty
    if ('shelfLocation' in book && book.shelfLocation !== undefined && book.shelfLocation !== null) {
      shelfLocation = String(book.shelfLocation).trim();
    } else if ('location' in book && book.location !== undefined && book.location !== null) {
      shelfLocation = String(book.location).trim();
    } else {
      // If not in Book, try to get from first BookCopy
      const firstCopy = await BookCopy.findOne({ book: id, isActive: true })
        .select('location')
        .lean();
      if (firstCopy?.location) {
        // If location is an object with shelf, section, floor, format it
        if (typeof firstCopy.location === 'object' && firstCopy.location !== null) {
          const locParts = [];
          if (firstCopy.location.shelf) locParts.push(firstCopy.location.shelf);
          if (firstCopy.location.section) locParts.push(firstCopy.location.section);
          if (firstCopy.location.floor) locParts.push(firstCopy.location.floor);
          shelfLocation = locParts.join('-') || '';
        } else if (firstCopy.location) {
          shelfLocation = String(firstCopy.location).trim();
        }
      }
    }

    console.log('GET book - shelfLocation from DB:', book.shelfLocation);
    console.log('GET book - location from DB:', book.location);
    console.log('GET book - final shelfLocation:', shelfLocation);

    // Get active borrowing info (if book is currently borrowed)
    let currentBorrower = null;
    const activeBorrowing = await Borrowing.findOne({
      book: id,
      status: { $in: [BORROWING_STATUS.ACTIVE, BORROWING_STATUS.OVERDUE] },
    })
      .populate('member', 'name profilePhoto email')
      .select('member dueDate borrowedDate daysRemaining daysOverdue status')
      .lean();

    if (activeBorrowing) {
      const dueDate = new Date(activeBorrowing.dueDate);
      const now = new Date();
      const diffTime = dueDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      currentBorrower = {
        member: {
          _id: activeBorrowing.member._id,
          name: activeBorrowing.member.name,
          profilePhoto: activeBorrowing.member.profilePhoto,
          email: activeBorrowing.member.email,
        },
        dueDate: activeBorrowing.dueDate,
        borrowedDate: activeBorrowing.borrowedDate,
        daysRemaining: diffDays > 0 ? diffDays : 0,
        daysOverdue: diffDays < 0 ? Math.abs(diffDays) : 0,
        status: activeBorrowing.status,
      };
    }

    // Get active reservation info (if book is currently reserved)
    let currentReserver = null;
    const activeReservation = await Reservation.findOne({
      book: id,
      status: { $in: [RESERVATION_STATUS.PENDING, RESERVATION_STATUS.READY] },
    })
      .populate('member', 'name profilePhoto email')
      .select('member reservedDate expiryDate readyDate status')
      .lean();

    if (activeReservation) {
      currentReserver = {
        member: {
          _id: activeReservation.member._id,
          name: activeReservation.member.name,
          profilePhoto: activeReservation.member.profilePhoto,
          email: activeReservation.member.email,
        },
        reservedDate: activeReservation.reservedDate,
        expiryDate: activeReservation.expiryDate,
        readyDate: activeReservation.readyDate,
        status: activeReservation.status,
      };
    }

    return NextResponse.json({
      ...book,
      availableCopies,
      totalCopies,
      shelfLocation: shelfLocation, // Always include shelfLocation, even if empty
      currentBorrower, // null if not borrowed
      currentReserver, // null if not reserved
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching book:', error);
    return NextResponse.json(
      { error: 'Failed to fetch book', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;
    
    const idError = validateObjectId(id, 'Book ID');
    if (idError) {
      return idError;
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const book = await Book.findById(id);

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    // Validate and sanitize update fields
    // Note: Handle both 'language' and 'bookLanguage' for database compatibility
    const allowedFields = ['title', 'author', 'isbn', 'description', 'coverImage', 'category', 'publishedDate', 'publisher', 'bookLanguage', 'language', 'shelfLocation', 'location', 'pages', 'rating', 'ratingCount', 'tags', 'isActive'];
    const updateData = {};

    for (const [key, value] of Object.entries(body)) {
      if (!allowedFields.includes(key) || key === '_id' || key === '__v') {
        continue;
      }

      if (value === undefined || value === null) {
        continue;
      }

      // Validate specific fields
      if (key === 'title') {
        const sanitized = sanitizeInput(value, 500);
        if (!sanitized || sanitized.length < 1) {
          return NextResponse.json(
            { error: 'Title must be at least 1 character' },
            { status: 400 }
          );
        }
        updateData[key] = sanitized;
      } else if (key === 'author') {
        const sanitized = sanitizeInput(value, 200);
        if (!sanitized || sanitized.length < 1) {
          return NextResponse.json(
            { error: 'Author must be at least 1 character' },
            { status: 400 }
          );
        }
        updateData[key] = sanitized;
      } else if (key === 'isbn') {
        const sanitized = sanitizeInput(value, 20);
        if (sanitized && !isValidISBN(sanitized)) {
          return NextResponse.json(
            { error: 'Invalid ISBN format. Must be 10 or 13 digits' },
            { status: 400 }
          );
        }
        // Check if ISBN is already used by another book
        if (sanitized) {
          const existingBook = await Book.findOne({ isbn: sanitized, _id: { $ne: id } });
          if (existingBook) {
            return NextResponse.json(
              { error: 'ISBN already exists for another book' },
              { status: 409 }
            );
          }
        }
        updateData[key] = sanitized || undefined;
      } else if (key === 'category') {
        const categoryError = validateObjectId(value, 'Category');
        if (categoryError) {
          return categoryError;
        }
        // Verify category exists
        const categoryExists = await Category.findById(value);
        if (!categoryExists) {
          return NextResponse.json(
            { error: 'Category not found' },
            { status: 404 }
          );
        }
        updateData[key] = value;
      } else if (key === 'publishedDate') {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return NextResponse.json(
            { error: 'Invalid published date format' },
            { status: 400 }
          );
        }
        if (date > new Date()) {
          return NextResponse.json(
            { error: 'Published date cannot be in the future' },
            { status: 400 }
          );
        }
        updateData[key] = date;
      } else if (key === 'pages') {
        const pagesNum = Number(value);
        if (isNaN(pagesNum) || pagesNum < 0 || !Number.isInteger(pagesNum)) {
          return NextResponse.json(
            { error: 'Pages must be a non-negative integer' },
            { status: 400 }
          );
        }
        updateData[key] = pagesNum;
      } else if (key === 'rating') {
        const ratingNum = Number(value);
        if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5) {
          return NextResponse.json(
            { error: 'Rating must be between 0 and 5' },
            { status: 400 }
          );
        }
        updateData[key] = ratingNum;
      } else if (key === 'ratingCount') {
        const countNum = Number(value);
        if (isNaN(countNum) || countNum < 0 || !Number.isInteger(countNum)) {
          return NextResponse.json(
            { error: 'Rating count must be a non-negative integer' },
            { status: 400 }
          );
        }
        updateData[key] = countNum;
      } else if (key === 'coverImage') {
        try {
          new URL(value);
        } catch {
          return NextResponse.json(
            { error: 'Invalid cover image URL' },
            { status: 400 }
          );
        }
        updateData[key] = value;
      } else if (key === 'description') {
        if (value.length > 5000) {
          return NextResponse.json(
            { error: 'Description must be no more than 5000 characters' },
            { status: 400 }
          );
        }
        updateData[key] = sanitizeInput(value, 5000);
      } else if (key === 'publisher') {
        if (value.length > 200) {
          return NextResponse.json(
            { error: 'Publisher must be no more than 200 characters' },
            { status: 400 }
          );
        }
        updateData[key] = sanitizeInput(value, 200);
      } else if (key === 'tags') {
        if (!Array.isArray(value)) {
          return NextResponse.json(
            { error: 'Tags must be an array' },
            { status: 400 }
          );
        }
        if (value.length > 20) {
          return NextResponse.json(
            { error: 'Maximum 20 tags allowed' },
            { status: 400 }
          );
        }
        updateData[key] = value.slice(0, 20).map(tag => sanitizeInput(String(tag), 50).toLowerCase());
      } else if (key === 'isActive') {
        if (typeof value !== 'boolean') {
          return NextResponse.json(
            { error: 'isActive must be a boolean' },
            { status: 400 }
          );
        }
        updateData[key] = value;
      } else if (key === 'bookLanguage' || key === 'language') {
        // Validate language code - only allow 'en' or 'bn'
        // Only update 'bookLanguage' (model schema field)
        // Do NOT update 'language' field as it conflicts with MongoDB Atlas Search text index
        const validLanguages = ['en', 'bn'];
        const languageValue = String(value).trim();
        if (!validLanguages.includes(languageValue)) {
          return NextResponse.json(
            { error: `Language must be one of: ${validLanguages.join(', ')}` },
            { status: 400 }
          );
        }
        // Only update bookLanguage to avoid MongoDB Atlas Search language override error
        updateData['bookLanguage'] = languageValue;
      } else if (key === 'shelfLocation' || key === 'location') {
        // Handle shelf location - save to 'shelfLocation' (the schema field)
        // Allow empty strings for shelfLocation
        const locationValue = value !== undefined && value !== null ? String(value).trim() : '';
        // Only save to shelfLocation (the field in the schema)
        // Don't save to 'location' to avoid confusion
        updateData['shelfLocation'] = locationValue;
        console.log('Setting shelfLocation to:', locationValue);
      } else {
        updateData[key] = value;
      }
    }

    // Update all fields including bookLanguage
    let updatedBookDoc = null;
    if (Object.keys(updateData).length > 0) {
      try {
        console.log('Updating book with data:', updateData);
        
        // Update the book - use updateOne with explicit field setting
        // Ensure shelfLocation is explicitly set even if it's a new field
        const updateResult = await Book.updateOne(
          { _id: id },
          { $set: updateData },
          { 
            runValidators: true,
            strict: false // Allow fields not in schema to be saved
          }
        );
        
        console.log('Update result:', updateResult);
        
        if (updateResult.matchedCount === 0) {
          return NextResponse.json(
            { error: 'Book not found' },
            { status: 404 }
          );
        }
        
        if (updateResult.modifiedCount === 0) {
          console.warn('No documents were modified. Update data:', updateData);
        }
        
        // Explicitly update shelfLocation separately to ensure it's saved
        // Use direct MongoDB update to bypass any Mongoose filtering
        if (updateData.shelfLocation !== undefined) {
          console.log('Explicitly updating shelfLocation:', updateData.shelfLocation);
          const shelfValue = String(updateData.shelfLocation).trim();
          
          // Use the native MongoDB driver to ensure the field is saved
          const db = mongoose.connection.db;
          if (db) {
            const booksCollection = db.collection('books');
            const shelfUpdate = await booksCollection.updateOne(
              { _id: new mongoose.Types.ObjectId(id) },
              { $set: { shelfLocation: shelfValue, location: shelfValue } }
            );
            console.log('Direct MongoDB shelf location update result:', shelfUpdate);
          } else {
            console.error('MongoDB connection not available');
          }
        }
        
        // Verify the field was saved by checking the document directly
        const verifyBook = await Book.findById(id).select('shelfLocation location').lean();
        console.log('Verified shelfLocation in DB after update:', verifyBook?.shelfLocation);
        console.log('Verified location in DB after update:', verifyBook?.location);
      } catch (updateError) {
        console.error('Error updating book:', updateError);
        console.error('Error stack:', updateError.stack);
        return NextResponse.json(
          { error: 'Failed to update book', details: updateError.message },
          { status: 500 }
        );
      }
    }

    // Fetch the updated book fresh from database
    const updatedBook = await Book.findById(id)
      .populate('category', 'name slug icon')
      .select('-__v') // Exclude __v, all other fields including shelfLocation will be included
      .lean();

    if (!updatedBook) {
      return NextResponse.json(
        { error: 'Book not found after update' },
        { status: 404 }
      );
    }

    // Get shelfLocation from the updateData we just saved, or from the fetched book
    // This ensures we return the value we just saved, even if there's a timing issue
    const savedShelfLocation = updateData.shelfLocation || updateData.location || '';
    
    // Check the fetched book - handle both shelfLocation and location fields
    let bookShelfLocation = '';
    if (updatedBook.shelfLocation !== undefined && updatedBook.shelfLocation !== null) {
      bookShelfLocation = String(updatedBook.shelfLocation).trim();
    } else if (updatedBook.location !== undefined && updatedBook.location !== null) {
      bookShelfLocation = String(updatedBook.location).trim();
    }
    
    // Use the saved value if available (from updateData), otherwise use what's in the book
    // This handles read-after-write consistency issues
    const finalShelfLocation = savedShelfLocation || bookShelfLocation;

    // Ensure shelfLocation is included in response
    const responseBook = {
      ...updatedBook,
      shelfLocation: finalShelfLocation,
      location: finalShelfLocation, // Also include as location for compatibility
    };

    console.log('Updated book shelfLocation (from updateData):', savedShelfLocation);
    console.log('Updated book shelfLocation (from document):', bookShelfLocation);
    console.log('Final shelfLocation:', finalShelfLocation);

    return NextResponse.json(
      { message: 'Book updated successfully', book: responseBook },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'update book');
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;

    const idError = validateObjectId(id, 'Book ID');
    if (idError) {
      return idError;
    }

    const book = await Book.findById(id);

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    // Soft delete - set isActive to false
    book.isActive = false;
    await book.save();

    // Also soft delete all copies
    await BookCopy.updateMany(
      { book: id },
      { isActive: false }
    );

    return NextResponse.json(
      { message: 'Book deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'delete book');
  }
}

