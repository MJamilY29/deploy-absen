require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const ExcelJS = require('exceljs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [process.env.CORS_ORIGIN];
const corsOptions = {
  origin: (origin, callback) => {
    console.log('Request origin:', origin); // Log the incoming origin
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// --- Koneksi ke MongoDB ---
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log(err));

// --- Skema dan Model Mongoose ---

const StaffSchema = new mongoose.Schema({
  name: { type: String, required: true }
});
const Staff = mongoose.model('Staff', StaffSchema);

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' }
});
const User = mongoose.model('User', UserSchema);

const AttendanceSchema = new mongoose.Schema({
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  name: { type: String, required: true },
  status: { type: String, enum: ['Hadir', 'Sakit', 'Izin'], required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
});
const Attendance = mongoose.model('Attendance', AttendanceSchema);

const RecordSchema = new mongoose.Schema({
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  timestamp: { type: Date, default: Date.now },
  type: { type: String, enum: ['clock-in', 'clock-out'], required: true },
});
const Record = mongoose.model('Record', RecordSchema);


// --- Endpoint API ---

// Endpoint to get all staff
app.get('/api/staff', async (req, res) => {
  try {
    const staff = await Staff.find();
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching staff' });
  }
});

// Endpoint to get attendance history
app.get('/api/attendance', async (req, res) => {
  try {
    const attendance = await Attendance.find();
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching attendance' });
  }
});

// Endpoint to submit attendance
app.post('/api/attendance', async (req, res) => {
  const { staffId, name, status, date, fromAdmin } = req.body;

  try {
    if (!fromAdmin) {
      const existingAttendance = await Attendance.findOne({ staffId, date });
      if (existingAttendance) {
        return res.status(400).json({ message: 'Absensi sudah dikirimkan untuk hari ini.' });
      }
    }

    const newAttendance = new Attendance(req.body);
    await newAttendance.save();
    res.status(201).json(newAttendance);
  } catch (err) {
    res.status(500).json({ message: 'Error submitting attendance' });
  }
});


// Endpoint to update an attendance record
app.put('/api/attendance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedAttendance = await Attendance.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedAttendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    res.json(updatedAttendance);
  } catch (err) {
    res.status(500).json({ message: 'Error updating attendance' });
  }
});

// Endpoint to delete an attendance record
app.delete('/api/attendance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedAttendance = await Attendance.findByIdAndDelete(id);
    if (!deletedAttendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    res.json({ message: 'Attendance record deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting attendance' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username, password }).populate('staffId');
    if (user) {
      // Transform user object to match frontend expectations
      const userResponse = {
        id: user._id,
        username: user.username,
        role: user.role,
        // staffId is an object after populate, frontend might expect just the ID
        staffId: user.staffId ? user.staffId._id : undefined,
        name: user.name
      };
      res.json({ success: true, user: userResponse });
    } else {
      res.status(401).json({ success: false, message: 'username atau password anda salah' });
    }
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Error during login' });
  }
});

app.post('/api/register', async (req, res) => {
    const { username, password, name } = req.body;

    try {
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(409).json({ message: 'Username already taken.' });
        }

        // Create new staff entry
        const newStaff = new Staff({ name });
        await newStaff.save();

        // Create new user entry
        const newUser = new User({
            username,
            password, // In a real app, you MUST hash the password
            name,
            role: 'staff',
            staffId: newStaff._id
        });
        await newUser.save();

        res.status(201).json({ success: true, message: 'Staff account created successfully.' });
    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ message: 'Error creating account' });
    }
});


