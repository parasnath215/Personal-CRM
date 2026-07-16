-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "tags" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contact_id" INTEGER NOT NULL,
    "relation" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "date_of_birth" DATETIME,
    "date_of_death" DATETIME,
    CONSTRAINT "FamilyMember_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bill" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "category" TEXT,
    "recurrence_type" TEXT NOT NULL,
    "due_day" INTEGER,
    "next_due_date" DATETIME NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Rental" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "client_name" TEXT NOT NULL,
    "client_phone" TEXT NOT NULL,
    "property_name" TEXT NOT NULL,
    "rent_amount" REAL NOT NULL,
    "due_day" INTEGER NOT NULL,
    "next_due_date" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RentPayment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "rental_id" INTEGER NOT NULL,
    "amount_paid" REAL NOT NULL,
    "paid_on" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "RentPayment_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "Rental" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaxReminder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tax_type" TEXT NOT NULL,
    "due_date" DATETIME NOT NULL,
    "reminder_lead_days" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "amount" REAL NOT NULL,
    "category" TEXT NOT NULL,
    "note" TEXT,
    "spent_on" DATETIME NOT NULL,
    "payment_mode" TEXT,
    "created_by" INTEGER NOT NULL,
    CONSTRAINT "Expense_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HotelGuest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "id_proof_type" TEXT,
    "id_proof_number" TEXT,
    "check_in" DATETIME NOT NULL,
    "check_out" DATETIME,
    "room_number" TEXT NOT NULL,
    "entered_by" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HotelGuest_entered_by_fkey" FOREIGN KEY ("entered_by") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "target_amount" REAL NOT NULL,
    "target_date" DATETIME NOT NULL,
    "category" TEXT
);

-- CreateTable
CREATE TABLE "GoalProgress" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "goal_id" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "amount_achieved" REAL NOT NULL,
    "note" TEXT,
    CONSTRAINT "GoalProgress_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "event_date" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "carried_forward_to" DATETIME,
    "created_by" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Task_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DashboardNotification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "contact_id" INTEGER,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DashboardNotification_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_phone_key" ON "Contact"("phone");
