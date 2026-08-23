import { PrismaClient, Role, SeatCategory, EventType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export async function seedDatabase() {
  console.log('🌱 Starting safe database seeding...')

  // 1. Demo Organiser
  const organiserEmail = 'organiser@ticketbooking.com'
  let organiser = await prisma.user.findUnique({
    where: { email: organiserEmail },
  })

  if (!organiser) {
    const passwordHash = await hashPassword('Password123!')
    organiser = await prisma.user.create({
      data: {
        name: 'Grand Entertainment Organiser',
        email: organiserEmail,
        passwordHash,
        role: Role.ORGANISER,
      },
    })
    console.log(`✓ Created demo Organiser: ${organiserEmail}`)
  } else {
    console.log(`ℹ Demo Organiser exists: ${organiserEmail}`)
  }

  // 2. Demo Customer
  const customerEmail = 'customer@ticketbooking.com'
  let customer = await prisma.user.findUnique({
    where: { email: customerEmail },
  })

  if (!customer) {
    const passwordHash = await hashPassword('Password123!')
    customer = await prisma.user.create({
      data: {
        name: 'Alice Johnson',
        email: customerEmail,
        passwordHash,
        role: Role.CUSTOMER,
      },
    })
    console.log(`✓ Created demo Customer: ${customerEmail}`)
  } else {
    console.log(`ℹ Demo Customer exists: ${customerEmail}`)
  }

  // 3. Demo Admin
  const adminEmail = 'admin@ticketbooking.com'
  let admin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (!admin) {
    const passwordHash = await hashPassword('Password123!')
    admin = await prisma.user.create({
      data: {
        name: 'System Administrator',
        email: adminEmail,
        passwordHash,
        role: Role.ADMIN,
      },
    })
    console.log(`✓ Created demo Admin: ${adminEmail}`)
  } else {
    console.log(`ℹ Demo Admin exists: ${adminEmail}`)
  }

  // 4. Demo Venue
  let venue = await prisma.venue.findFirst({
    where: {
      name: 'Grand IMAX Arena',
      organiserId: organiser.id,
    },
  })

  if (!venue) {
    venue = await prisma.venue.create({
      data: {
        name: 'Grand IMAX Arena',
        address: '100 Metro Boulevard, Downtown',
        organiserId: organiser.id,
      },
    })
    console.log(`✓ Created demo Venue: ${venue.name}`)

    // Create Seats for this venue
    const seatDefs = [
      { rowLabel: 'A', seatNumber: 1, category: SeatCategory.STANDARD },
      { rowLabel: 'A', seatNumber: 2, category: SeatCategory.STANDARD },
      { rowLabel: 'A', seatNumber: 3, category: SeatCategory.STANDARD },
      { rowLabel: 'A', seatNumber: 4, category: SeatCategory.STANDARD },
      { rowLabel: 'B', seatNumber: 1, category: SeatCategory.PREMIUM },
      { rowLabel: 'B', seatNumber: 2, category: SeatCategory.PREMIUM },
      { rowLabel: 'B', seatNumber: 3, category: SeatCategory.PREMIUM },
      { rowLabel: 'B', seatNumber: 4, category: SeatCategory.PREMIUM },
    ]

    for (const s of seatDefs) {
      await prisma.seat.create({
        data: {
          venueId: venue.id,
          rowLabel: s.rowLabel,
          seatNumber: s.seatNumber,
          category: s.category,
        },
      })
    }
    console.log(`✓ Created 8 seats (4 STANDARD, 4 PREMIUM) for ${venue.name}`)
  } else {
    console.log(`ℹ Demo Venue exists: ${venue.name}`)
  }

  // 4. Demo Movie Event
  let movieEvent = await prisma.event.findFirst({
    where: {
      title: 'Interstellar: IMAX Special Presentation',
      organiserId: organiser.id,
    },
  })

  if (!movieEvent) {
    movieEvent = await prisma.event.create({
      data: {
        title: 'Interstellar: IMAX Special Presentation',
        description:
          'Experience Christopher Nolan’s visionary sci-fi masterpiece remastered in stunning IMAX with groundbreaking visuals and unforgettable score.',
        type: EventType.MOVIE,
        organiserId: organiser.id,
      },
    })
    console.log(`✓ Created demo Movie Event: ${movieEvent.title}`)
  }

  // 5. Demo Concert Event
  let concertEvent = await prisma.event.findFirst({
    where: {
      title: 'Hans Zimmer Live Symphony Tour',
      organiserId: organiser.id,
    },
  })

  if (!concertEvent) {
    concertEvent = await prisma.event.create({
      data: {
        title: 'Hans Zimmer Live Symphony Tour',
        description:
          'A monumental orchestral celebration featuring the epic cinematic themes of Inception, The Dark Knight, Dune, and Gladiator performed with full choir.',
        type: EventType.CONCERT,
        organiserId: organiser.id,
      },
    })
    console.log(`✓ Created demo Concert Event: ${concertEvent.title}`)
  }

  // 6. Demo Shows and Pricing
  const now = new Date()
  const tomorrowEvening = new Date(now)
  tomorrowEvening.setDate(tomorrowEvening.getDate() + 1)
  tomorrowEvening.setHours(19, 0, 0, 0)

  const tomorrowEnd = new Date(tomorrowEvening)
  tomorrowEnd.setHours(22, 0, 0, 0)

  const existingShow = await prisma.show.findFirst({
    where: {
      eventId: movieEvent.id,
      venueId: venue.id,
    },
  })

  if (!existingShow) {
    const show = await prisma.show.create({
      data: {
        eventId: movieEvent.id,
        venueId: venue.id,
        startTime: tomorrowEvening,
        endTime: tomorrowEnd,
      },
    })

    // Populate show seats from venue seats
    const venueSeats = await prisma.seat.findMany({
      where: { venueId: venue.id },
    })

    await prisma.showSeat.createMany({
      data: venueSeats.map((s) => ({
        showId: show.id,
        seatId: s.id,
      })),
      skipDuplicates: true,
    })

    // Configure Show Prices
    await prisma.showPrice.createMany({
      data: [
        {
          showId: show.id,
          category: SeatCategory.STANDARD,
          price: 15.0,
        },
        {
          showId: show.id,
          category: SeatCategory.PREMIUM,
          price: 25.0,
        },
      ],
      skipDuplicates: true,
    })

    console.log(`✓ Created demo Showtime & Pricing for ${movieEvent.title}`)
  }

  console.log('🎉 Database seeding complete!')
}

if (require.main === module || process.argv[1]?.includes('seed')) {
  seedDatabase()
    .catch((err) => {
      console.error('❌ Seed failed:', err)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
