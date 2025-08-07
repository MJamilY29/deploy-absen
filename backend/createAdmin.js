
require('dotenv').config();
const mongoose = require('mongoose');

// Skema User harus didefinisikan ulang di sini karena ini adalah skrip terpisah
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Di aplikasi nyata, INI HARUS DI-HASH
  name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' }
});
const User = mongoose.model('User', UserSchema);

const StaffSchema = new mongoose.Schema({
    name: { type: String, required: true }
});
const Staff = mongoose.model('Staff', StaffSchema);


const createAdmin = async () => {
  try {
    // Hubungkan ke MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected for admin creation...');

    // --- Data Admin Baru ---
    const adminUsername = 'adminramian';
    const adminPassword = 'adminramian2025'; // Ganti dengan password yang kuat
    const adminName = 'Administrator';
    // -----------------------

    // Periksa apakah admin sudah ada
    const existingAdmin = await User.findOne({ username: adminUsername });
    if (existingAdmin) {
      console.log('Admin user already exists.');
      return;
    }

    // Buat entri staff baru untuk admin
    const newStaff = new Staff({ name: adminName });
    await newStaff.save();

    // Buat user admin baru
    const adminUser = new User({
      username: adminUsername,
      password: adminPassword, // SEKALI LAGI: Gunakan hashing di aplikasi produksi
      name: adminName,
      role: 'admin',
      staffId: newStaff._id
    });

    await adminUser.save();
    console.log('Admin user created successfully!');
    console.log(`Username: ${adminUsername}`);
    console.log(`Password: ${adminPassword}`);

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    // Tutup koneksi database
    mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
};

createAdmin();
