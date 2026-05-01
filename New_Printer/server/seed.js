const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Printer = require('./models/Printer');
const connectDB = require('./config/db');

dotenv.config();

const seedData = async () => {
    try {
        await connectDB();

        // Check if Admin exists
        let adminUser = await User.findOne({ email: 'admin@example.com' });
        if (!adminUser) {
            adminUser = await User.create({
                name: 'Admin User',
                email: 'admin@example.com',
                password: 'password123',
                isAdmin: true,
            });
            console.log('Admin User created');
        } else {
            console.log('Admin User already exists');
        }

        // Check if Student exists
        let studentUser = await User.findOne({ email: 'student@example.com' });
        if (!studentUser) {
            studentUser = await User.create({
                name: 'Student User',
                email: 'student@example.com',
                password: 'password123',
                isAdmin: false,
            });
            console.log('Student User created');
        } else {
            console.log('Student User already exists');
        }

        // Create Printers
        const libraryPrinter = await Printer.create({
            name: 'Main Library Printer',
            location: 'Library Ground Floor',
            status: 'online',
        });

        const departmentPrinter = await Printer.create({
            name: 'Department Printer',
            location: 'Department Office',
            status: 'online',
        });

        const reproAPrinter = await Printer.create({
            name: 'Repro Printer A',
            location: 'Reprography Center',
            status: 'online',
        });

        const reproBPrinter = await Printer.create({
            name: 'Repro Printer B',
            location: 'Reprography Center',
            status: 'online',
        });

        console.log('Data Seeded!');
        console.log('Admin: admin@example.com / password123');
        console.log('Student: student@example.com / password123');
        process.exit();
    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
};

seedData();
