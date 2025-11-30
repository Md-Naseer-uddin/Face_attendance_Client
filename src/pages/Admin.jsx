import React, { useState, useEffect } from 'react';

function Admin() {
  const [people, setPeople] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [activeTab, setActiveTab] = useState('people');
  const [exportFilter, setExportFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  console.log('API URL:', import.meta.env.VITE_API_URL);
  const fetchData = async () => {
    try {
      if (activeTab === 'people') {
        const res = await fetch(import.meta.env.VITE_API_URL+'/api/people');
        const data = await res.json();
        setPeople(data);
      } else {
        const res = await fetch(import.meta.env.VITE_API_URL+'/api/attendance');
        const data = await res.json();
        setAttendance(data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const handleExport = async () => {
    try {
      let url = import.meta.env.VITE_API_URL+'/export-attendance?';
      
      if (exportFilter === 'day') {
        const today = new Date().toISOString().split('T')[0];
        url += `startDate=${today}&endDate=${today}`;
      } else if (exportFilter === 'month') {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        url += `startDate=${firstDay}&endDate=${lastDay}`;
      } else if (exportFilter === 'custom') {
        if (!startDate || !endDate) {
          alert('Please select both start and end dates');
          return;
        }
        url += `startDate=${startDate}&endDate=${endDate}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.length === 0) {
        alert('No attendance records found for the selected period');
        return;
      }

      // Convert to CSV
      const csv = convertToCSV(data);
      
      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `attendance_${exportFilter}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Error exporting data:', err);
      alert('Failed to export data');
    }
  };

  const convertToCSV = (data) => {
    const headers = ['ID', 'User ID', 'Name', 'Date', 'Time'];
    
    // Helper function to escape CSV values
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      // Wrap in quotes if contains comma, quote, or newline
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };
    
    const rows = data.map(record => {
      const date = new Date(record.created_at);
      
      // Format date with leading apostrophe to force text format in Excel
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `'${year}-${month}-${day}`; // Leading apostrophe forces text format
      
      // Format time as readable string with proper padding
      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      hours = String(hours).padStart(2, ' '); // Pad with space for alignment
      const timeStr = `'${hours}:${minutes}:${seconds} ${ampm}`; // Leading apostrophe for text format
      
      return [
        escapeCSV(record.id),
        escapeCSV(record.user_id),
        escapeCSV(record.matched_name || 'Unknown'),
        escapeCSV(dateStr),
        escapeCSV(timeStr)
      ];
    });

    // Add BOM for proper Excel UTF-8 encoding
    const BOM = '\uFEFF';
    const csvContent = BOM + [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  };

  return (
    <div className="page">
      <div className="card">
        <h2>Admin Dashboard</h2>
        
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'people' ? 'active' : ''}`}
            onClick={() => setActiveTab('people')}
          >
            Registered People ({people.length})
          </button>
          <button 
            className={`tab ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            Attendance Logs ({attendance.length})
          </button>
        </div>

        {activeTab === 'people' ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>User ID</th>
                  <th>Name</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {people.map(person => (
                  <tr key={person.id}>
                    <td>{person.id}</td>
                    <td>{person.user_id}</td>
                    <td>{person.name}</td>
                    <td>{new Date(person.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            {/* Export Section - Moved to Top */}
            <div className="export-section">
              <h3>Export Attendance</h3>
              
              <div className="export-filters">
                <div className="form-group">
                  <label htmlFor="exportFilter">Filter By</label>
                  <select
                    id="exportFilter"
                    value={exportFilter}
                    onChange={(e) => setExportFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="all">All Records</option>
                    <option value="day">Today</option>
                    <option value="month">This Month</option>
                    <option value="custom">Custom Date Range</option>
                  </select>
                </div>

                {exportFilter === 'custom' && (
                  <>
                    <div className="form-group">
                      <label htmlFor="startDate">Start Date</label>
                      <input
                        type="date"
                        id="startDate"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="endDate">End Date</label>
                      <input
                        type="date"
                        id="endDate"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>

              <button 
                onClick={handleExport}
                className="btn btn-secondary"
              >
                📥 Export to CSV
              </button>
            </div>

            {/* Attendance Table */}
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>User ID</th>
                    <th>Name</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map(record => (
                    <tr key={record.id}>
                      <td>{record.id}</td>
                      <td>{record.user_id}</td>
                      <td>{record.matched_name || 'Unknown'}</td>
                      <td>{new Date(record.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Admin;