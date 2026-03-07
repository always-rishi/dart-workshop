// scripts/admin.js
import { supabase } from './supabase-config.js';

// Determine which page we are on
const isLoginPage = window.location.pathname.includes('login.html');
const isDashboard = window.location.pathname.includes('dashboard.html');

// State
let participantsData = [];

// ============================================
// AUTHENTICATION LOGIC (LocalStorage)
// ============================================

const checkAuth = () => {
    const isAuthenticated = localStorage.getItem('dart_admin_auth') === 'true';

    if (isAuthenticated) {
        if (isLoginPage) {
            window.location.href = 'dashboard.html';
        } else if (isDashboard) {
            document.getElementById('auth-loading').style.display = 'none';
            document.getElementById('dashboard-content').style.display = 'block';
            initDashboard();
        }
    } else {
        if (!isLoginPage) {
            window.location.href = 'login.html';
        }
    }
};

// Initial Auth Check
checkAuth();

if (isLoginPage) {
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const loginBtn = document.getElementById('login-btn');
    const loginLoader = document.getElementById('login-loader');
    const loginText = document.getElementById('login-text');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        loginBtn.disabled = true;
        loginLoader.style.display = 'block';
        loginText.style.opacity = '0.7';
        loginError.style.display = 'none';

        // Hardcoded Simple Admin Auth
        const ADMIN_EMAIL = 'admin@dart.com';
        const ADMIN_PASSWORD = 'password123';

        // Simulate network delay
        setTimeout(() => {
            if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
                localStorage.setItem('dart_admin_auth', 'true');
                window.location.href = 'dashboard.html';
            } else {
                loginError.style.display = 'block';
                loginBtn.disabled = false;
                loginLoader.style.display = 'none';
                loginText.style.opacity = '1';
            }
        }, 800);
    });
}

// ============================================
// DASHBOARD LOGIC
// ============================================

function initDashboard() {
    // UI Elements
    const statTotal = document.getElementById('stat-total');
    const statAttendees = document.getElementById('stat-attendees');
    const statRemaining = document.getElementById('stat-remaining');
    const searchInput = document.getElementById('search-input');
    const filterAttendance = document.getElementById('filter-attendance');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const logoutBtn = document.getElementById('logout-btn');

    async function fetchParticipants() {
        try {
            const { data, error } = await supabase
                .from('participant')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            participantsData = data || [];
            updateDashboardMetrics();
            renderTable();
        } catch (error) {
            console.error("Error fetching data:", error);
            // Show toast or error empty state if needed
        }
    }

    function updateDashboardMetrics() {
        let checkedInCount = 0;

        participantsData.forEach(p => {
            if (p.attendance) {
                checkedInCount++;
            }
        });

        // Update Stats
        const total = participantsData.length;
        statTotal.textContent = total;
        statAttendees.textContent = checkedInCount;
        statRemaining.textContent = total - checkedInCount;
    }

    // Initial Fetch
    fetchParticipants();

    // Event Listeners for Filtering
    searchInput.addEventListener('input', renderTable);
    filterAttendance.addEventListener('change', renderTable);

    // Export CSV
    exportCsvBtn.addEventListener('click', exportCSV);

    // Logout
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('dart_admin_auth');
        window.location.href = 'login.html';
    });
}

