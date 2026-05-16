require('dotenv').config();
const mongoose = require('mongoose');
const ProblemStatement = require('../models/ProblemStatement');
const Team = require('../models/Team');

const seedProblems = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Drop existing problems
    await ProblemStatement.deleteMany({});
    console.log('🗑️ Dropped existing problem statements');

    // Also clear selectedProblem on all teams to prevent broken refs
    await Team.updateMany({}, { $set: { selectedProblem: null, selectionChangesLeft: 3 } });
    console.log('🧹 Cleared team problem selections');

    const problems = [
      {
        title: 'Memory Leak Analyzer (C)',
        description: 'Build a custom C library/tool that wrappers malloc() and free() to track dynamic memory allocations. It should print a summary of unfreed memory addresses and their sizes when the program exits to help debug memory leaks.',
        category: 'Dynamic Memory',
        difficulty: 'Hard',
        expectedOutcome: 'A header file and implementation file that can be included in any C project to track memory leaks.',
        techStack: 'C (Macros, Pointers, Linked Lists)',
        resources: 'Research #define macro tricks to override malloc/free.',
        maxTeams: 5,
        isActive: true,
      },
      {
        title: 'Custom Command Shell (C)',
        description: 'Develop a simplified command-line shell in C. It should handle basic built-in commands (cd, exit, pwd) and execute external programs (like ls, gcc) by forking child processes and executing them.',
        category: 'Functions',
        difficulty: 'Medium',
        expectedOutcome: 'An interactive shell program capable of executing system commands with basic arguments.',
        techStack: 'C (Process control, execvp, fork, strings)',
        resources: 'Read up on fork() and exec() family of functions.',
        maxTeams: 0,
        isActive: true,
      },
      {
        title: 'Matrix Manipulation Engine (C)',
        description: 'Create a robust Matrix library in C. It must support dynamically allocated 2D arrays, and provide functions for Matrix Addition, Multiplication, Transposition, and finding the Determinant using recursion.',
        category: 'Arrays',
        difficulty: 'Medium',
        expectedOutcome: 'A generic Matrix library that handles arbitrary sizes dynamically without crashing.',
        techStack: 'C (2D Arrays, Pointers to Pointers, Recursion)',
        resources: 'Focus on proper memory allocation and deallocation for 2D arrays.',
        maxTeams: 10,
        isActive: true,
      },
      {
        title: 'Student Database System (C)',
        description: 'Implement a comprehensive student database management system. It should store student records (Name, Roll No, Grades) in a binary file. Features must include Add, Search (by Roll No), Update, and Delete (using logical deletion or rewriting).',
        category: 'File Handling',
        difficulty: 'Medium',
        expectedOutcome: 'A console-based application managing persistent data using C structs and file streams.',
        techStack: 'C (Structures, File I/O, fread/fwrite)',
        resources: 'Use binary mode for file operations to prevent data corruption.',
        maxTeams: 0,
        isActive: true,
      },
      {
        title: 'Custom String Library (C)',
        description: 'Write your own implementation of the standard <string.h> library from scratch. You must implement strlen, strcpy, strcat, strcmp, strstr, and a custom str_split function without using the standard library.',
        category: 'Strings',
        difficulty: 'Easy',
        expectedOutcome: 'A complete set of optimized string manipulation functions using pointer arithmetic.',
        techStack: 'C (Strings, Pointer Arithmetic)',
        resources: 'Optimize for efficiency (e.g., checking multiple bytes at once if possible).',
        maxTeams: 0,
        isActive: true,
      }
    ];

    await ProblemStatement.insertMany(problems);
    console.log(`✅ Successfully seeded ${problems.length} C-specific problem statements`);
    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

seedProblems();
