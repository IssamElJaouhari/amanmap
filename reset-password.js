// Reset password for admin user
const { MongoClient } = require('mongodb')
const bcrypt = require('bcrypt')

async function resetPassword() {
  const uri = 'mongodb://localhost:27017/amanmap'
  const client = new MongoClient(uri)
  
  try {
    await client.connect()
    console.log('🔗 Connected to MongoDB')
    
    const db = client.db('amanmap')
    const usersCollection = db.collection('users')
    
    // New password: "admin123"
    const newPassword = 'admin123'
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds)
    
    const result = await usersCollection.updateOne(
      { email: 'admin@amanmap.com' },
      { 
        $set: { 
          passwordHash: hashedPassword,
          updatedAt: new Date()
        }
      }
    )
    
    if (result.matchedCount > 0) {
      console.log('✅ Password reset successfully!')
      console.log('📧 Email: admin@amanmap.com')
      console.log('🔑 New Password: admin123')
    } else {
      console.log('❌ User not found')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await client.close()
  }
}

resetPassword()
