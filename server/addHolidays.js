const mongoose = require('mongoose');
require('dotenv').config();
const Holiday = require('./models/Holiday');

async function addHolidays() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const holidays = [
            { name: 'Republic Day', date: new Date('2026-01-26'), type: 'national', description: 'Republic Day of India' },
            { name: 'Good Friday', date: new Date('2026-04-03'), type: 'national', description: 'Good Friday' },
            { name: 'Ambedkar Jayanti', date: new Date('2026-04-14'), type: 'national', description: 'Dr. B.R. Ambedkar Jayanti' },
            { name: 'Labor Day', date: new Date('2026-05-01'), type: 'national', description: 'International Workers Day' },
            { name: 'Independence Day', date: new Date('2026-08-15'), type: 'national', description: 'Independence Day of India' },
            { name: 'Gandhi Jayanti', date: new Date('2026-10-02'), type: 'national', description: 'Mahatma Gandhi Jayanti' },
            { name: 'Christmas', date: new Date('2026-12-25'), type: 'national', description: 'Christmas Day' }
        ];

        for (const h of holidays) {
            await Holiday.findOneAndUpdate(
                { name: h.name, date: h.date },
                h,
                { upsert: true, new: true }
            );
            console.log(`Added/Updated: ${h.name}`);
        }

        console.log('Holidays added successfully');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

addHolidays();
