require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Job = require('../models/Job');

const JOBS = [
  { title: 'Software QA Tester (Remote)', company: 'Nimbus Tech', category: 'IT', location: 'Remote', type: 'Full-time',
    description: 'Test web applications for bugs, write clear bug reports, and work with screen-reader compatible ticketing tools. No prior QA certification required, training provided.',
    requiredSkills: ['testing', 'software', 'computer', 'attention to detail', 'bug tracking', 'excel', 'communication'],
    accommodations: ['remote', 'screenreader', 'flexible', 'training'] },

  { title: 'Data Entry Clerk', company: 'Coral Bay Logistics', category: 'IT', location: 'Colombo / Remote', type: 'Part-time',
    description: 'Enter shipment and inventory data into spreadsheets accurately. Comfortable with keyboard shortcuts and basic Excel. Screen-reader compatible software used company-wide.',
    requiredSkills: ['data entry', 'excel', 'typing', 'computer', 'accuracy', 'spreadsheets'],
    accommodations: ['remote', 'screenreader', 'flexible'] },

  { title: 'Grocery Store Cashier', company: 'GreenMart Supermarket', category: 'Retail', location: 'Kandy', type: 'Full-time',
    description: 'Handle cash and card payments, assist customers, restock shelves. Store has a ramp entrance and accessible counter height.',
    requiredSkills: ['cash handling', 'customer service', 'communication', 'math', 'retail'],
    accommodations: ['wheelchair', 'flexible'] },

  { title: 'Textile Machine Operator', company: 'Silk Route Mills', category: 'Textile', location: 'Gampaha', type: 'Full-time',
    description: 'Operate sewing and cutting machines on the production floor. Seated workstation, adjustable table height, buddy system for training.',
    requiredSkills: ['sewing', 'machine operation', 'textile', 'tailoring', 'attention to detail'],
    accommodations: ['ergonomic', 'training'] },

  { title: 'Tailor / Textile Craftsperson', company: 'Threadline Studio', category: 'Textile', location: 'Galle', type: 'Part-time',
    description: 'Hand and machine stitching for made-to-order garments. Flexible shifts, ergonomic seating provided.',
    requiredSkills: ['tailoring', 'sewing', 'design', 'textile', 'handwork'],
    accommodations: ['ergonomic', 'flexible', 'training'] },

  { title: 'Junior Accountant / Bookkeeper', company: 'Ledger & Co', category: 'Accounting', location: 'Remote', type: 'Full-time',
    description: 'Maintain financial records, reconcile accounts, prepare basic reports using accounting software compatible with screen readers.',
    requiredSkills: ['accounting', 'bookkeeping', 'excel', 'finance', 'numbers', 'quickbooks'],
    accommodations: ['remote', 'screenreader', 'flexible'] },

  { title: 'Payroll Assistant', company: 'Ledger & Co', category: 'Accounting', location: 'Remote', type: 'Part-time',
    description: 'Process monthly payroll data and maintain employee records with accuracy. Fully remote role.',
    requiredSkills: ['payroll', 'excel', 'accounting', 'data entry', 'accuracy'],
    accommodations: ['remote', 'flexible', 'screenreader'] },

  { title: 'Office Cleaner', company: 'Bright Space Facilities', category: 'Cleaning', location: 'Colombo', type: 'Part-time',
    description: 'Clean and maintain office spaces on a flexible schedule. Lightweight equipment provided, tasks can be adapted to mobility needs.',
    requiredSkills: ['cleaning', 'attention to detail', 'time management', 'reliability'],
    accommodations: ['flexible', 'training', 'ergonomic'] },

  { title: 'Customer Support Agent (Chat & Email)', company: 'HelpDesk Plus', category: 'Customer Service', location: 'Remote', type: 'Full-time',
    description: 'Respond to customer queries via chat and email using a screen-reader friendly helpdesk platform. Strong written communication needed.',
    requiredSkills: ['communication', 'writing', 'customer service', 'typing', 'patience', 'computer'],
    accommodations: ['remote', 'screenreader', 'flexible'] },

  { title: 'Telecaller / Voice Support', company: 'HelpDesk Plus', category: 'Customer Service', location: 'Remote', type: 'Part-time',
    description: 'Handle inbound customer calls, log details in a simple CRM. Good for candidates who communicate confidently by voice.',
    requiredSkills: ['communication', 'voice', 'customer service', 'patience', 'listening'],
    accommodations: ['remote', 'flexible'] },

  { title: 'Warehouse Inventory Clerk', company: 'Coral Bay Logistics', category: 'Warehouse', location: 'Negombo', type: 'Full-time',
    description: 'Track stock levels and update inventory records; light-duty tasks only, no heavy lifting required, wheelchair accessible aisles.',
    requiredSkills: ['inventory', 'organisation', 'computer', 'attention to detail', 'data entry'],
    accommodations: ['wheelchair', 'ergonomic', 'training'] },

  { title: 'Graphic Designer', company: 'Studio Siri', category: 'Design', location: 'Remote', type: 'Part-time',
    description: 'Design social media graphics and print materials using accessible design software. Portfolio review instead of formal degree required.',
    requiredSkills: ['design', 'photoshop', 'illustrator', 'creativity', 'canva'],
    accommodations: ['remote', 'flexible', 'screenreader'] },

  { title: 'Receptionist', company: 'Harborview Clinic', category: 'Customer Service', location: 'Colombo', type: 'Full-time',
    description: 'Greet visitors, manage appointment bookings, answer calls. Sign-language colleague on site, wheelchair accessible front desk.',
    requiredSkills: ['communication', 'scheduling', 'customer service', 'computer', 'organisation'],
    accommodations: ['wheelchair', 'signlanguage', 'flexible'] },
];

async function seed() {
  await connectDB();
  await Job.deleteMany({});
  await Job.insertMany(JOBS);
  console.log(`Seeded ${JOBS.length} jobs.`);
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
