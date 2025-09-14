import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import { randomBytes } from 'crypto'
import dbConnect from '../lib/db'
import User from '../models/User'
import Rating from '../models/Rating'
import { computeCentroid, quantizeCentroid, addJitter } from '../lib/geo'

// Morocco cities with coordinates
const cities = [
  { name: 'Casablanca', center: [-7.5898, 33.5731] as [number, number], radius: 0.1 },
  { name: 'Rabat', center: [-6.8326, 34.0209] as [number, number], radius: 0.08 },
  { name: 'Marrakech', center: [-7.9811, 31.6295] as [number, number], radius: 0.09 },
  { name: 'Tangier', center: [-5.8340, 35.7595] as [number, number], radius: 0.07 },
  { name: 'Agadir', center: [-9.5981, 30.4278] as [number, number], radius: 0.06 },
]

// Generate random point within radius using Poisson distribution
function generateRandomPoint(center: [number, number], radius: number): [number, number] {
  const angle = Math.random() * 2 * Math.PI
  const distance = Math.sqrt(Math.random()) * radius
  
  return [
    center[0] + distance * Math.cos(angle),
    center[1] + distance * Math.sin(angle)
  ]
}

// Generate realistic score distribution (slightly skewed toward middle-high values)
function generateScore(): number {
  // Use beta distribution approximation for realistic scores
  const random1 = Math.random()
  const random2 = Math.random()
  const beta = Math.pow(random1, 0.5) * Math.pow(random2, 0.3)
  return Math.round(beta * 10)
}

// Generate polygon around a point
function generatePolygon(center: [number, number], size: number = 0.005): number[][][] {
  const points = []
  const numPoints = 4 + Math.floor(Math.random() * 4) // 4-7 points
  
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI
    const distance = size * (0.5 + Math.random() * 0.5)
    const point: [number, number] = [
      center[0] + distance * Math.cos(angle),
      center[1] + distance * Math.sin(angle)
    ]
    points.push(point)
  }
  
  // Close the polygon
  points.push(points[0])
  
  return [points]
}

