// Quick seed script to create test volunteer and judge accounts
require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const seedStaff = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const accounts = [
    { name: 'Test Volunteer', staffId: 'VOL001', password: 'volunteer123', role: 'volunteer', dutyArea: 'Food Court' },
    { name: 'Test Mentor', staffId: 'MEN001', password: 'mentor123', role: 'mentor', specialization: 'Full Stack' },
    { name: 'Test Judge', staffId: 'JUD001', password: 'judge123', role: 'judge', specialization: 'AI/ML' },
  ];

  for (const acc of accounts) {
    const existing = await Admin.findOne({ staffId: acc.staffId });
    if (existing) {
      console.log(`⚠️  ${acc.role} "${acc.staffId}" already exists — skipping`);
    } else {
      await Admin.create(acc);
      console.log(`✅ Created ${acc.role}: ${acc.staffId} / ${acc.password}`);
    }
  }

  console.log('\n📋 Login Credentials:');
  console.log('─────────────────────────────────────');
  console.log('VOLUNTEER:  Staff ID: VOL001  |  Password: volunteer123');
  console.log('MENTOR:     Staff ID: MEN001  |  Password: mentor123');
  console.log('JUDGE:      Staff ID: JUD001  |  Password: judge123');
  console.log('─────────────────────────────────────');
  console.log('\nLogin URLs:');
  console.log('Volunteer → http://localhost:5173/volunteer/login');
  console.log('Judge     → http://localhost:5173/judge/login');

  await mongoose.disconnect();
};

seedStaff().catch(console.error);
