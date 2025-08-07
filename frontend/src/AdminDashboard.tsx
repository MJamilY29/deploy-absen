import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';

interface ClockInOutRecord {
  _id: string; // Changed from id: number
  staffId: string;
  timestamp: string;
  type: 'clock-in' | 'clock-out';
}

interface WorkTimeRecord {
  _id: string; // Kept as string
  staffId: string;
  name: string;
  date: string;
  clockInTime: string;
  clockOutTime: string;
  totalHours: string;
  keterangan: string;
}

interface AttendanceRecord {
  _id: string; // Changed from id: number
  staffId: string;
  name: string;
  status: string;
  date: string;
  time: string;
}

interface Staff {
  _id: string; // Changed from id: number
  name: string;
}

interface AdminDashboardProps {
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [clockInOutRecords, setClockInOutRecords] = useState<ClockInOutRecord[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [clockInOutSortColumn, setClockInOutSortColumn] = useState<keyof ClockInOutRecord | null>(null);
  const [clockInOutSortDirection, setClockInOutSortDirection] = useState<'asc' | 'desc'>('asc');
  const [clockInOutSearchTerm, setClockInOutSearchTerm] = useState<string>('');

  const [attendanceSortColumn, setAttendanceSortColumn] = useState<keyof AttendanceRecord | null>(null);
  const [attendanceSortDirection, setAttendanceSortDirection] = useState<'asc' | 'desc'>('asc');
  const [attendanceSearchTerm, setAttendanceSearchTerm] = useState<string>('');

  const [workTimeRecords, setWorkTimeRecords] = useState<WorkTimeRecord[]>([]);
  const [workTimeSortColumn, setWorkTimeSortColumn] = useState<keyof WorkTimeRecord | null>(null);
  const [workTimeSortDirection, setWorkTimeSortDirection] = useState<'asc' | 'desc'>('asc');
  const [workTimeSearchTerm, setWorkTimeSearchTerm] = useState<string>('');
  const [selectedMonth, setselectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentRecord, setCurrentRecord] = useState<AttendanceRecord | null>(null);
  const [formData, setFormData] = useState({
    staffId: '',
    name: '',
    status: 'Hadir',
    date: '',
    time: '',
  });

  const [isWorkTimeModalOpen, setIsWorkTimeModalOpen] = useState(false);
  const [workTimeModalMode, setWorkTimeModalMode] = useState<'add' | 'edit'>('add');
  const [currentWorkTimeRecord, setCurrentWorkTimeRecord] = useState<WorkTimeRecord | null>(null);
  const [workTimeFormData, setWorkTimeFormData] = useState({
    staffId: '',
    name: '',
    date: '',
    clockInTime: '',
    clockOutTime: '',
  });

  const handleExport = () => {
    const staffIdParam = selectedStaffId ? `staffId=${selectedStaffId}` : '';
    const monthParam = selectedMonth !== -1 ? `month=${selectedMonth + 1}` : ''; // Months are 1-indexed in backend
    const yearParam = selectedYear !== -1 ? `year=${selectedYear}` : '';

    const params = [staffIdParam, monthParam, yearParam].filter(Boolean).join('&');
    const url = `process.env.REACT_APP_API_URL/api/export-excel${params ? `?${params}` : ''}`;
    window.open(url, '_blank');
  };

  const handleOpenModal = (mode: 'add' | 'edit', record: AttendanceRecord | null = null) => {
    setModalMode(mode);
    setCurrentRecord(record);
    if (mode === 'edit' && record) {
      setFormData({
        staffId: record.staffId,
        name: record.name,
        status: record.status,
        date: record.date,
        time: record.time,
      });
    } else {
      setFormData({
        staffId: selectedStaffId || '',
        name: staff.find(s => s._id === selectedStaffId)?.name || '',
        status: 'Hadir',
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toTimeString().slice(0, 8),
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentRecord(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, fromAdmin: true };

    try {
      if (modalMode === 'edit' && currentRecord) {
        await axios.put(`${process.env.REACT_APP_API_URL}/api/attendance/${currentRecord._id}`, payload);
      } else {
        await axios.post(`${process.env.REACT_APP_API_URL}/api/attendance`, payload);
      }
      // Refresh data
      if (selectedStaffId) {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/attendance`);
        const filteredAttendance = response.data.filter((record: AttendanceRecord) => record.staffId === selectedStaffId);
        setAttendanceRecords(filteredAttendance);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        await axios.delete(`${process.env.REACT_APP_API_URL}/api/attendance/${id}`);
        // Refresh data
        if (selectedStaffId) {
          const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/attendance`);
          const filteredAttendance = response.data.filter((record: AttendanceRecord) => record.staffId === selectedStaffId);
          setAttendanceRecords(filteredAttendance);
        }
      } catch (error) {
        console.error('Error deleting record:', error);
      }
    }
  };

  const handleOpenWorkTimeModal = (mode: 'add' | 'edit', record: WorkTimeRecord | null = null) => {
    setWorkTimeModalMode(mode);
    setCurrentWorkTimeRecord(record);
    if (mode === 'edit' && record) {
      setWorkTimeFormData({
        staffId: record.staffId,
        name: record.name,
        date: record.date,
        clockInTime: record.clockInTime,
        clockOutTime: record.clockOutTime,
      });
    } else {
      setWorkTimeFormData({
        staffId: selectedStaffId || '',
        name: staff.find(s => s._id === selectedStaffId)?.name || '',
        date: new Date().toISOString().slice(0, 10),
        clockInTime: '',
        clockOutTime: '',
      });
    }
    setIsWorkTimeModalOpen(true);
  };

  const handleCloseWorkTimeModal = () => {
    setIsWorkTimeModalOpen(false);
    setCurrentWorkTimeRecord(null);
  };

  const handleWorkTimeFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setWorkTimeFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleWorkTimeFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...workTimeFormData };

    try {
      // For both add and edit, we use the same POST endpoint that handles replacement.
      await axios.post(`${process.env.REACT_APP_API_URL}/api/records/admin`, payload);
      
      // Refresh data
      if (selectedStaffId) {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/records/${selectedStaffId}`);
        setClockInOutRecords(response.data);
        processWorkTimeRecords(selectedStaffId, response.data, staff);
      }
      handleCloseWorkTimeModal();
    } catch (error) {
      console.error('Error submitting work time form:', error);
    }
  };

  const handleWorkTimeDelete = async (staffId: string, date: string) => {
    if (window.confirm('Are you sure you want to delete the work time records for this day?')) {
      try {
        await axios.delete(`${process.env.REACT_APP_API_URL}/api/records/admin/${staffId}/${date}`);
        // Refresh data
        if (selectedStaffId) {
          const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/records/${selectedStaffId}`);
          setClockInOutRecords(response.data);
          processWorkTimeRecords(selectedStaffId, response.data, staff);
        }
      } catch (error) {
        console.error('Error deleting work time record:', error);
      }
    }
  };

  const handleLogout = () => {
    onLogout();
  };

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/staff`).then((response) => {
      setStaff(response.data);
    });
  }, []);

  useEffect(() => {
    if (selectedStaffId) {
      axios.get(`${process.env.REACT_APP_API_URL}/api/records/${selectedStaffId}`).then((response) => {
        setClockInOutRecords(response.data);
        processWorkTimeRecords(selectedStaffId, response.data, staff);
      });
      axios.get(`${process.env.REACT_APP_API_URL}/api/attendance`).then((response) => {
        const filteredAttendance = response.data.filter((record: AttendanceRecord) => record.staffId === selectedStaffId);
        setAttendanceRecords(filteredAttendance);
      });
    } else {
      setClockInOutRecords([]);
      setAttendanceRecords([]);
      setWorkTimeRecords([]);
    }
  }, [selectedStaffId, staff]);

  const handleClockInOutSort = (column: keyof ClockInOutRecord) => {
    if (clockInOutSortColumn === column) {
      setClockInOutSortDirection(clockInOutSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setClockInOutSortColumn(column);
      setClockInOutSortDirection('asc');
    }
  };

  const handleAttendanceSort = (column: keyof AttendanceRecord) => {
    if (attendanceSortColumn === column) {
      setAttendanceSortDirection(attendanceSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setAttendanceSortColumn(column);
      setAttendanceSortDirection('asc');
    }
  };

  const processWorkTimeRecords = (staffId: string, records: ClockInOutRecord[], allStaff: Staff[]) => {
    const dailyRecords: { [key: string]: ClockInOutRecord[] } = {};
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
          name: allStaff.find(s => s._id === staffId)?.name || 'Unknown',
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

  const sortedAttendanceRecords = [...attendanceRecords]
    .filter((a) => {
      const recordDate = new Date(a.date);
      const monthMatch = selectedMonth === -1 || recordDate.getMonth() === selectedMonth;
      const yearMatch = selectedYear === -1 || recordDate.getFullYear() === selectedYear;

      const searchMatch =
        a.date.toLowerCase().includes(attendanceSearchTerm.toLowerCase()) ||
        a.status.toLowerCase().includes(attendanceSearchTerm.toLowerCase());

      return monthMatch && yearMatch && searchMatch;
    })
    .sort((a, b) => {
      if (attendanceSortColumn === null) return 0;

      const aValue = a[attendanceSortColumn];
      const bValue = b[attendanceSortColumn];

      return attendanceSortDirection === 'asc' ? String(aValue).localeCompare(String(bValue)) : String(bValue).localeCompare(String(aValue));
    });

  const handleWorkTimeSort = (column: keyof WorkTimeRecord) => {
    if (workTimeSortColumn === column) {
      setWorkTimeSortDirection(workTimeSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setWorkTimeSortColumn(column);
      setWorkTimeSortDirection('asc');
    }
  };

  const sortedWorkTimeRecords = [...workTimeRecords]
    .filter((r) => {
      const recordDate = new Date(r.date);
      const monthMatch = selectedMonth === -1 || recordDate.getMonth() === selectedMonth;
      const yearMatch = selectedYear === -1 || recordDate.getFullYear() === selectedYear;

      const searchMatch =
        r.name.toLowerCase().includes(workTimeSearchTerm.toLowerCase()) ||
        r.date.toLowerCase().includes(workTimeSearchTerm.toLowerCase()) ||
        r.clockInTime.toLowerCase().includes(workTimeSearchTerm.toLowerCase()) ||
        r.clockOutTime.toLowerCase().includes(workTimeSearchTerm.toLowerCase()) ||
        r.totalHours.toLowerCase().includes(workTimeSearchTerm.toLowerCase());

      return monthMatch && yearMatch && searchMatch;
    })
    .sort((a, b) => {
      if (workTimeSortColumn === null) return 0;

      const aValue = a[workTimeSortColumn];
      const bValue = b[workTimeSortColumn];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return workTimeSortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        return workTimeSortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return 0;
    });

  const staffOptions = staff.filter(s => s.name !== 'Administrator').map(s => ({ value: s._id, label: s.name }));

  return (
    <div>
      <button className="btn btn-danger mb-3" onClick={handleLogout}>Logout</button>
      <h1>Admin Dashboard</h1>
      <div className="d-flex align-items-center mb-3">
        <button className="btn btn-success me-2" onClick={handleExport}>Export to Excel</button>
        <select className="form-select me-2" style={{ width: '130px' }} value={selectedMonth} onChange={(e) => setselectedMonth(parseInt(e.target.value))}>
          <option value={-1}>Semua Bulan</option>
          {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((month, index) => (
            <option key={index} value={index}>{month}</option>
          ))}
        </select>
                <select className="form-select" style={{ width: '145px' }} value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
          <option value={-1}>Semua Tahun</option>
          {Array.from(new Set(attendanceRecords.map(a => new Date(a.date).getFullYear()))).map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      <h2 className="mt-5">Riwayat Absensi Staff dan Guru</h2>
      <div className="mb-3">
        <label htmlFor="staff-select" className="form-label">Select Staff:</label>
        <Select
          id="staff-select"
          options={staffOptions}
          value={staffOptions.find(option => option.value === selectedStaffId)}
          onChange={(selectedOption) => setSelectedStaffId(selectedOption ? selectedOption.value : null)}
          isClearable
          isSearchable
          placeholder="-- Select or search for a Staff --"
        />
      </div>

      {selectedStaffId && (
        <>
          <h2 className="mt-5">Riwayat Kehadiran</h2>
          <div className="d-flex justify-content-between align-items-center mb-3 mt-3">
            <input
              type="text"
              className="form-control w-50"
              placeholder="Cari riwayat kehadiran..."
              value={attendanceSearchTerm}
              onChange={(e) => setAttendanceSearchTerm(e.target.value)}
            />
            <select className="form-select" style={{ width: '200px' }} value={selectedMonth} onChange={(e) => setselectedMonth(parseInt(e.target.value))}>
            <option value={-1}>Semua Bulan</option>
            {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((month, index) => (
              <option key={index} value={index}>{month}</option>
            ))}
            </select>
            <select className="form-select" style={{ width: '200px' }} value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
              <option value={-1}>Semua Tahun</option>
              {Array.from(new Set(attendanceRecords.map(a => new Date(a.date).getFullYear()))).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={() => handleOpenModal('add')}>Tambah Catatan Kehadiran</button>
          </div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th onClick={() => handleAttendanceSort('name')} style={{ cursor: 'pointer' }}>
                    Nama {attendanceSortColumn === 'name' && (attendanceSortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th onClick={() => handleAttendanceSort('status')} style={{ cursor: 'pointer' }}>
                    Status {attendanceSortColumn === 'status' && (attendanceSortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th onClick={() => handleAttendanceSort('date')} style={{ cursor: 'pointer' }}>
                    Tanggal {attendanceSortColumn === 'date' && (attendanceSortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th onClick={() => handleAttendanceSort('time')} style={{ cursor: 'pointer' }}>
                    Waktu {attendanceSortColumn === 'time' && (attendanceSortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sortedAttendanceRecords.map((a) => (
                  <tr key={a._id}>
                    <td>{a.name}</td>
                    <td>{a.status}</td>
                    <td>{a.date}</td>
                    <td>{a.time}</td>
                    <td>
                      <button className="btn btn-sm btn-warning me-2" onClick={() => handleOpenModal('edit', a)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(a._id)}>Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mt-5">Riwayat Waktu Kerja</h2>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <input
              type="text"
              className="form-control w-50"
              placeholder="Cari riwayat waktu kerja..."
              value={workTimeSearchTerm}
              onChange={(e) => setWorkTimeSearchTerm(e.target.value)}
            />
            <select className="form-select" style={{ width: '200px' }} value={selectedMonth} onChange={(e) => setselectedMonth(parseInt(e.target.value))}>
            <option value={-1}>Semua Bulan</option>
            {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((month, index) => (
              <option key={index} value={index}>{month}</option>
            ))}
            </select>
            <select className="form-select" style={{ width: '200px' }} value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
              <option value={-1}>Semua Tahun</option>
              {Array.from(new Set(attendanceRecords.map(a => new Date(a.date).getFullYear()))).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={() => handleOpenWorkTimeModal('add')}>Tambah Catatan Waktu Kerja</button>
          </div>
          <div className="table-responsive">
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
                  <th>Aksi</th>
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
                    <td>
                      <button className="btn btn-sm btn-warning me-2" onClick={() => handleOpenWorkTimeModal('edit', record)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleWorkTimeDelete(record.staffId, record.date)}>Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {!selectedStaffId && <p>Please select a staff member to view their attendance records.</p>}

      {isModalOpen && (
        <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{modalMode === 'add' ? 'Tambah Catatan' : 'Edit Catatan'}</h5>
                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleFormSubmit}>
                  <div className="mb-3">
                    <label htmlFor="staffId" className="form-label">Staff</label>
                    <select
                      id="staffId"
                      name="staffId"
                      className="form-select"
                      value={formData.staffId}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="" disabled>Pilih Staff</option>
                      {staff.map(s => (
                        <option key={s._id} value={s._id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="status" className="form-label">Status</label>
                    <select
                      id="status"
                      name="status"
                      className="form-select"
                      value={formData.status}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="Hadir">Hadir</option>
                      <option value="Sakit">Sakit</option>
                      <option value="Izin">Izin</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="date" className="form-label">Tanggal</label>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      className="form-control"
                      value={formData.date}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="time" className="form-label">Waktu</label>
                    <input
                      type="time"
                      id="time"
                      name="time"
                      className="form-control"
                      value={formData.time}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Tutup</button>
                    <button type="submit" className="btn btn-primary">Simpan</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {isWorkTimeModalOpen && (
        <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{workTimeModalMode === 'add' ? 'Tambah Waktu Kerja' : 'Edit Waktu Kerja'}</h5>
                <button type="button" className="btn-close" onClick={handleCloseWorkTimeModal}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleWorkTimeFormSubmit}>
                  <div className="mb-3">
                    <label htmlFor="staffId" className="form-label">Staff</label>
                    <select
                      id="staffId"
                      name="staffId"
                      className="form-select"
                      value={workTimeFormData.staffId}
                      onChange={handleWorkTimeFormChange}
                      required
                    >
                      <option value="" disabled>Pilih Staff</option>
                      {staff.map(s => (
                        <option key={s._id} value={s._id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="date" className="form-label">Tanggal</label>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      className="form-control"
                      value={workTimeFormData.date}
                      onChange={handleWorkTimeFormChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="clockInTime" className="form-label">Jam Masuk</label>
                    <input
                      type="time"
                      id="clockInTime"
                      name="clockInTime"
                      className="form-control"
                      value={workTimeFormData.clockInTime}
                      onChange={handleWorkTimeFormChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="clockOutTime" className="form-label">Jam Pulang</label>
                    <input
                      type="time"
                      id="clockOutTime"
                      name="clockOutTime"
                      className="form-control"
                      value={workTimeFormData.clockOutTime}
                      onChange={handleWorkTimeFormChange}
                    />
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={handleCloseWorkTimeModal}>Tutup</button>
                    <button type="submit" className="btn btn-primary">Simpan</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;