async function createSeedData() {
  console.log('🌱 Starting seed process...')
  
  try {
    await dbConnect()
    console.log('✅ Connected to MongoDB')

    // Clear existing data
    await User.deleteMany({})
    await Rating.deleteMany({})
    console.log('🗑️ Cleared existing data')

    // Create admin user with secure random password
    const adminPassword = process.env.ADMIN_PASSWORD || randomBytes(16).toString('hex')
    const adminPasswordHash = await bcrypt.hash(adminPassword, 12)
    const adminUser = await User.create({
      email: process.env.ADMIN_EMAIL || 'admin@amanmap.com',
      passwordHash: adminPasswordHash,
      roles: ['user', 'admin'],
      provider: 'credentials'
    })
    console.log('👤 Created admin user:', process.env.ADMIN_EMAIL || 'admin@amanmap.com')

    // Create test users with secure random passwords
    const testUsers = []
    for (let i = 1; i <= 10; i++) {
      const randomPassword = randomBytes(12).toString('hex')
      const passwordHash = await bcrypt.hash(randomPassword, 12)
      const user = await User.create({
        email: `user${i}@example.com`,
        passwordHash: passwordHash,
        roles: ['user'],
        provider: 'credentials'
      })
      testUsers.push(user)
    }
    console.log(`👥 Created ${testUsers.length} test users`)

    // Generate ratings for each city
    const allUsers = [adminUser, ...testUsers]
    let totalRatings = 0

    for (const city of cities) {
      console.log(`📍 Generating ratings for ${city.name}...`)
      
      const ratingsPerCity = 80 + Math.floor(Math.random() * 40) // 80-120 ratings per city
      
      for (let i = 0; i < ratingsPerCity; i++) {
        const user = allUsers[Math.floor(Math.random() * allUsers.length)]
        const isPolygon = Math.random() < 0.3 // 30% polygons, 70% points
        
        let geometry: any
        let centroid: [number, number]
        
        if (isPolygon) {
          const center = generateRandomPoint(city.center, city.radius)
          const coordinates = generatePolygon(center)
          geometry = {
            type: 'Polygon',
            coordinates
          }
          centroid = computeCentroid(geometry)
        } else {
          centroid = generateRandomPoint(city.center, city.radius)
          geometry = {
            type: 'Point',
            coordinates: centroid
          }
        }

        // Quantize and jitter centroid
        const quantizedCentroid = quantizeCentroid(centroid)
        const jitteredCentroid: [number, number] = [
          addJitter(quantizedCentroid[0]),
          addJitter(quantizedCentroid[1])
        ]

        // Generate correlated scores (areas tend to be consistently good or bad)
        const baseScore = 3 + Math.random() * 4 // 3-7 base
        const variation = 2
        
        const scores = {
          safety: Math.max(0, Math.min(10, Math.round(baseScore + (Math.random() - 0.5) * variation))),
          amenities: Math.max(0, Math.min(10, Math.round(baseScore + (Math.random() - 0.5) * variation))),
          livability: Math.max(0, Math.min(10, Math.round(baseScore + (Math.random() - 0.5) * variation)))
        }

        // Generate optional note (20% chance)
        let note: string | undefined
        if (Math.random() < 0.2) {
          const notes = [
            'Great area for families',
            'Good public transport',
            'Safe at night',
            'Limited parking',
            'Busy during rush hour',
            'Nice restaurants nearby',
            'Close to schools',
            'Quiet neighborhood'
          ]
          note = notes[Math.floor(Math.random() * notes.length)]
        }

        // Random device ID
        const deviceId = `device_${Math.random().toString(36).substring(2, 15)}`

        await Rating.create({
          userId: user._id,
          geometry,
          centroid: {
            type: 'Point',
            coordinates: jitteredCentroid
          },
          scores,
          note,
          city: city.name,
          status: 'approved',
          deviceId,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
        })

        totalRatings++
      }
    }

    // Create some pending ratings for admin review
    console.log('⏳ Creating pending ratings for review...')
    for (let i = 0; i < 5; i++) {
      const user = testUsers[Math.floor(Math.random() * testUsers.length)]
      const city = cities[Math.floor(Math.random() * cities.length)]
      const centroid = generateRandomPoint(city.center, city.radius)
      
      const quantizedCentroid = quantizeCentroid(centroid)
      const jitteredCentroid: [number, number] = [
        addJitter(quantizedCentroid[0]),
        addJitter(quantizedCentroid[1])
      ]

      await Rating.create({
        userId: user._id,
        geometry: {
          type: 'Point',
          coordinates: centroid
        },
        centroid: {
          type: 'Point',
          coordinates: jitteredCentroid
        },
        scores: {
          safety: generateScore(),
          amenities: generateScore(),
          livability: generateScore()
        },
        note: 'This area needs review - contains questionable content',
        city: city.name,
        status: 'pending',
        deviceId: `device_${Math.random().toString(36).substring(2, 15)}`
      })
    }

    console.log(`✅ Seed completed successfully!`)
    console.log(`📊 Summary:`)
    console.log(`   - Users: ${allUsers.length} (1 admin, ${testUsers.length} regular)`)
    console.log(`   - Ratings: ${totalRatings + 5} (${totalRatings} approved, 5 pending)`)
    console.log(`   - Cities: ${cities.length}`)
    console.log(`\n🔑 Admin credentials:`)
    console.log(`   Email: ${process.env.ADMIN_EMAIL || 'admin@amanmap.com'}`)
    if (!process.env.ADMIN_PASSWORD) {
      console.log(`   Password: ${adminPassword} (SAVE THIS - randomly generated)`)
    } else {
      console.log(`   Password: [Using ADMIN_PASSWORD env var]`)
    }
    console.log(`\n🌐 Visit http://localhost:3000 to see the app`)
    console.log(`🛠️ Visit http://localhost:3000/admin for admin panel`)

  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  } finally {
    await mongoose.connection.close()
    console.log('🔌 Database connection closed')
  }
}

// Run the seed function
createSeedData()
