import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Interfaces moved from App.tsx
interface Staff {
  _id: string; // Changed from id: number
  name: string;
}

interface Attendance {
  _id: string; // Changed from id: number
  staffId: string;
  name: string;
  status: string;
  date: string;
  time: string;
}

interface Record {
  _id: string; // Changed from id: number
  staffId: string;
  timestamp: string;
  type: 'clock-in' | 'clock-out';
}

interface WorkTimeRecord {
  _id: string; // Kept as string, was likely implicitly string before
  staffId: string;
  name: string;
  date: string;
  clockInTime: string;
  clockOutTime: string;
  totalHours: string;
  keterangan: string;
}

interface User {
  id: string;
  username: string;
  role: 'admin' | 'staff';
  staffId?: string;
  name: string; // Added name property
}

// Define the office location (latitude and longitude)
const OFFICE_LOCATION = {
  latitude: -6.958115592601739, // Replace with your office's latitude
  longitude: 107.70755749004297, // Replace with your office's longitude
};
const GEOFENCE_RADIUS = 50; // in meters

interface MainAppProps {
  user: User;
  onLogout: () => void;
}

const MainApp: React.FC<MainAppProps> = ({ user, onLogout }) => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [records, setRecords] = useState<Record[]>([]);
  const [clockStatus, setClockStatus] = useState('out');
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<keyof Attendance | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11 for Jan-Dec
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [workTimeRecords, setWorkTimeRecords] = useState<WorkTimeRecord[]>([]);
  const [workTimeSortColumn, setWorkTimeSortColumn] = useState<keyof WorkTimeRecord | null>(null);
  const [workTimeSortDirection, setWorkTimeSortDirection] = useState<'asc' | 'desc'>('asc');
  const [workTimeSearchTerm, setWorkTimeSearchTerm] = useState<string>('');
  const [totalWorkTime, setTotalWorkTime] = useState<string | null>(null);

  const fetchRecords = async (id: string) => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/records/${id}`);
      const today = new Date().toISOString().slice(0, 10);
      const todaysRecords = (response.data as Record[]).filter((r: Record) => r.timestamp.startsWith(today));
      setRecords(todaysRecords);

      if (todaysRecords.length > 0) {
        setClockStatus(todaysRecords[todaysRecords.length - 1].type === 'clock-in' ? 'in' : 'out');
      } else {
        setClockStatus('out'); // Reset status if no records for today
      }
    } catch (error) {
      console.error('Error fetching records:', error);
      setClockStatus('out'); // Reset status on error
    }
  };

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/staff`).then((response) => setStaff(response.data));
    axios.get(`${process.env.REACT_APP_API_URL}/api/attendance`).then((response) => setAttendance(response.data));
    if (user.staffId !== undefined) {
      fetchRecords(user.staffId);
    }
  }, [user.staffId]);

  useEffect(() => {
    if (user.staffId !== undefined && records.length > 0) {
      processWorkTimeRecords(user.staffId, records);
      calculateTotalWorkTime(records);
    }
  }, [records, user.staffId]);

  const calculateTotalWorkTime = (records: Record[]) => {
    const clockIn = records.find(r => r.type === 'clock-in');
    const clockOut = records.find(r => r.type === 'clock-out');

    if (clockIn && clockOut) {
      const startTime = new Date(clockIn.timestamp).getTime();
      const endTime = new Date(clockOut.timestamp).getTime();
      const diffMillis = endTime - startTime;

      const hours = Math.floor(diffMillis / (1000 * 60 * 60));
      const minutes = Math.floor((diffMillis % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor(((diffMillis % (1000 * 60 * 60)) % (1000 * 60)) / 1000);

      setTotalWorkTime(`${hours} jam ${minutes} menit ${seconds} detik`);
    } else {
      setTotalWorkTime(null);
    }
  };

  const handleAttendance = (staffId: string, name: string, status: string) => {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0]; // Get HH:MM:SS

    if (status === 'Hadir') {
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by your browser');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const distance = getDistance(latitude, longitude, OFFICE_LOCATION.latitude, OFFICE_LOCATION.longitude);

          if (distance <= GEOFENCE_RADIUS) {
            submitAttendance(staffId, name, status, date, time);
          } else {
            setError('Mohon aktifkan GPS anda.');
          }
        },
        () => {
          setError('Absensi sudah dilaporkan untuk hari ini.');
        }
      );
    } else {
      submitAttendance(staffId, name, status, date, time);
    }
  };

  const submitAttendance = (staffId: string, name: string, status: string, date: string, time: string) => {
    axios.post(`${process.env.REACT_APP_API_URL}/api/attendance`, { staffId, name, status, date, time })
      .then((response) => {
        setAttendance([...attendance, response.data]);
        setError(null);
      })
      .catch((err) => {
        if (err.response && err.response.status === 400) {
          setError(err.response.data.message);
        } else {
          setError('An error occurred while submitting attendance.');
        }
      });
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
  };

  const processWorkTimeRecords = (staffId: string, records: Record[]) => {
    const dailyRecords: { [key: string]: Record[] } = {};
    records.forEach(record => {
      const date = new Date(record.timestamp).toISOString().slice(0, 10);
      if (!dailyRecords[date]) {
        dailyRecords[date] = [];
      }
      dailyRecords[date].push(record);
    });

    const processedRecords: WorkTimeRecord[] = [];
    for (const date in dailyRecords) {
      const recordsForDate = dailyRecords[date].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const clockIn = recordsForDate.find(r => r.type === 'clock-in');
      const clockOut = recordsForDate.reverse().find(r => r.type === 'clock-out');

      let totalHours = 'N/A';
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

      if (clockIn || clockOut) {
        let keterangan = '';
        if (clockIn) {
          const clockInDate = new Date(clockIn.timestamp);
          const sevenAM = new Date(clockInDate);
          sevenAM.setHours(7, 0, 0, 0);

          if (clockInDate.getTime() < sevenAM.getTime()) {
            keterangan = 'Datang Lebih Awal';
          } else if (clockInDate.getHours() === 7 && clockInDate.getMinutes() === 0 && clockInDate.getSeconds() === 0) {
            keterangan = 'Tepat Waktu';
          } else {
            keterangan = 'Terlambat';
          }
        }

        processedRecords.push({
          _id: clockIn ? clockIn._id : '',
          staffId: staffId,
          name: staff.find(s => s._id === staffId)?.name || 'Unknown',
          date: date,
          clockInTime: clockIn ? new Date(clockIn.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : 'N/A',
          clockOutTime: clockOut ? new Date(clockOut.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : 'N/A',
          totalHours: totalHours,
          keterangan: keterangan,
        });
      }
    }
    setWorkTimeRecords(processedRecords);
  };

  const handleClockIn = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const distance = getDistance(latitude, longitude, OFFICE_LOCATION.latitude, OFFICE_LOCATION.longitude);

        if (distance <= GEOFENCE_RADIUS) {
          try {
            await axios.post(`${process.env.REACT_APP_API_URL}/api/records`, { staffId: user.staffId, type: 'clock-in' });
            if (user.staffId) {
              fetchRecords(user.staffId);
            }
            setError(null);
          } catch (error: any) {
            setError(error.response.data.message);
          }
        } else {
          setError('Jam kerja sudah dilaporkan untuk hari ini.');
        }
      },
      () => {
        setError('Tidak dapat mengambil lokasi Anda.');
      }
    );
  };

  const handleClockOut = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const distance = getDistance(latitude, longitude, OFFICE_LOCATION.latitude, OFFICE_LOCATION.longitude);

        if (distance <= GEOFENCE_RADIUS) {
          try {
            await axios.post(`${process.env.REACT_APP_API_URL}/api/records`, { staffId: user.staffId, type: 'clock-out' });
            if (user.staffId) {
              fetchRecords(user.staffId);
            }
            setError(null);
          } catch (error: any) {
            setError(error.response.data.message);
          }
        } else {
          setError('Mohon aktifkan GPS anda.');
        }
      },
      () => {
        setError('Tidak dapat mengambil lokasi Anda.');
      }
    );
  };

  const handleSort = (column: keyof Attendance) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleWorkTimeSort = (column: keyof WorkTimeRecord) => {
    if (workTimeSortColumn === column) {
      setWorkTimeSortDirection(workTimeSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setWorkTimeSortColumn(column);
      setWorkTimeSortDirection('asc');
    }
  };

  const sortedAttendance = [...attendance]
    .filter((a) => {
      const attendanceDate = new Date(a.date);
      const monthMatch = selectedMonth === -1 || attendanceDate.getMonth() === selectedMonth;
      const yearMatch = selectedYear === -1 || attendanceDate.getFullYear() === selectedYear;

      const searchMatch = 
        (a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.date.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.time.toLowerCase().includes(searchTerm.toLowerCase()));

      return (user.role === 'admin' || (user.role === 'staff' && a.staffId === user.staffId)) && monthMatch && yearMatch && searchMatch;
    })
    .sort((a, b) => {
      if (sortColumn === null) return 0;

      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      return sortDirection === 'asc' ? String(aValue).localeCompare(String(bValue)) : String(bValue).localeCompare(String(aValue));
    });

  const sortedWorkTimeRecords = [...workTimeRecords]
    .filter((r) => {
      const recordDate = new Date(r.date);
      const monthMatch = selectedMonth === -1 || recordDate.getMonth() === selectedMonth;
      const yearMatch = selectedYear === -1 || recordDate.getFullYear() === selectedYear;

      const searchMatch = 
        (r.name.toLowerCase().includes(workTimeSearchTerm.toLowerCase()) ||
        r.date.toLowerCase().includes(workTimeSearchTerm.toLowerCase()) ||
        r.clockInTime.toLowerCase().includes(workTimeSearchTerm.toLowerCase()) ||
        r.clockOutTime.toLowerCase().includes(workTimeSearchTerm.toLowerCase()) ||
        r.totalHours.toLowerCase().includes(workTimeSearchTerm.toLowerCase()));

      return (user.role === 'admin' || (user.role === 'staff' && r.staffId === user.staffId)) && monthMatch && yearMatch && searchMatch;
    })
    .sort((a, b) => {
      if (workTimeSortColumn === null) return 0;

      const aValue = a[workTimeSortColumn];
      const bValue = b[workTimeSortColumn];

      return workTimeSortDirection === 'asc' ? String(aValue).localeCompare(String(bValue)) : String(bValue).localeCompare(String(aValue));
    });

  return (
    <div className="container mt-5">
      <button className="btn btn-danger mb-4" onClick={onLogout}>Logout</button>
      
      <h1 className="mb-4">Aplikasi Absensi Staff dan Guru</h1>

      <div className="row">
        {staff
          .filter((s) => user.role === 'admin' || (user.role === 'staff' && s._id === user.staffId))
          .map((s) => (
            <div key={s._id} className="col-md-4 mb-4">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title">{s.name}</h5>
                </div>
              </div>
            </div>
          ))}
      </div>

      {user.role === 'staff' && (
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title">Laporan Kehadiran Harian</h5>
            <div className="d-flex justify-content-center mb-4">
              <button className="btn btn-success me-2" onClick={() => {
                const currentUser = user as User;
                if (currentUser.staffId) {
                  handleAttendance(currentUser.staffId, currentUser.name, 'Hadir');
                } else {
                  setError('Staff ID is missing for attendance. Please contact support.');
                }
              }}>
                Hadir
              </button>
              <button className="btn btn-warning me-2" onClick={() => {
                const currentUser = user as User;
                if (currentUser.staffId) {
                  handleAttendance(currentUser.staffId, currentUser.name, 'Sakit');
                } else {
                  setError('Staff ID is missing for attendance. Please contact support.');
                }
              }}>
                Sakit
              </button>
              <button className="btn btn-info" onClick={() => {
                const currentUser = user as User;
                if (currentUser.staffId) {
                  handleAttendance(currentUser.staffId, currentUser.name, 'Izin');
                } else {
                  setError('Staff ID is missing for attendance. Please contact support.');
                }
              }}>
                Izin
              </button>
            </div>
          </div>
        </div>
      )}
      {user.role === 'staff' && (
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title">Pencacatan Waktu Kerja Harian</h5>
            <div className="d-flex justify-content-center mb-4">
            <button className="btn btn-primary me-2" onClick={handleClockIn} disabled={clockStatus === 'in'}>Masuk</button>
            <button className="btn btn-danger" onClick={handleClockOut} disabled={clockStatus === 'out'}>Pulang</button>
            </div>
          </div>
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}

      {user.role === 'staff' && (
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title">Aktivitas Kehadiran Hari Ini</h5>
            <ul>
              {attendance
                .filter(a => a.staffId === user.staffId && a.date === new Date().toISOString().split('T')[0])
                .map(att => (
                  <li key={att._id}>
                    Anda tercatat <strong>{att.status}</strong> pada jam {att.time}.
                  </li>
              ))}
              {attendance.filter(a => a.staffId === user.staffId && a.date === new Date().toISOString().split('T')[0]).length === 0 && (
                <li>Belum ada laporan kehadiran untuk hari ini.</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {user.role === 'staff' && (
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title">Aktivitas Masuk/Keluar Jam Kerja Hari Ini</h5>
            <p>Status: Anda sedang {clockStatus === 'in' ? 'bekerja' : 'tidak bekerja'}</p>
            <ul>
              {records.map(record => (
                <li key={record._id}>
                  {record.type === 'clock-in' ? 'Masuk pada' : 'Pulang pada'} {new Date(record.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                </li>
              ))}
              {totalWorkTime && (
                <li>
                  Total waktu kerja: <strong>{totalWorkTime}</strong>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      <h2 className="mt-5">Riwayat Kehadiran</h2>
      <div className="row mb-3">
        <div className="col-md-6">
          <input
            type="text"
            className="form-control"
            placeholder="Cari riwayat kehadiran..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="col-md-4">
          <select className="form-select" value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
            <option value={-1}>Semua Bulan</option>
            {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((month, index) => (
              <option key={index} value={index}>{month}</option>
            ))}
          </select>
        </div>
        <div className="col-md-2">
          <select className="form-select" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
            <option value={-1}>Semua Tahun</option>
            {Array.from(new Set(attendance.map(a => new Date(a.date).getFullYear()))).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                Nama {sortColumn === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                Status {sortColumn === 'status' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>
                Tanggal {sortColumn === 'date' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th onClick={() => handleSort('time')} style={{ cursor: 'pointer' }}>
                Waktu {sortColumn === 'time' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedAttendance.map((a) => (
              <tr key={a._id}>
                <td>{a.name}</td>
                <td>{a.status}</td>
                <td>{a.date}</td>
                <td>{a.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-5">Riwayat Waktu Kerja</h2>
      <div className="row mb-3">
        <div className="col-md-6">
          <input
            type="text"
            className="form-control"
            placeholder="Cari riwayat waktu kerja..."
            value={workTimeSearchTerm}
            onChange={(e) => setWorkTimeSearchTerm(e.target.value)}
          />
        </div>
        <div className="col-md-4">
          <select className="form-select" value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
            <option value={-1}>Semua Bulan</option>
            {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((month, index) => (
              <option key={index} value={index}>{month}</option>
            ))}
          </select>
        </div>
        <div className="col-md-2">
          <select className="form-select" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
            <option value={-1}>Semua Tahun</option>
            {Array.from(new Set(attendance.map(a => new Date(a.date).getFullYear()))).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th onClick={() => handleWorkTimeSort('name')} style={{ cursor: 'pointer' }}>
                Nama {workTimeSortColumn === 'name' && (workTimeSortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th onClick={() => handleWorkTimeSort('date')} style={{ cursor: 'pointer' }}>
                Tanggal {workTimeSortColumn === 'date' && (workTimeSortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th onClick={() => handleWorkTimeSort('clockInTime')} style={{ cursor: 'pointer' }}>
                Jam Masuk {workTimeSortColumn === 'clockInTime' && (workTimeSortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th onClick={() => handleWorkTimeSort('clockOutTime')} style={{ cursor: 'pointer' }}>
                Jam Pulang {workTimeSortColumn === 'clockOutTime' && (workTimeSortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th onClick={() => handleWorkTimeSort('totalHours')} style={{ cursor: 'pointer' }}>
                Total Jam Kerja {workTimeSortColumn === 'totalHours' && (workTimeSortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th onClick={() => handleWorkTimeSort('keterangan')} style={{ cursor: 'pointer' }}>
                Keterangan {workTimeSortColumn === 'keterangan' && (workTimeSortDirection === 'asc' ? '▲' : '▼')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedWorkTimeRecords.map((record) => (
              <tr key={record._id}>
                <td>{record.name}</td>
                <td>{record.date}</td>
                <td>{record.clockInTime}</td>
                <td>{record.clockOutTime}</td>
                <td>{record.totalHours}</td>
                <td>{record.keterangan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MainApp;
