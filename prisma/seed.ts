import { prisma } from "../src/lib/db";

const services = [
  { slug: "consultation", name: "Personal consultation", description: "A focused one-to-one strategy session tailored to your goals.", category: "Consultation", durationMinutes: 60, price: 350000, color: "indigo" },
  { slug: "wellness", name: "Wellness session", description: "Recharge with a guided mindfulness and wellbeing session.", category: "Wellness", durationMinutes: 90, price: 490000, color: "rose" },
  { slug: "career", name: "Career coaching", description: "Find clarity on your next career move with an experienced coach.", category: "Coaching", durationMinutes: 60, price: 420000, color: "amber" },
  { slug: "design", name: "Design review", description: "Walk through your product design with practical feedback.", category: "Consultation", durationMinutes: 45, price: 280000, color: "cyan" },
  { slug: "fitness", name: "Fitness assessment", description: "Baseline assessment and a personalized training plan.", category: "Wellness", durationMinutes: 45, price: 300000, color: "emerald" },
  { slug: "nutrition", name: "Nutrition planning", description: "A realistic nutrition plan based on your schedule.", category: "Wellness", durationMinutes: 60, price: 390000, color: "violet" },
];

export async function seedDatabase() {
  const created = await Promise.all(services.map((service) =>
    prisma.service.upsert({ where: { slug: service.slug }, update: service, create: service }),
  ));
  const customers = [
    { name: "Sophia Nguyen", email: "sophia@example.com", phone: "0901123456" },
    { name: "Daniel Tran", email: "daniel@example.com", phone: "0902234567" },
    { name: "Emma Le", email: "emma@example.com", phone: "0903345678" },
    { name: "Oliver Pham", email: "oliver@example.com", phone: "0904456789" },
  ];
  const savedCustomers = await Promise.all(customers.map((customer) =>
    prisma.customer.upsert({ where: { email: customer.email }, update: customer, create: customer }),
  ));

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + 1);
  for (let index = 0; index < 8; index++) {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + Math.floor(index / 3));
    await prisma.booking.upsert({
      where: { reference: `DEMO-${String(index + 1).padStart(3, "0")}` },
      update: {},
      create: {
        reference: `DEMO-${String(index + 1).padStart(3, "0")}`,
        serviceId: created[index % created.length].id,
        customerId: savedCustomers[index % savedCustomers.length].id,
        date: date.toISOString().slice(0, 10),
        timeSlot: ["09:00", "10:00", "14:00"][index % 3],
        status: index === 4 ? "COMPLETED" : index === 7 ? "CANCELED" : "CONFIRMED",
        notes: index === 0 ? "First-time guest" : "",
        createdBy: "demo-seed",
      },
    });
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  seedDatabase()
    .then(() => console.log("Seeded 6 services and 8 demo bookings"))
    .finally(() => prisma.$disconnect());
}
