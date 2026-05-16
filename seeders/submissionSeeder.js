require('dotenv').config();
const mongoose = require('mongoose');
const Team = require('../models/Team');
const Submission = require('../models/Submission');
const HackathonConfig = require('../models/HackathonConfig');

const seedSubmission = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Enable submissions
    await HackathonConfig.updateOne({}, { $set: { isSubmissionOpen: true } });
    console.log('✅ Submissions enabled');

    // Find the first team
    const team = await Team.findOne({});
    if (!team) {
      console.log('❌ No teams found. Create a team first.');
      process.exit(1);
    }
    console.log(`📋 Found team: ${team.teamName} (${team.teamId})`);

    // Check existing submission
    const existing = await Submission.findOne({ teamId: team._id });
    if (existing) {
      console.log('⚠️  Submission already exists for this team. Updating...');
      existing.projectTitle = 'Smart Campus Navigator';
      existing.projectDescription = 'An AI-powered campus navigation app that helps students find classrooms, labs, and facilities using indoor positioning and AR wayfinding. Built with React Native, Node.js, and TensorFlow Lite.';
      existing.githubUrl = 'https://github.com/team-tce/smart-campus-navigator';
      existing.videoUrl = 'https://youtube.com/watch?v=demo123';
      existing.liveDemoUrl = 'https://smart-campus.vercel.app';
      existing.additionalNotes = 'We used BLE beacons for indoor positioning. The AR feature uses phone camera + gyroscope for wayfinding overlays.';
      await existing.save();
      console.log('✅ Submission updated');
    } else {
      await Submission.create({
        teamId: team._id,
        projectTitle: 'Smart Campus Navigator',
        projectDescription: 'An AI-powered campus navigation app that helps students find classrooms, labs, and facilities using indoor positioning and AR wayfinding. Built with React Native, Node.js, and TensorFlow Lite.',
        githubUrl: 'https://github.com/team-tce/smart-campus-navigator',
        videoUrl: 'https://youtube.com/watch?v=demo123',
        liveDemoUrl: 'https://smart-campus.vercel.app',
        additionalNotes: 'We used BLE beacons for indoor positioning. The AR feature uses phone camera + gyroscope for wayfinding overlays.',
        submittedAt: new Date(),
        isLate: false,
      });
      console.log('✅ Submission created: "Smart Campus Navigator"');
    }

    // Verify
    const sub = await Submission.findOne({ teamId: team._id }).populate('teamId', 'teamId teamName').lean();
    console.log('\n📦 Submission Details:');
    console.log(`   Title: ${sub.projectTitle}`);
    console.log(`   Team: ${sub.teamId?.teamName} (${sub.teamId?.teamId})`);
    console.log(`   GitHub: ${sub.githubUrl}`);
    console.log(`   Video: ${sub.videoUrl}`);
    console.log(`   Live Demo: ${sub.liveDemoUrl}`);
    console.log(`   Submitted: ${sub.submittedAt}`);

    console.log('\n🎉 Seeding complete! You can now:');
    console.log('   1. View this submission in team panel → Submit Project');
    console.log('   2. View and evaluate it in admin panel → Submissions');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

seedSubmission();