function renderTable() {
    const tbody = document.getElementById('table-body');
    const searchInput = document.getElementById('search-input').value.toLowerCase();
    const filterAttendance = document.getElementById('filter-attendance').value;

    tbody.innerHTML = '';

    let filteredData = participantsData.filter(p => {
        // Search Filter
        const searchMatches =
            (p.name && p.name.toLowerCase().includes(searchInput)) ||
            (p.participant_id && p.participant_id.toLowerCase().includes(searchInput)) ||
            (p.email && p.email.toLowerCase().includes(searchInput));

        // Attendance Filter
        let attendanceMatches = true;
        if (filterAttendance === 'present') attendanceMatches = p.attendance === true;
        if (filterAttendance === 'absent') attendanceMatches = p.attendance === false;

        return searchMatches && attendanceMatches;
    });

    if (filteredData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 32px 0;">No participants found matching criteria.</td></tr>`;
        return;
    }

    filteredData.forEach(p => {
        const tr = document.createElement('tr');

        // Color Indication for Attendance
        const statusClass = p.attendance ? 'status-present' : 'status-absent';
        const statusText = p.attendance ? 'Checked In' : 'Pending';

        const idLink = p.student_id_url ? `<a href="${p.student_id_url}" target="_blank" style="color:var(--accent-primary);">View</a>` : 'N/A';
        const photoLink = p.student_photo_url ? `<a href="${p.student_photo_url}" target="_blank" style="color:var(--accent-primary);">View</a>` : 'N/A';

        const verifiedClass = p.verified ? 'status-present' : 'status-absent';
        const verifiedAction = p.verified ? 'Revoke' : 'Verify';
        const toggleBtnClass = p.verified ? 'btn-outline' : 'btn-primary';

        tr.innerHTML = `
            <td style="font-family: 'Outfit'; font-weight: 600; color: var(--text-secondary);">${p.participant_id || 'N/A'}</td>
            <td style="font-weight: 500;">${p.name || 'N/A'}</td>
            <td style="font-family: monospace;">${p.roll_number || 'N/A'}</td>
            <td>${p.gender || 'N/A'}</td>
            <td>${idLink}</td>
            <td>${photoLink}</td>
            <td style="font-family: monospace; color: var(--accent-secondary);">${p.transaction_id || 'N/A'}</td>
            <td>${p.college || 'N/A'}</td>
            <td>${p.phone || 'N/A'}</td>
            <td>
                <button class="btn ${toggleBtnClass}" style="padding: 4px 8px; font-size: 0.75rem; border-radius: 4px;" onclick="window.toggleVerification('${p.participant_id}', ${p.verified === true})">
                    ${verifiedAction}
                </button>
            </td>
            <td class="${statusClass}">${statusText}</td>
        `;
        tbody.appendChild(tr);
    });
}

function exportCSV() {
    if (participantsData.length === 0) return;

    const headers = ['Participant ID', 'Name', 'Roll Number', 'Gender', 'Student ID URL', 'Photo URL', 'Transaction ID', 'Email', 'Phone', 'College', 'Branch', 'Year', 'Verified', 'Attendance', 'Check In Time', 'Registration Time'];

    const rows = participantsData.map(p => {
        return [
            p.participant_id || '',
            `"${p.name || ''}"`,
            `"${p.roll_number || ''}"`,
            p.gender || '',
            `"${p.student_id_url || ''}"`,
            `"${p.student_photo_url || ''}"`,
            `"${p.transaction_id || ''}"`,
            p.email || '',
            p.phone || '',
            `"${p.college || ''}"`,
            `"${p.branch || ''}"`,
            p.year || '',
            p.verified ? 'Yes' : 'No',
            p.attendance ? 'Checked In' : 'Pending',
            p.check_in_time ? new Date(p.check_in_time).toLocaleString() : '',
            p.created_at ? new Date(p.created_at).toLocaleString() : ''
        ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `DART_Workshop_Attendees_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Global scope expose for the inline onclick handler
window.toggleVerification = async (participantId, currentStatus) => {
    // Force boolean type in case it was passed loosely
    const isCurrentlyVerified = currentStatus === true || currentStatus === 'true';
    const newStatus = !isCurrentlyVerified;

    try {
        const { error } = await supabase
            .from('participant')
            .update({ verified: newStatus })
            .eq('participant_id', participantId);

        if (error) throw error;

        // Find the index and update the local state immediately
        const index = participantsData.findIndex(p => p.participant_id === participantId);
        if (index !== -1) {
            participantsData[index].verified = newStatus;
            renderTable(); // Re-render table with new state
        }

    } catch (err) {
        console.error('Failed to update verification status:', err);
        alert('Failed to update verification status. Check console for details.');
    }
};