app.get('/api/export-excel', async (req, res) => {
  try {
    const { staffId, month, year } = req.query;

    let attendanceQuery = {};
    let recordQuery = {};

    if (staffId) {
      attendanceQuery.staffId = staffId;
      recordQuery.staffId = staffId;
    }

    if (month) {
      const targetMonth = parseInt(month); // 1-indexed
      const targetYear = year ? parseInt(year) : new Date().getFullYear();

      // For Attendance (date is string 'YYYY-MM-DD')
      attendanceQuery.$expr = {
        $and: [
          { $eq: [{ $toInt: { $substr: ["$date", 5, 2] } }, targetMonth] }
        ]
      };
      if (year) {
        attendanceQuery.$expr.$and.push({ $eq: [{ $toInt: { $substr: ["$date", 0, 4] } }, targetYear] });
      }

      // For Record (timestamp is Date object)
      const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
      const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999); // End of month, including last millisecond
      recordQuery.timestamp = { $gte: startOfMonth, $lte: endOfMonth };
    } else if (year) {
      const targetYear = parseInt(year);

      // For Attendance (date is string 'YYYY-MM-DD')
      attendanceQuery.$expr = {
        $and: [
          { $eq: [{ $toInt: { $substr: ["$date", 0, 4] } }, targetYear] }
        ]
      };

      // For Record (timestamp is Date object)
      const startOfYear = new Date(targetYear, 0, 1);
      const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59, 999);
      recordQuery.timestamp = { $gte: startOfYear, $lte: endOfYear };
    }

    const staff = await Staff.find(staffId ? { _id: staffId } : {});
    const attendance = await Attendance.find(attendanceQuery);
    const records = await Record.find(recordQuery);

    // Helper to process work time from records
    const processWorkTimeRecords = (staffId, staffRecords) => {
      const dailyRecords = {};
      staffRecords.forEach(record => {
        const date = new Date(record.timestamp).toISOString().slice(0, 10);
        if (!dailyRecords[date]) {
          dailyRecords[date] = [];
        }
        dailyRecords[date].push(record);
      });

      const processedRecords = [];
      for (const date in dailyRecords) {
        const recordsForDate = dailyRecords[date].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const clockIn = recordsForDate.find(r => r.type === 'clock-in');
        const clockOut = recordsForDate.reverse().find(r => r.type === 'clock-out');

        let totalHours = 'N/A';
        let keterangan = '';

        if (clockIn) {
          const clockInDate = new Date(clockIn.timestamp);
          const targetTime = new Date(clockInDate);
          targetTime.setHours(6, 45, 0, 0);

          if (clockInDate.getTime() < targetTime.getTime()) {
            keterangan = 'Datang Lebih Awal';
          } else if (clockInDate.getHours() === 6 && clockInDate.getMinutes() === 45 && clockInDate.getSeconds() === 0) {
            keterangan = 'Tepat Waktu';
          } else {
            keterangan = 'Terlambat';
          }
        }

        if (clockIn && clockOut) {
          const startTime = new Date(clockIn.timestamp).getTime();
          const endTime = new Date(clockOut.timestamp).getTime();
          const diffMillis = endTime - startTime;

          const hours = Math.floor(diffMillis / (1000 * 60 * 60));
          const minutes = Math.floor((diffMillis % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor(((diffMillis % (1000 * 60 * 60)) % (1000 * 60)) / 1000);
          totalHours = `${hours} jam ${minutes} menit ${seconds} detik`;
        } else if (clockIn) {
          totalHours = 'Sedang Bekerja';
        }

        processedRecords.push({
          staffId: staffId,
          date: date,
          clockInTime: clockIn ? new Date(clockIn.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : 'N/A',
          clockOutTime: clockOut ? new Date(clockOut.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : 'N/A',
          totalHours: totalHours,
          keterangan: keterangan,
        });
      }
      return processedRecords;
    };

    // Process records for all staff
    const allWorkTimeRecords = [];
    staff.forEach(s => {
        const staffRecords = records.filter(r => r.staffId.toString() === s._id.toString());
        const workTime = processWorkTimeRecords(s._id, staffRecords);
        allWorkTimeRecords.push(...workTime);
    });

    // Combine attendance and work time records
    const combinedData = attendance.map(att => {
      const workTime = allWorkTimeRecords.find(wt => wt.staffId.toString() === att.staffId.toString() && wt.date === att.date);
      return {
        id: att._id,
        staffId: att.staffId,
        name: att.name,
        time: att.time,
        status: att.status,
        date: att.date,
        clockInTime: workTime ? workTime.clockInTime : 'N/A',
        clockOutTime: workTime ? workTime.clockOutTime : 'N/A',
        totalHours: workTime ? workTime.totalHours : 'N/A',
        keterangan: workTime ? workTime.keterangan : 'N/A',
      };
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Combined Report');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 25 },
      { header: 'Staff ID', key: 'staffId', width: 25 },
      { header: 'Nama', key: 'name', width: 25 },
      { header: 'Time', key: 'time', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Tanggal', key: 'date', width: 15 },
      { header: 'Jam Masuk', key: 'clockInTime', width: 15 },
      { header: 'Jam Pulang', key: 'clockOutTime', width: 15 },
      { header: 'Total Jam Kerja', key: 'totalHours', width: 25 },
      { header: 'Keterangan', key: 'keterangan', width: 20 },
    ];

    worksheet.addRows(combinedData);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + 'attendance_report.xlsx'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error exporting Excel:', err);
    res.status(500).send('Error exporting data to Excel');
  }
});

// Endpoint to handle clock-in and clock-out
app.post('/api/records', async (req, res) => {
    const { staffId, type } = req.body;

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todaysRecords = await Record.find({
            staffId,
            timestamp: { $gte: today, $lt: tomorrow }
        }).sort({ timestamp: 1 });

        const hasClockedInToday = todaysRecords.some(r => r.type === 'clock-in');
        const hasClockedOutToday = todaysRecords.some(r => r.type === 'clock-out');

        if (type === 'clock-in') {
            if (hasClockedInToday) {
                return res.status(400).json({ message: 'Anda sudah melakukan jam masuk hari ini.' });
            }
            if (hasClockedOutToday) {
                return res.status(400).json({ message: 'Anda sudah menyelesaikan jam kerja hari ini.' });
            }
        } else if (type === 'clock-out') {
            if (!hasClockedInToday) {
                return res.status(400).json({ message: 'Anda harus melakukan jam masuk terlebih dahulu.' });
            }
            if (hasClockedOutToday) {
                return res.status(400).json({ message: 'Anda sudah melakukan jam pulang hari ini.' });
            }
        }

        const newRecord = new Record({ staffId, type });
        await newRecord.save();
        res.status(201).json(newRecord);
    } catch (err) {
        console.error("Record Error:", err);
        res.status(500).json({ message: 'Error processing record' });
    }
});


// Endpoint to get records for a specific staff member
app.get('/api/records/:staffId', async (req, res) => {
  const { staffId } = req.params;
  try {
    const staffRecords = await Record.find({ staffId: staffId });
    res.json(staffRecords);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching records' });
  }
});

// --- CRUD for Work Time Records (Admin) ---

// Create or Replace a full day's work record (clock-in and clock-out)
app.post('/api/records/admin', async (req, res) => {
  const { staffId, date, name, clockInTime, clockOutTime } = req.body;
  if (!staffId || !date || !clockInTime) {
    return res.status(400).json({ message: 'Staff ID, date, and clock-in time are required.' });
  }

  try {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Remove existing records for that day to avoid duplicates
    await Record.deleteMany({ staffId, timestamp: { $gte: startOfDay, $lte: endOfDay } });

    // Create new clock-in record
    const [inHours, inMinutes, inSeconds] = clockInTime.split(':');
    const clockInTimestamp = new Date(date);
    clockInTimestamp.setUTCHours(inHours, inMinutes, inSeconds || 0);
    const clockInRecord = new Record({ staffId, type: 'clock-in', timestamp: clockInTimestamp });
    await clockInRecord.save();

    // Create new clock-out record if provided
    if (clockOutTime && clockOutTime !== 'N/A') {
      const [outHours, outMinutes, outSeconds] = clockOutTime.split(':');
      const clockOutTimestamp = new Date(date);
      clockOutTimestamp.setUTCHours(outHours, outMinutes, outSeconds || 0);
      const clockOutRecord = new Record({ staffId, type: 'clock-out', timestamp: clockOutTimestamp });
      await clockOutRecord.save();
    }

    res.status(201).json({ message: 'Work record created successfully.' });
  } catch (err) {
    console.error("Admin Record Create Error:", err);
    res.status(500).json({ message: 'Error creating work record' });
  }
});

// Delete a day's work records
app.delete('/api/records/admin/:staffId/:date', async (req, res) => {
  const { staffId, date } = req.params;
  try {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    await Record.deleteMany({ staffId, timestamp: { $gte: startOfDay, $lte: endOfDay } });
    res.json({ message: 'Work records for the day deleted successfully.' });
  } catch (err) {
    console.error("Admin Record Delete Error:", err);
    res.status(500).json({ message: 'Error deleting work records' });
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});