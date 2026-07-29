import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding dummy data with Indian names...\n");

  // 1. Admin user
  let admin = await prisma.user.findUnique({ where: { email: "admin@crm.com" } });
  if (!admin) {
    const hashed = await bcrypt.hash("admin123", 10);
    admin = await prisma.user.create({
      data: { email: "admin@crm.com", password: hashed, name: "Admin User", role: "admin" },
    });
    console.log("Admin user created");
  }

  // 2. Contacts
  const contactsData = [
    { name: "Rajesh Kumar",   phone: "+919876543201", email: "rajesh.kumar@gmail.com",  tags: "VIP,Business" },
    { name: "Priya Sharma",   phone: "+919876543202", email: "priya.sharma@gmail.com",  tags: "Family,Regular" },
    { name: "Amit Verma",     phone: "+919876543203", email: "amit.verma@yahoo.com",    tags: "Business" },
    { name: "Sunita Patel",   phone: "+919876543204", email: "sunita.patel@gmail.com",  tags: "VIP" },
    { name: "Vikram Singh",   phone: "+919876543205", email: "vikram.singh@outlook.com",tags: "Regular" },
    { name: "Deepa Nair",     phone: "+919876543206", email: "deepa.nair@gmail.com",    tags: "Family" },
    { name: "Arun Mishra",    phone: "+919876543207", email: "arun.mishra@gmail.com",   tags: "Business,Regular" },
    { name: "Kavita Joshi",   phone: "+919876543208", email: "kavita.joshi@gmail.com",  tags: "VIP,Family" },
    { name: "Suresh Gupta",   phone: "+919876543209", email: "suresh.gupta@yahoo.com",  tags: "Regular" },
    { name: "Meena Iyer",     phone: "+919876543210", email: "meena.iyer@gmail.com",    tags: "Business,VIP" },
  ];

  const contacts: any[] = [];
  for (const c of contactsData) {
    const ex = await prisma.contact.findUnique({ where: { phone: c.phone } });
    contacts.push(ex ?? await prisma.contact.create({ data: c }));
  }
  console.log(`${contacts.length} contacts seeded`);

  // Family members
  const familyData = [
    { contact_id: contacts[0].id, relation: "spouse", full_name: "Anita Kumar",   date_of_birth: new Date("1985-06-15") },
    { contact_id: contacts[0].id, relation: "child",  full_name: "Rohit Kumar",   date_of_birth: new Date("2010-03-22") },
    { contact_id: contacts[1].id, relation: "father", full_name: "Ramesh Sharma", date_of_birth: new Date("1955-11-08") },
    { contact_id: contacts[1].id, relation: "mother", full_name: "Savita Sharma", date_of_birth: new Date("1958-04-30") },
    { contact_id: contacts[2].id, relation: "spouse", full_name: "Ritu Verma",    date_of_birth: new Date("1988-09-12") },
    { contact_id: contacts[3].id, relation: "child",  full_name: "Pooja Patel",   date_of_birth: new Date("2012-07-19") },
    { contact_id: contacts[4].id, relation: "father", full_name: "Balveer Singh", date_of_birth: new Date("1950-01-05") },
    { contact_id: contacts[5].id, relation: "spouse", full_name: "Sunil Nair",    date_of_birth: new Date("1982-12-25") },
    { contact_id: contacts[6].id, relation: "child",  full_name: "Aryan Mishra",  date_of_birth: new Date("2008-05-14") },
    { contact_id: contacts[7].id, relation: "mother", full_name: "Kamla Joshi",   date_of_birth: new Date("1960-08-03") },
  ];
  let famCount = 0;
  for (const f of familyData) {
    const ex = await prisma.familyMember.findFirst({ where: { contact_id: f.contact_id, full_name: f.full_name } });
    if (!ex) { await prisma.familyMember.create({ data: f }); famCount++; }
  }
  console.log(`${famCount} family members seeded`);

  // 3. Bills
  const billsData = [
    { title: "Electricity Bill Jaipur Office",   amount: 4500,  category: "Utilities",    recurrence_type: "monthly",   due_day: 5,  next_due_date: new Date("2026-08-05") },
    { title: "Internet ACT Fibernet",            amount: 999,   category: "Internet",     recurrence_type: "monthly",   due_day: 10, next_due_date: new Date("2026-08-10") },
    { title: "GST Filing",                        amount: 1500,  category: "Tax",          recurrence_type: "quarterly", due_day: 20, next_due_date: new Date("2026-09-20") },
    { title: "Property Tax Annual",               amount: 12000, category: "Tax",          recurrence_type: "yearly",    due_day: 31, next_due_date: new Date("2027-03-31") },
    { title: "Office Rent MG Road",               amount: 35000, category: "Rent",         recurrence_type: "monthly",   due_day: 1,  next_due_date: new Date("2026-08-01") },
    { title: "LIC Premium Rajesh",                amount: 8200,  category: "Insurance",    recurrence_type: "quarterly", due_day: 15, next_due_date: new Date("2026-09-15") },
    { title: "Water Supply Board",                amount: 650,   category: "Utilities",    recurrence_type: "monthly",   due_day: 7,  next_due_date: new Date("2026-08-07") },
    { title: "CA Retainer Fee",                   amount: 5000,  category: "Professional", recurrence_type: "monthly",   due_day: 1,  next_due_date: new Date("2026-08-01") },
    { title: "Annual Software Subscription",      amount: 18000, category: "Software",     recurrence_type: "yearly",    due_day: 1,  next_due_date: new Date("2027-01-01") },
    { title: "Telephone Landline",                amount: 400,   category: "Utilities",    recurrence_type: "monthly",   due_day: 3,  next_due_date: new Date("2026-08-03") },
  ];
  let billCount = 0;
  for (const b of billsData) {
    const ex = await prisma.bill.findFirst({ where: { title: b.title } });
    if (!ex) { await prisma.bill.create({ data: b }); billCount++; }
  }
  console.log(`${billCount} bills seeded`);

  // 4. Rentals + Payments
  const rentalsData = [
    { client_name: "Harish Mehta",  client_phone: "+919001112221", property_name: "Shop No.3 Lal Darwaza",    rent_amount: 18000, due_day: 1,  next_due_date: new Date("2026-08-01") },
    { client_name: "Geeta Rao",     client_phone: "+919001112222", property_name: "Flat 202 Shiv Nagar",      rent_amount: 12000, due_day: 5,  next_due_date: new Date("2026-08-05") },
    { client_name: "Mohan Tiwari",  client_phone: "+919001112223", property_name: "Godown MIDC Area",         rent_amount: 25000, due_day: 3,  next_due_date: new Date("2026-08-03") },
    { client_name: "Lalita Desai",  client_phone: "+919001112224", property_name: "Office 4B Nirmal Tower",   rent_amount: 22000, due_day: 10, next_due_date: new Date("2026-08-10") },
    { client_name: "Santosh Pawar", client_phone: "+919001112225", property_name: "Flat 1A Rose Garden",      rent_amount: 9500,  due_day: 7,  next_due_date: new Date("2026-08-07") },
    { client_name: "Rekha Bhatt",   client_phone: "+919001112226", property_name: "House No.12 Gandhi Nagar", rent_amount: 7000,  due_day: 2,  next_due_date: new Date("2026-08-02") },
    { client_name: "Devraj Sinha",  client_phone: "+919001112227", property_name: "Showroom City Centre",     rent_amount: 40000, due_day: 1,  next_due_date: new Date("2026-08-01") },
    { client_name: "Pallavi Hegde", client_phone: "+919001112228", property_name: "Flat 3C Sunrise Apt",      rent_amount: 11000, due_day: 5,  next_due_date: new Date("2026-08-05") },
    { client_name: "Naresh Jain",   client_phone: "+919001112229", property_name: "Warehouse Phase-2",        rent_amount: 30000, due_day: 15, next_due_date: new Date("2026-08-15") },
    { client_name: "Usha Krishnan", client_phone: "+919001112230", property_name: "Plot No.7 Industrial",     rent_amount: 15000, due_day: 20, next_due_date: new Date("2026-08-20") },
  ];
  const rentals: any[] = [];
  for (const r of rentalsData) {
    const ex = await prisma.rental.findFirst({ where: { client_phone: r.client_phone } });
    rentals.push(ex ?? await prisma.rental.create({ data: r }));
  }
  console.log(`${rentals.length} rentals seeded`);

  const payStatuses = ["paid", "paid", "partial", "paid", "overdue", "paid", "paid", "partial", "paid", "overdue"];
  let payCount = 0;
  for (let i = 0; i < rentals.length; i++) {
    const ex = await prisma.rentPayment.findFirst({ where: { rental_id: rentals[i].id } });
    if (!ex) {
      await prisma.rentPayment.create({ data: {
        rental_id: rentals[i].id,
        amount_paid: payStatuses[i] === "partial" ? rentals[i].rent_amount * 0.5 : rentals[i].rent_amount,
        paid_on: new Date("2026-07-01"),
        status: payStatuses[i],
      }});
      payCount++;
    }
  }
  console.log(`${payCount} rent payments seeded`);

  // 5. Tax Reminders
  const taxData = [
    { tax_type: "GST Monthly Return GSTR-1",  due_date: new Date("2026-08-11"), reminder_lead_days: 5 },
    { tax_type: "GST Monthly Return GSTR-3B", due_date: new Date("2026-08-20"), reminder_lead_days: 5 },
    { tax_type: "Advance Tax Q2",             due_date: new Date("2026-09-15"), reminder_lead_days: 10 },
    { tax_type: "TDS Deposit July",           due_date: new Date("2026-08-07"), reminder_lead_days: 3 },
    { tax_type: "Professional Tax",           due_date: new Date("2026-08-31"), reminder_lead_days: 7 },
    { tax_type: "Income Tax Advance Q1",      due_date: new Date("2026-06-15"), reminder_lead_days: 10 },
    { tax_type: "EPF Payment July",           due_date: new Date("2026-08-15"), reminder_lead_days: 5 },
    { tax_type: "ESIC Payment July",          due_date: new Date("2026-08-21"), reminder_lead_days: 5 },
    { tax_type: "ROC Annual Filing",          due_date: new Date("2026-09-30"), reminder_lead_days: 15 },
    { tax_type: "Property Tax Annual",        due_date: new Date("2026-09-30"), reminder_lead_days: 14 },
  ];
  let taxCount = 0;
  for (const t of taxData) {
    const ex = await prisma.taxReminder.findFirst({ where: { tax_type: t.tax_type } });
    if (!ex) { await prisma.taxReminder.create({ data: t }); taxCount++; }
  }
  console.log(`${taxCount} tax reminders seeded`);

  // 6. Expenses
  const expensesData = [
    { amount: 2500,  category: "Food",       note: "Team lunch at Haldirams",        spent_on: new Date("2026-07-10"), payment_mode: "UPI",  created_by: admin!.id },
    { amount: 850,   category: "Transport",  note: "Ola cab airport to office",       spent_on: new Date("2026-07-12"), payment_mode: "Card", created_by: admin!.id },
    { amount: 15000, category: "Marketing",  note: "Facebook Ads July campaign",      spent_on: new Date("2026-07-05"), payment_mode: "NEFT", created_by: admin!.id },
    { amount: 3200,  category: "Stationery", note: "Office supplies from Amazon",     spent_on: new Date("2026-07-08"), payment_mode: "Card", created_by: admin!.id },
    { amount: 5500,  category: "Repair",     note: "AC service Jaipur showroom",      spent_on: new Date("2026-07-15"), payment_mode: "Cash", created_by: admin!.id },
    { amount: 1200,  category: "Food",       note: "Staff refreshments",              spent_on: new Date("2026-07-18"), payment_mode: "UPI",  created_by: admin!.id },
    { amount: 7800,  category: "Travel",     note: "Train tickets Delhi trip",        spent_on: new Date("2026-07-20"), payment_mode: "NEFT", created_by: admin!.id },
    { amount: 4000,  category: "Utilities",  note: "Internet upgrade charges",        spent_on: new Date("2026-07-03"), payment_mode: "UPI",  created_by: admin!.id },
    { amount: 900,   category: "Misc",       note: "Courier charges July",            spent_on: new Date("2026-07-22"), payment_mode: "Cash", created_by: admin!.id },
    { amount: 12000, category: "Salary",     note: "Part-time accountant July",       spent_on: new Date("2026-07-31"), payment_mode: "NEFT", created_by: admin!.id },
  ];
  let expCount = 0;
  for (const e of expensesData) {
    const ex = await prisma.expense.findFirst({ where: { note: e.note } });
    if (!ex) { await prisma.expense.create({ data: e }); expCount++; }
  }
  console.log(`${expCount} expenses seeded`);

  // 7. Hotel Guests
  const hotelData = [
    { name: "Ramesh Agarwal",   phone: "+919821001001", id_proof_type: "Aadhaar",  id_proof_number: "1234 5678 9101",   check_in: new Date("2026-07-20"), check_out: new Date("2026-07-23"), room_number: "101", entered_by: admin!.id },
    { name: "Seema Chatterjee", phone: "+919821001002", id_proof_type: "PAN",      id_proof_number: "ABCDE1234F",       check_in: new Date("2026-07-21"), check_out: new Date("2026-07-22"), room_number: "102", entered_by: admin!.id },
    { name: "Kiran Kulkarni",   phone: "+919821001003", id_proof_type: "Passport", id_proof_number: "P1234567",         check_in: new Date("2026-07-22"), check_out: null,                   room_number: "201", entered_by: admin!.id },
    { name: "Aditya Kapoor",    phone: "+919821001004", id_proof_type: "Aadhaar",  id_proof_number: "9876 5432 1000",   check_in: new Date("2026-07-23"), check_out: null,                   room_number: "203", entered_by: admin!.id },
    { name: "Nisha Tripathi",   phone: "+919821001005", id_proof_type: "DL",       id_proof_number: "DL-MH20160012345", check_in: new Date("2026-07-19"), check_out: new Date("2026-07-21"), room_number: "104", entered_by: admin!.id },
    { name: "Mahesh Pandey",    phone: "+919821001006", id_proof_type: "Aadhaar",  id_proof_number: "1111 2222 3333",   check_in: new Date("2026-07-24"), check_out: null,                   room_number: "301", entered_by: admin!.id },
    { name: "Renu Saxena",      phone: "+919821001007", id_proof_type: "PAN",      id_proof_number: "FGHIJ5678K",       check_in: new Date("2026-07-18"), check_out: new Date("2026-07-20"), room_number: "103", entered_by: admin!.id },
    { name: "Tarun Bose",       phone: "+919821001008", id_proof_type: "Passport", id_proof_number: "P9876543",         check_in: new Date("2026-07-25"), check_out: null,                   room_number: "302", entered_by: admin!.id },
    { name: "Ananya Das",       phone: "+919821001009", id_proof_type: "Aadhaar",  id_proof_number: "4444 5555 6666",   check_in: new Date("2026-07-17"), check_out: new Date("2026-07-19"), room_number: "105", entered_by: admin!.id },
    { name: "Vijay Reddy",      phone: "+919821001010", id_proof_type: "DL",       id_proof_number: "DL-AP20160067890", check_in: new Date("2026-07-24"), check_out: null,                   room_number: "204", entered_by: admin!.id },
  ];
  let hotelCount = 0;
  for (const h of hotelData) {
    const ex = await prisma.hotelGuest.findFirst({ where: { phone: h.phone } });
    if (!ex) { await prisma.hotelGuest.create({ data: h }); hotelCount++; }
  }
  console.log(`${hotelCount} hotel guests seeded`);

  // 8. Goals + Progress
  const goalsData = [
    { title: "Buy New SUV",              target_amount: 1500000, target_date: new Date("2027-03-31"), category: "Vehicle" },
    { title: "Home Renovation",          target_amount: 500000,  target_date: new Date("2026-12-31"), category: "Home" },
    { title: "Childrens Education Fund", target_amount: 2000000, target_date: new Date("2030-06-30"), category: "Education" },
    { title: "Goa Holiday Trip",         target_amount: 80000,   target_date: new Date("2026-12-01"), category: "Travel" },
    { title: "Emergency Fund",           target_amount: 300000,  target_date: new Date("2026-09-30"), category: "Savings" },
    { title: "Stock Market Investment",  target_amount: 500000,  target_date: new Date("2027-01-01"), category: "Investment" },
    { title: "Business Expansion",       target_amount: 1000000, target_date: new Date("2027-06-30"), category: "Business" },
    { title: "Laptop Upgrade",           target_amount: 120000,  target_date: new Date("2026-10-01"), category: "Technology" },
    { title: "Wedding Anniversary Trip", target_amount: 150000,  target_date: new Date("2026-11-15"), category: "Travel" },
    { title: "Mutual Fund SIP Target",   target_amount: 600000,  target_date: new Date("2028-01-01"), category: "Investment" },
  ];
  const goals: any[] = [];
  for (const g of goalsData) {
    const ex = await prisma.goal.findFirst({ where: { title: g.title } });
    goals.push(ex ?? await prisma.goal.create({ data: g }));
  }
  console.log(`${goals.length} goals seeded`);

  const progressAmounts = [75000, 50000, 25000, 40000, 100000, 60000, 80000, 30000, 45000, 120000];
  let progressCount = 0;
  for (let i = 0; i < goals.length; i++) {
    const ex = await prisma.goalProgress.findFirst({ where: { goal_id: goals[i].id, month: "2026-07" } });
    if (!ex) { await prisma.goalProgress.create({ data: { goal_id: goals[i].id, month: "2026-07", amount_achieved: progressAmounts[i], note: "July contribution" } }); progressCount++; }
  }
  console.log(`${progressCount} goal progress entries seeded`);

  // 9. Tasks
  const tasksData = [
    { title: "Call Rajesh about property deal",        description: "Discuss terms for MG Road property",   event_date: new Date("2026-07-28"), status: "pending", created_by: admin!.id },
    { title: "File July GST Return",                    description: "Submit GSTR-1 and GSTR-3B",            event_date: new Date("2026-08-11"), status: "pending", created_by: admin!.id },
    { title: "Renew LIC policy Amit",                   description: "Policy renewal due this month",        event_date: new Date("2026-08-01"), status: "pending", created_by: admin!.id },
    { title: "Follow up Suresh rent payment",           description: "Overdue by 10 days",                   event_date: new Date("2026-07-26"), status: "pending", created_by: admin!.id },
    { title: "Hotel inspection Q3",                     description: "Quarterly cleanliness and safety check",event_date: new Date("2026-07-30"), status: "pending", created_by: admin!.id },
    { title: "Send birthday wishes to Priya",           description: "WhatsApp message plus gift voucher",   event_date: new Date("2026-07-29"), status: "pending", created_by: admin!.id },
    { title: "Bank loan EMI check",                     description: "Verify July EMI deduction",            event_date: new Date("2026-07-25"), status: "done",    created_by: admin!.id },
    { title: "Repair AC in Room 201",                   description: "Guest complained about cooling issue", event_date: new Date("2026-07-25"), status: "done",    created_by: admin!.id },
    { title: "Team meeting monthly review",             description: "Review July performance and targets",  event_date: new Date("2026-07-31"), status: "pending", created_by: admin!.id },
    { title: "Renew shop lease Lal Darwaza",            description: "Current lease expires Sept 2026",      event_date: new Date("2026-08-15"), status: "pending", created_by: admin!.id },
  ];
  let taskCount = 0;
  for (const t of tasksData) {
    const ex = await prisma.task.findFirst({ where: { title: t.title } });
    if (!ex) { await prisma.task.create({ data: t }); taskCount++; }
  }
  console.log(`${taskCount} tasks seeded`);

  // 10. Dashboard Notifications
  const notifData = [
    { type: "birthday",          contact_id: contacts[0].id, message: "Rajesh Kumar birthday is tomorrow",        is_read: false },
    { type: "bill_due",          contact_id: null,           message: "Electricity Bill due in 5 days Rs 4500",   is_read: false },
    { type: "rent_overdue",      contact_id: contacts[4].id, message: "Vikram Singh rent is overdue by 10 days",  is_read: false },
    { type: "tax_reminder",      contact_id: null,           message: "GST GSTR-1 filing due on 11 Aug",          is_read: true  },
    { type: "birthday",          contact_id: contacts[1].id, message: "Priya Sharma birthday next week",          is_read: false },
    { type: "death_anniversary", contact_id: contacts[2].id, message: "Death anniversary reminder Ritu Verma",   is_read: false },
    { type: "bill_due",          contact_id: null,           message: "LIC Premium due in 7 days Rs 8200",        is_read: false },
    { type: "rent_overdue",      contact_id: contacts[8].id, message: "Naresh Jain rent payment pending",         is_read: true  },
    { type: "tax_reminder",      contact_id: null,           message: "TDS deposit due on 7 Aug",                 is_read: false },
    { type: "birthday",          contact_id: contacts[6].id, message: "Arun Mishra birthday in 3 days",           is_read: false },
  ];
  let notifCount = 0;
  for (const n of notifData) {
    const ex = await prisma.dashboardNotification.findFirst({ where: { message: n.message } });
    if (!ex) { await prisma.dashboardNotification.create({ data: n }); notifCount++; }
  }
  console.log(`${notifCount} notifications seeded`);

  console.log("\nAll dummy data seeded successfully!");
}

main()
  .catch((e) => { console.error("Seed error:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
