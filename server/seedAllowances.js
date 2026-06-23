const mongoose = require('mongoose');
const dotenv = require('dotenv');
const AllowanceCategory = require('./models/AllowanceCategory');

dotenv.config();

const categories = [
    { name: 'Travel Allowance', maxAmount: 500, description: 'Reimbursement for travel expenses, flights, and taxis.', requiresDocument: false },
    { name: 'Food Allowance', maxAmount: 100, description: 'Daily meal allowance or team lunch reimbursement.', requiresDocument: false }
];

const seedCategories = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected');

        // Clear existing categories
        await AllowanceCategory.deleteMany({});
        console.log('🗑️ Existing categories cleared');

        // Insert new categories
        await AllowanceCategory.insertMany(categories);
        console.log('🌱 Default allowance categories seeded successfully!');

        process.exit();
    } catch (err) {
        console.error('❌ Error seeding categories:', err.message);
        process.exit(1);
    }
};

seedCategories();
