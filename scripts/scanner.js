// scripts/scanner.js
import { supabase } from './supabase-config.js';

// DOM Elements
const scannerContent = document.getElementById('scanner-content');
const authLoading = document.getElementById('auth-loading');
const scanResultCard = document.getElementById('scan-result-card');
const resultIcon = document.getElementById('result-icon');
const resultTitle = document.getElementById('result-title');
const resultMessage = document.getElementById('result-message');
const participantDetails = document.getElementById('participant-details');
const resName = document.getElementById('res-name');
const resId = document.getElementById('res-id');
const resCollege = document.getElementById('res-college');
const continueScanBtn = document.getElementById('continue-scan-btn');

let html5QrcodeScanner = null;
let isProcessing = false;

// Check Authentication (LocalStorage)
const isAuthenticated = localStorage.getItem('dart_admin_auth') === 'true';

if (isAuthenticated) {
    authLoading.style.display = 'none';
    scannerContent.style.display = 'flex';
    initScanner();
} else {
    window.location.href = 'login.html';
}

function initScanner() {
    scanResultCard.style.display = 'block';
    resetResultUI();

    html5QrcodeScanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
    );
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

const CHECK_ICON = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
const X_ICON = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
const ALERT_ICON = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

function resetResultUI() {
    resultIcon.className = 'result-icon';
    resultIcon.innerHTML = '';
    resultTitle.textContent = 'Scanning...';
    resultMessage.textContent = 'Point your camera at a QR code';
    participantDetails.style.display = 'none';
    continueScanBtn.style.display = 'none';
}

async function onScanSuccess(decodedText, decodedResult) {
    // Prevent multiple rapid scans
    if (isProcessing) return;
    isProcessing = true;

    // Temporarily pause scanner UI
    document.getElementById('reader').style.opacity = '0.5';

    showToast(`Scanned QR: ${decodedText}`, 'success');

    try {
        await processQRData(decodedText);
    } catch (error) {
        console.error(error);
        showErrorState("Scan failed or invalid QR pattern.");
    }
}

function onScanFailure(error) {
    // Ignore routine scan failures (when no QR is visible in frame)
}

async function processQRData(participantID) {
    // 1. Look up in Supabase
    const { data, error } = await supabase
        .from('participant')
        .select('*')
        .eq('participant_id', participantID)
        .single(); // Use single since participant_id is primary key

    if (error || !data) {
        console.error("Supabase Error or not found:", error);
        showErrorState("Participant not found. Invalid Ticket.");
        return;
    }

    const participantData = data;

    // Display basic info
    resName.textContent = participantData.name;
    resId.textContent = participantData.participant_id;
    resCollege.textContent = participantData.college;
    participantDetails.style.display = 'grid';

    // 2. Check attendance
    if (participantData.attendance === true) {
        // Already checked in
        resultIcon.className = 'result-icon result-warning';
        resultIcon.innerHTML = ALERT_ICON;
        resultTitle.textContent = 'Already Checked In';
        resultMessage.textContent = 'This participant has already been marked present.';
    } else {
        // 3. Update attendance = true and set check_in_time
        const { error: updateError } = await supabase
            .from('participant')
            .update({
                attendance: true,
                check_in_time: new Date().toISOString()
            })
            .eq('participant_id', participantID);

        if (updateError) {
            console.error("Error updating attendance:", updateError);
            showErrorState("Failed to update attendance in database. Try again.");
            return;
        }

        resultIcon.className = 'result-icon result-success';
        resultIcon.innerHTML = CHECK_ICON;
        resultTitle.textContent = 'Success!';
        resultMessage.textContent = 'Attendance marked successfully.';
    }

    continueScanBtn.style.display = 'inline-flex';
}

function showErrorState(message) {
    resultIcon.className = 'result-icon result-error';
    resultIcon.innerHTML = X_ICON;
    resultTitle.textContent = 'Invalid Scan';
    resultMessage.textContent = message;
    participantDetails.style.display = 'none';
    continueScanBtn.style.display = 'inline-flex';
}

// Reset and continue scanning
continueScanBtn.addEventListener('click', () => {
    isProcessing = false;
    document.getElementById('reader').style.opacity = '1';
    resetResultUI();
});

// Toast Helper
function showToast(message, type = 'error') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    toastMsg.textContent = message;
    toast.className = `toast toast-${type} show`;
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}
