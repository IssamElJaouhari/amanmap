// Test script to verify rating submission to MongoDB
const { MongoClient } = require('mongodb')

async function testRatingSubmission() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/amanmap'
  const client = new MongoClient(uri)
  
  try {
    console.log('🔗 Connecting to MongoDB...')
    await client.connect()
    console.log('✅ Connected to MongoDB')
    
    const db = client.db('amanmap')
    const ratingsCollection = db.collection('ratings')
    
    // Check if ratings collection exists and count documents
    const count = await ratingsCollection.countDocuments()
    console.log(`📊 Current ratings count: ${count}`)
    
    // Get the latest 5 ratings
    const latestRatings = await ratingsCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray()
    
    console.log('📋 Latest ratings:')
    latestRatings.forEach((rating, index) => {
      console.log(`${index + 1}. ID: ${rating._id}`)
      console.log(`   User: ${rating.userId}`)
      console.log(`   Scores: Safety=${rating.scores?.safety}, Amenities=${rating.scores?.amenities}, Livability=${rating.scores?.livability}`)
      console.log(`   Status: ${rating.status}`)
      console.log(`   Created: ${rating.createdAt}`)
      console.log('---')
    })
    
    // Test inserting a sample rating
    const testRating = {
      userId: '507f1f77bcf86cd799439011', // Sample ObjectId
      geometry: {
        type: 'Point',
        coordinates: [-7.6177, 33.5731] // Casablanca coordinates
      },
      centroid: {
        type: 'Point',
        coordinates: [-7.6177, 33.5731]
      },
      scores: {
        safety: 8,
        amenities: 7,
        livability: 9
      },
      note: 'Test rating from script',
      status: 'approved',
      deviceId: 'test-device-123',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    console.log('🧪 Inserting test rating...')
    const result = await ratingsCollection.insertOne(testRating)
    console.log('✅ Test rating inserted with ID:', result.insertedId)
    
    // Verify the insertion
    const insertedRating = await ratingsCollection.findOne({ _id: result.insertedId })
    console.log('🔍 Verified inserted rating:', insertedRating)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await client.close()
    console.log('🔌 Disconnected from MongoDB')
  }
}

// Load environment variables if .env.local exists
try {
  require('dotenv').config({ path: '.env.local' })
} catch (e) {
  console.log('No .env.local file found, using default connection')
}

testRatingSubmission()
