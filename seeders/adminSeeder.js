require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const HackathonConfig = require('../models/HackathonConfig');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create admin
    const existingAdmin = await Admin.findOne({ email: 'admin@tcehack.com' });
    if (existingAdmin) {
      console.log('⚠️  Admin already exists: admin@tcehack.com');
    } else {
      await Admin.create({ name: 'Super Admin', email: 'admin@tcehack.com', password: 'Admin@123', role: 'superadmin' });
      console.log('✅ Admin created: admin@tcehack.com / Admin@123');
    }

    // Create default hackathon config
    const existingConfig = await HackathonConfig.findOne();
    if (existingConfig) {
      console.log('⚠️  HackathonConfig already exists');
    } else {
      await HackathonConfig.create({
        name: 'TCE Hackathon 2026',
        tagline: 'Code. Create. Conquer.',
        description: 'Annual hackathon organized by TCE College, Gadag. 50 hours of C programming followed by an exciting hackathon challenge!',
        venue: { collegeName: 'TCE College', hallName: 'Main Auditorium', address: 'Gadag, Karnataka' },
        mode: 'offline',
        teamSettings: { minSize: 2, maxSize: 5 },
        questionSettings: { totalQuestions: 30, timeLimit: 60, negativeMarking: false, passingScore: 40, randomizeOrder: true, shuffleOptions: true },
        rules: [
          { id: '1', text: 'Each team must have 2-5 members.', order: 1 },
          { id: '2', text: 'All team members must be students of recognized colleges.', order: 2 },
          { id: '3', text: 'Teams must submit their projects before the deadline.', order: 3 },
          { id: '4', text: 'Plagiarism will result in immediate disqualification.', order: 4 },
          { id: '5', text: 'The admin\'s decision is final.', order: 5 },
        ],
        prizes: [
          { rank: 1, title: '1st Place', amount: 10000, description: 'Winner trophy + cash prize' },
          { rank: 2, title: '2nd Place', amount: 7000, description: 'Runner-up trophy + cash prize' },
          { rank: 3, title: '3rd Place', amount: 5000, description: 'Second runner-up + cash prize' },
        ],
      });
      console.log('✅ Default HackathonConfig created');
    }

    console.log('\n🎉 Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

seedAdmin();
